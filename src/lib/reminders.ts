/**
 * Reminder Engine — Stateless Timeline
 *
 * HOW REMINDERS WORK:
 *  1. Admin starts a stage → initStageReminders() fires the FIRST alert immediately.
 *  2. processReminders() is called once per app load (debounced to max 1x per 30 min).
 *     It only fires follow-up alerts, and ONLY if 24h have passed since the last alert.
 *  3. ALL alerts go ONLY to Inbox / Performance Alerts — NEVER to workspace chat.
 *  4. Messages are kept short.
 */

import { Client, Phase, addAlert, getAlerts } from './store';

// Module-level debounce: processReminders only runs its full logic once every 30 minutes.
let _lastProcessedAt = 0;
const PROCESS_DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes

// ─── Called by admin when a stage is STARTED ────────────────────────────────
// This is the ONLY place the first (stage-start) alert fires.
// It fires immediately upon stage start by the admin — no 24h gate for this first alert.
export function initStageReminders(client: Client, phase: Phase): void {
  if (typeof window === 'undefined') return;
  const pendingTasks = (phase.tasks || []).filter(t => !t.completed).map(t => t.title);
  if (pendingTasks.length === 0) return;
  const uniqueAssignees = [...new Set((phase.tasks || []).map(t => t.assignedTo).filter(Boolean))];
  const assignedTo = uniqueAssignees.join(', ') || 'Team';

  // Only fire if stage-start hasn't already been sent for this stage
  const allAlerts = getAlerts();
  const alreadySent = allAlerts.some(a =>
    a.clientId === client.id && a.stageName === phase.name && a.templateKey === 'stage-start'
  );
  if (alreadySent) return;

  fireAlert(client, phase, pendingTasks, assignedTo, 'stage-start', 'info');
}

// Legacy stubs — kept so existing imports don't break
export function updateStageReminderSchedule(client: Client, phase: Phase): void {}
export function clearStageReminders(stageId: string, clientId: string): void {}

// ─── Called once on app load (debounced to 30 min) ──────────────────────────
// Only fires FOLLOW-UP reminders (NOT stage-start). Always requires 24h since last alert.
export function processReminders(clients: Client[]): void {
  if (typeof window === 'undefined') return;

  // Debounce: skip if called again within 30 minutes
  const nowMs = Date.now();
  if (nowMs - _lastProcessedAt < PROCESS_DEBOUNCE_MS) return;
  _lastProcessedAt = nowMs;

  const now = new Date();
  const allAlerts = getAlerts();

  clients.forEach(client => {
    client.phases.forEach(phase => {
      // Only process stages that are actively in-progress
      if (phase.status !== 'in-progress') return;
      const pendingTasks = (phase.tasks || []).filter(t => !t.completed).map(t => t.title);
      if (pendingTasks.length === 0) return;

      const uniqueAssignees = [...new Set((phase.tasks || []).map(t => t.assignedTo).filter(Boolean))];
      const assignedTo = uniqueAssignees.join(', ') || 'Team';

      const sentAlerts = allAlerts.filter(a => a.clientId === client.id && a.stageName === phase.name);
      const sentTemplates = sentAlerts.map(a => a.templateKey);

      // If stage-start hasn't been sent yet, skip — handled by initStageReminders (admin action only)
      if (!sentTemplates.includes('stage-start')) return;

      const lastAlertTime = sentAlerts.length > 0
        ? Math.max(...sentAlerts.map(a => new Date(a.createdAt).getTime()))
        : 0;

      // ── STRICT 24-HOUR GATE ──
      const hoursSinceLastAlert = (now.getTime() - lastAlertTime) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 23.5) return; // Must wait at least 24h before next alert

      const startDate = phase.startedAt ? new Date(phase.startedAt) : null;
      const deadlineDate = phase.timeBound ? new Date(phase.timeBound + 'T23:59:59') : null;

      // ── PRE-DEADLINE: one daily reminder per 24h cycle ──
      if (deadlineDate && now.getTime() < deadlineDate.getTime()) {
        const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline <= 24 && !sentTemplates.includes('deadline-24h')) {
          fireAlert(client, phase, pendingTasks, assignedTo, 'deadline-24h', 'warning');
          return;
        }

        const daysRunning = startDate
          ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const dailyKey = `daily-update-${daysRunning}`;
        if (daysRunning >= 1 && !sentTemplates.includes(dailyKey)) {
          fireAlert(client, phase, pendingTasks, assignedTo, dailyKey, 'warning');
          return;
        }
      }

      // ── POST-DEADLINE: escalating reminders (reminder-1 through reminder-6) ──
      if (deadlineDate && now.getTime() > deadlineDate.getTime()) {
        const durationMs = deadlineDate.getTime() -
          (startDate ? startDate.getTime() : deadlineDate.getTime() - 5 * 24 * 60 * 60 * 1000);
        const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
        const interval = Math.max(1, Math.floor(durationDays / 6));

        const daysOverdue = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const required = Math.min(6, Math.floor((daysOverdue - 1) / interval) + 1);

        for (let i = 1; i <= required; i++) {
          const tKey = `reminder-${i}`;
          if (!sentTemplates.includes(tKey)) {
            let sev: 'warning' | 'urgent' | 'critical' = 'warning';
            if (i === 3 || i === 4) sev = 'urgent';
            if (i >= 5) sev = 'critical';
            fireAlert(client, phase, pendingTasks, assignedTo, tKey, sev);
            return; // Only one reminder per 24h cycle
          }
        }
      }
    });
  });
}

