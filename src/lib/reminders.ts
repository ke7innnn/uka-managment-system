/**
 * Reminder Engine — Stateless Timeline
 *
 * This engine calculates required reminders on the fly by comparing 
 * phase startedAt / timeBound against the current time, and checks 
 * if the calculated alert template was already sent.
 *
 * IMPORTANT — Anti-spam rules:
 *  1. ALL alerts (including stage-start) require at least 24 hours since the
 *     last alert for the same client+stage before a new one can fire.
 *  2. processReminders() is debounced at module level — no matter how many times
 *     reload() or the sync interval calls it, the actual check only runs once
 *     every 30 minutes. This prevents 1h/2h/4h spam from frequent page actions.
 *  3. Reminders ONLY go to Inbox / Performance Alerts — NEVER to workspace chat.
 */

import { Client, Phase, addAlert, getAlerts } from './store';

// Module-level debounce: track the last time we actually ran the logic.
let _lastProcessedAt = 0;
const PROCESS_DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes minimum between runs

// We no longer use local storage schedules. Legacy functions are kept as empty stubs so they don't break imports.
export function initStageReminders(client: Client, phase: Phase): void {}
export function updateStageReminderSchedule(client: Client, phase: Phase): void {}
export function clearStageReminders(stageId: string, clientId: string): void {}

/**
 * Call this on every page load or via global setInterval. 
 * Checks for due reminders statelessly and fires them.
 */