function fireAlert(
  client: Client,
  phase: Phase,
  pendingTasks: string[],
  assignedTo: string,
  templateKey: string,
  severity: 'info' | 'warning' | 'urgent' | 'critical'
) {
  const baseKey = templateKey.startsWith('daily-update') ? 'daily-update' : templateKey;
  const msg = buildMessage(baseKey, client.name, phase.name, pendingTasks.length, assignedTo, phase.timeBound);

  // Only to Inbox / Performance Alerts — NEVER workspace chat
  addAlert({
    clientId: client.id,
    clientName: client.name,
    stageName: phase.name,
    assignedTo,
    pendingTasks,
    timeBound: phase.timeBound,
    severity,
    templateKey: baseKey,
    message: msg,
  });
}

function buildMessage(
  templateKey: string,
  clientName: string,
  stageName: string,
  pendingCount: number,
  assignedTo: string,
  timeBound?: string
): string {
  // Shorten stage name: strip prefix like "Stage 1a — Sadhana/Uzaid: " and "(X Working Days)" suffix
  const shortStage = stageName.replace(/^Stage \w+ — [^:]+:\s*/i, '').split('(')[0].trim();
  const firstName = assignedTo.split('&')[0].split(' ')[0].trim();
  const deadline = timeBound
    ? new Date(timeBound + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'deadline';

  switch (templateKey) {
    case 'stage-start':
      return `📋 Stage Started: ${shortStage} — ${clientName}\n${pendingCount} task(s) pending. Assigned to: ${assignedTo}.`;

    case 'daily-update':
      return `🔔 Daily Reminder — ${clientName}\n${shortStage}: ${pendingCount} task(s) still pending. Complete by ${deadline}.`;

    case 'deadline-24h':
      return `⏰ Deadline Tomorrow — ${clientName}\n${shortStage}: ${pendingCount} task(s) remaining. Deadline: ${deadline}.`;

    case 'reminder-1':
      return `⚠️ REMINDER 1 — ${clientName}\n${firstName}, deadline has passed for "${shortStage}". Complete within 24 hrs.`;

    case 'reminder-2':
      return `⚠️ REMINDER 2 — ${clientName}\n${firstName}, 2nd deadline missed for "${shortStage}". Contact boss immediately.`;

    case 'reminder-3':
      return `🚨 REMINDER 3 — ${clientName}\n${firstName}, 3rd deadline missed for "${shortStage}". Salary deduction may apply. Resolve in 24 hrs.`;

    case 'reminder-4':
      return `🚨 REMINDER 4 — ${clientName}\n₹1,500 deduction noted for ${firstName} — "${shortStage}" still incomplete.`;

    case 'reminder-5':
      return `🚨 REMINDER 5 — ${clientName}\nTeam, assist ${firstName} with "${shortStage}" immediately. Further delay = team deduction.`;

    case 'reminder-6':
      return `🚨 REMINDER 6 — ${clientName}\n₹3,000 deduction recorded for ${assignedTo} — "${shortStage}" not resolved.`;

    default:
      return `🔔 ${clientName} — ${shortStage}: ${pendingCount} task(s) pending. Assigned to: ${assignedTo}.`;
  }
}