export function processReminders(clients: Client[]): void {
  if (typeof window === 'undefined') return;

  // ── MODULE-LEVEL DEBOUNCE ──────────────────────────────────────────────────
  // No matter how many times reload() or setInterval calls this function,
  // only actually run the check logic once every 30 minutes maximum.
  const nowMs = Date.now();
  if (nowMs - _lastProcessedAt < PROCESS_DEBOUNCE_MS) return;
  _lastProcessedAt = nowMs;
  // ──────────────────────────────────────────────────────────────────────────

  const now = new Date();
  const allAlerts = getAlerts();

  clients.forEach(client => {
    client.phases.forEach(phase => {
      // Only process in-progress stages with pending tasks
      if (phase.status !== 'in-progress') return;
      const pendingTasks = (phase.tasks || []).filter(t => !t.completed).map(t => t.title);
      if (pendingTasks.length === 0) return;

      const uniqueAssignees = [...new Set((phase.tasks || []).map(t => t.assignedTo).filter(Boolean))];
      const assignedTo = uniqueAssignees.join(', ') || 'Team';

      // Find all alerts already sent for this specific client and stage
      const sentAlerts = allAlerts.filter(a => a.clientId === client.id && a.stageName === phase.name);
      const sentTemplates = sentAlerts.map(a => a.templateKey);
      const lastAlertTime = sentAlerts.length > 0 
        ? Math.max(...sentAlerts.map(a => new Date(a.createdAt).getTime()))
        : 0;

      // ── STRICT 24-HOUR GATE — applies to ALL templates including stage-start ──
      // No alert of any kind fires unless at least 23.5 hours have passed since
      // the last alert for this client+stage (or it is the very first ever alert).
      const hoursSinceLastAlert = (now.getTime() - lastAlertTime) / (1000 * 60 * 60);
      const canSendAlert = lastAlertTime === 0 || hoursSinceLastAlert >= 23.5;

      if (!canSendAlert) return; // Always wait 24h before ANY alert

      const startDate = phase.startedAt ? new Date(phase.startedAt) : null;
      const deadlineDate = phase.timeBound ? new Date(phase.timeBound + 'T23:59:59') : null;

      // ── 1. STAGE START ──
      if (!sentTemplates.includes('stage-start') && startDate) {
        fireAlert(client, phase, pendingTasks, assignedTo, 'stage-start', 'info');
        // Do not process any other alerts for this stage right now
        return;
      }

      if (!canSendAlert) return; // Redundant safety guard

      // ── 2. PRE-DEADLINE 24H WARNING ──
      if (deadlineDate && now.getTime() < deadlineDate.getTime()) {
        const msUntilDeadline = deadlineDate.getTime() - now.getTime();
        const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);

        if (hoursUntilDeadline <= 24 && !sentTemplates.includes('deadline-24h')) {
          fireAlert(client, phase, pendingTasks, assignedTo, 'deadline-24h', 'warning');
          return;
        }

        // Daily pre-deadline checks (Day 1, 2, 3)
        if (startDate) {
          const daysRunning = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysRunning === 1 && !sentTemplates.includes('day-1-light')) {
            fireAlert(client, phase, pendingTasks, assignedTo, 'day-1-light', 'info');
            return;
          } else if (daysRunning === 2 && !sentTemplates.includes('day-2-moderate')) {
            fireAlert(client, phase, pendingTasks, assignedTo, 'day-2-moderate', 'warning');
            return;
          } else if (daysRunning >= 3 && !sentTemplates.includes('day-3-warning')) {
            // After day 3, just send daily updates
            const dailyKey = `daily-update-${daysRunning}`;
            if (!sentTemplates.includes(dailyKey)) {
              fireAlert(client, phase, pendingTasks, assignedTo, dailyKey, 'warning');
              return;
            }
          }
        }
      }

      // ── 3. POST-DEADLINE ESCALATING REMINDERS ──
      if (deadlineDate && now.getTime() > deadlineDate.getTime()) {
        const durationInMs = deadlineDate.getTime() - (startDate ? startDate.getTime() : (deadlineDate.getTime() - 5*24*60*60*1000));
        const durationInDays = Math.max(1, Math.round(durationInMs / (1000 * 60 * 60 * 24)));
        const interval = Math.max(1, Math.floor(durationInDays / 6)); // Escalate every `interval` days
        
        const daysOverdue = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const requiredReminderIndex = Math.min(6, Math.floor((daysOverdue - 1) / interval) + 1);

        // Find the highest reminder we haven't sent yet, up to the required one
        for (let i = 1; i <= requiredReminderIndex; i++) {
          const tKey = `reminder-${i}`;
          if (!sentTemplates.includes(tKey)) {
            let severity: 'warning' | 'urgent' | 'critical' = 'warning';
            if (i === 3 || i === 4) severity = 'urgent';
            if (i >= 5) severity = 'critical';

            fireAlert(client, phase, pendingTasks, assignedTo, tKey, severity);
            return; // Only fire one, and wait 24h for the next loop
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
  // Use the base template key for building the message (e.g. daily-update-4 -> daily-update)
  const baseKey = templateKey.startsWith('daily-update') ? 'daily-update' : templateKey;
  const msg = buildMessage(baseKey, client.name, phase.name, pendingTasks.length, pendingTasks.slice(0, 5), assignedTo, phase.timeBound);

  // ONLY add to alerts (Inbox / Performance Alerts). Do not spam the workspace chat.
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

// ── Template Messages ──────────────────────────────────────────────────────────

function buildMessage(
  templateKey: string,
  clientName: string,
  stageName: string,
  pendingCount: number,
  sampleTasks: string[],
  assignedTo: string,
  timeBound?: string
): string {
  const taskList = sampleTasks.length > 0
    ? `\nTasks: ${sampleTasks.join(', ')}${pendingCount > sampleTasks.length ? '...' : ''}`
    : '';

  // Extract first name for a direct, WhatsApp feel like @UZAID
  const primaryName = assignedTo.split('&')[0].split(' ')[0].trim().toUpperCase();

  switch (templateKey) {
    case 'stage-start':
    case 'day-1-light':
    case 'day-2-moderate':
    case 'day-3-warning':
    case 'daily-update':
    case 'deadline-24h':
      // The user requested ALL pre-deadline messages to be extremely short.
      return `Hey ${assignedTo}, ${stageName} is incomplete. Please complete before deadline.${taskList}`;

    // ── POST-DEADLINE ESCALATING REMINDERS (KEPT EXACTLY AS USER'S TEMPLATES) ──
    case 'reminder-1':
      return `⚠️ REMINDER 1 (MILD)\n\nDEAR ${assignedTo.toUpperCase()},\nTHE DEADLINE WHICH YOU HAVE COMMITTED TO YOUR BOSS HAS CROSSED. PLEASE EXPEDITE THE WORK AND COMPLETE THE DEADLINE WITHIN THE NEXT 24 HOURS.\n\nProject: ${clientName} — ${stageName}${taskList}`;

    case 'reminder-2':
      return `⚠️ REMINDER 2\n\nDEAR ${assignedTo.toUpperCase()},\nTHIS IS THE SECOND REMINDER FOR THE PENDING WORK !!! THE SECOND DEADLINE GIVEN BY YOU HAS ALSO LAPSED.. CONNECT WITH BOSS IMMEDIATELY.. PUT YOUR CLARIFICATIONS FOR THE SAME!! YOUR DEADLINE SHALL BE ONLY EXTENDED TO THE NEXT 24 HOURS.\n\nProject: ${clientName} — ${stageName}${taskList}`;

    case 'reminder-3':
      return `🚨 REMINDER 3\n\n@${primaryName} THIS IS EXTREME UNPROFESSIONAL BEHAVIOUR... SHALL BE REPORTED TO BOSS.. PUT UP YOUR CLARIFICATIONS REGARDING THE PROJECT IMMEDIATELY... THE THIRD DEADLINE WHEN CROSSED SHALL LEAD TO DEDUCTIONS IN SALARY OF YOU AND YOUR TEAM AS DECIDED BY BOSS... RESOLVE THE PROBLEM IN THE NEXT 24 HOURS AND PASS ON THE PROJECT FURTHER IMMEDIATELY.\n\nProject: ${clientName} — ${stageName}${taskList}`;

    case 'reminder-4':
      return `🚨 REMINDER 4\n\n@${primaryName} AMOUNT OF ₹1,500 SHALL BE DEDUCTED TILL DATE FOR NON PERFORMANCE AND FAILURE TO FOLLOW DEADLINE AS INSTRUCTED BY BOSS FOR PROJECT: ${clientName.toUpperCase()}.\n\nStage: ${stageName}${taskList}`;

    case 'reminder-5':
      return `🚨 REMINDER 5\n\nDEAR TEAM, PLS HELP ${primaryName} TO RESOLVE HIS PROBLEM WITHIN THE DEADLINE... FAILING WHICH SIMILAR DEDUCTION SHALL BE APPLICABLE FROM YOUR SALARY TOO.. BOSS IS DISAPPOINTED.\n\nProject: ${clientName} — ${stageName}${taskList}`;

    case 'reminder-6':
      return `🚨 REMINDER 6\n\nAMOUNT OF ₹3,000 TILL DATE SHALL BE DEDUCTED FROM THE SALARIES OF THE FOLLOWING STAFF FOR NOT RESOLVING THE PROBLEMS AND NOT PROVIDING CLARIFICATIONS FOR THE DELAY: ${assignedTo.toUpperCase()}.\n\nProject: ${clientName} — ${stageName}${taskList}`;

    default:
      return `Hey ${assignedTo}, ${stageName} is incomplete. Please complete before deadline.`;
  }
}
