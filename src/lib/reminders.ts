/**
 * Reminder Engine — 6 Escalating Templates
 * Fires when a stage is started, then every 24h until the stage is complete.
 *
 * Template Order:
 *  1. stage-start       — Immediate on stage start (info)
 *  2. day-1-light       — +24h (info)
 *  3. day-2-moderate    — +48h (warning)
 *  4. day-3-warning     — +72h (urgent)
 *  5. deadline-breach   — After deadline date (urgent)
 *  6. repeat-harsh      — Every 24h after deadline (critical)
 */

import { Client, Phase, addAlert, addWorkspaceMessage, getAlerts, saveAlerts } from './store';

export interface ReminderSchedule {
  stageId: string;
  clientId: string;
  startedAt: string;  // ISO
  lastFiredAt?: string; // ISO of last reminder sent
  nextFireAt: string; // ISO of when next reminder should fire
  templateIndex: number; // 0-5 (maps to template order)
}

const REMINDERS_KEY = 'uka_reminder_schedules';

function getSchedules(): ReminderSchedule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSchedules(schedules: ReminderSchedule[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(schedules));
}

/**
 * Call this when admin clicks "Start Stage".
 * Creates a reminder schedule and fires the immediate stage-start alert.
 */
export function initStageReminders(client: Client, phase: Phase): void {
  const pendingTasks = (phase.tasks || []).filter(t => !t.completed).map(t => t.title);
  const uniqueAssignees = [...new Set((phase.tasks || []).map(t => t.assignedTo).filter(Boolean))];
  const assignedTo = uniqueAssignees.join(', ') || 'Team';

  // Fire immediate stage-start alert (Template 1)
  const msg = buildMessage('stage-start', client.name, phase.name, pendingTasks.length, pendingTasks.slice(0, 5), assignedTo, phase.timeBound);
  addAlert({
    clientId: client.id,
    clientName: client.name,
    stageName: phase.name,
    assignedTo,
    pendingTasks,
    timeBound: phase.timeBound,
    severity: 'info',
    templateKey: 'stage-start',
    message: msg
  });

  // Post to workspace chat
  addWorkspaceMessage(
    'system',
    '🤖 System',
    'Automated',
    `🚀 Stage Started: "${phase.name}" for client ${client.name}.\n📋 ${pendingTasks.length} task(s) assigned to: ${assignedTo}.\n${phase.timeBound ? `⏰ Deadline: Before ${new Date(phase.timeBound + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
  );

  // Schedule next reminder in 24h
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const schedules = getSchedules().filter(s => !(s.stageId === phase.id && s.clientId === client.id));
  schedules.push({
    stageId: phase.id,
    clientId: client.id,
    startedAt: phase.startedAt || now.toISOString(),
    lastFiredAt: now.toISOString(),
    nextFireAt: next.toISOString(),
    templateIndex: 1 // next is day-1-light
  });
  saveSchedules(schedules);
}

/**
 * Call this on every page load. Checks for due reminders and fires them.
 */
export function processReminders(clients: Client[]): void {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const schedules = getSchedules();
  let changed = false;

  schedules.forEach(schedule => {
    if (new Date(schedule.nextFireAt) > now) return; // not due yet

    const client = clients.find(c => c.id === schedule.clientId);
    if (!client) return;
    const phase = client.phases.find(p => p.id === schedule.stageId);
    if (!phase) return;
    if (phase.status === 'completed') {
      // Remove schedule — stage is done
      schedule.templateIndex = 999; // mark for removal
      changed = true;
      return;
    }

    const pendingTasks = (phase.tasks || []).filter(t => !t.completed).map(t => t.title);
    if (pendingTasks.length === 0) return;

    const uniqueAssignees = [...new Set((phase.tasks || []).map(t => t.assignedTo).filter(Boolean))];
    const assignedTo = uniqueAssignees.join(', ') || 'Team';

    // Determine template
    const hoursElapsed = (now.getTime() - new Date(schedule.startedAt).getTime()) / (1000 * 60 * 60);
    const deadlinePassed = phase.timeBound ? now > new Date(phase.timeBound + 'T23:59:59') : false;

    let templateKey: string;
    let severity: 'info' | 'warning' | 'urgent' | 'critical';

    if (deadlinePassed) {
      const deadlineDate = new Date(phase.timeBound + 'T23:59:59');
      const msOverdue = now.getTime() - deadlineDate.getTime();
      const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24)) + 1;

      if (daysOverdue === 1) {
        templateKey = 'reminder-1';
        severity = 'warning';
      } else if (daysOverdue === 2) {
        templateKey = 'reminder-2';
        severity = 'warning';
      } else if (daysOverdue === 3) {
        templateKey = 'reminder-3';
        severity = 'urgent';
      } else if (daysOverdue === 4) {
        templateKey = 'reminder-4';
        severity = 'urgent';
      } else if (daysOverdue === 5) {
        templateKey = 'reminder-5';
        severity = 'critical';
      } else {
        templateKey = 'reminder-6';
        severity = 'critical';
      }
    } else if (hoursElapsed >= 72) {
      templateKey = 'day-3-warning';
      severity = 'urgent';
    } else if (hoursElapsed >= 48) {
      templateKey = 'day-2-moderate';
      severity = 'warning';
    } else if (hoursElapsed >= 24) {
      templateKey = 'day-1-light';
      severity = 'info';
    } else {
      templateKey = 'stage-start';
      severity = 'info';
    }

    const msg = buildMessage(templateKey, client.name, phase.name, pendingTasks.length, pendingTasks.slice(0, 5), assignedTo, phase.timeBound);

    addAlert({
      clientId: client.id,
      clientName: client.name,
      stageName: phase.name,
      assignedTo,
      pendingTasks,
      timeBound: phase.timeBound,
      severity,
      templateKey,
      message: msg
    });

    // Post workspace message for warnings and above
    if (severity !== 'info') {
      const emoji = severity === 'critical' ? '🚨' : severity === 'urgent' ? '🔴' : '⚠️';
      addWorkspaceMessage(
        'system',
        '🤖 System',
        'Automated',
        `${emoji} Reminder: ${pendingTasks.length} task(s) still pending in "${phase.name}" for ${client.name}.\nAssigned to: ${assignedTo}.`
      );
    }

    // Schedule next check in 24h
    schedule.lastFiredAt = now.toISOString();
    schedule.nextFireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    schedule.templateIndex = Math.min(schedule.templateIndex + 1, 5);
    changed = true;
  });

  if (changed) {
    const cleaned = schedules.filter(s => s.templateIndex !== 999);
    saveSchedules(cleaned);
  }
}

/**
 * Remove reminder schedule when a stage is marked complete.
 */
export function clearStageReminders(stageId: string, clientId: string): void {
  const schedules = getSchedules().filter(s => !(s.stageId === stageId && s.clientId === clientId));
  saveSchedules(schedules);
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
  const deadlineStr = timeBound
    ? `Deadline: Before ${new Date(timeBound + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
    : '';
  const taskList = sampleTasks.length > 0
    ? `Tasks pending:\n${sampleTasks.map(t => `  • ${t}`).join('\n')}${pendingCount > sampleTasks.length ? `\n  ...and ${pendingCount - sampleTasks.length} more` : ''}`
    : '';

  // Extract first name for a direct, WhatsApp feel like @UZAID
  const primaryName = assignedTo.split('&')[0].split(' ')[0].trim().toUpperCase();

  switch (templateKey) {
    case 'stage-start':
      return `✅ ${stageName} has been started for client ${clientName}.\n\nAssigned to: ${assignedTo}.\n${deadlineStr}\n\n${taskList}\n\nPlease begin your assigned tasks immediately and update progress regularly.`;

    case 'day-1-light':
      return `👋 Friendly Reminder — Day 1\n\n${stageName} for ${clientName} is underway. You have ${pendingCount} task(s) remaining.\n\n${taskList}\n\n${deadlineStr}\n\nKeep up the good progress!`;

    case 'day-2-moderate':
      return `📌 Progress Update — Day 2\n\n${stageName} for ${clientName}: ${pendingCount} task(s) are still pending.\n\n${taskList}\n\n${deadlineStr}\n\nPlease ensure tasks are progressing and flag any blockers in the workspace chat.`;

    case 'day-3-warning':
      return `⚠️ Attention Required — Day 3\n\n${stageName} for ${clientName} has ${pendingCount} incomplete task(s) after 3 days. The admin team has been notified.\n\n${taskList}\n\n${deadlineStr}\n\nIf you are facing any difficulties, please communicate immediately on the workspace chat. Delays at this stage affect the entire project pipeline.`;

    // ── NEW 6 POST-DEADLINE ESCALATING REMINDERS ──
    case 'reminder-1':
      return `⚠️ REMINDER 1 (MILD)\n\nDEAR ${assignedTo.toUpperCase()},\nTHE DEADLINE WHICH YOU HAVE COMMITTED TO YOUR BOSS HAS CROSSED. PLEASE EXPEDITE THE WORK AND COMPLETE THE DEADLINE WITHIN THE NEXT 24 HOURS.\n\nProject: ${clientName} — ${stageName}\n${taskList}`;

    case 'reminder-2':
      return `⚠️ REMINDER 2\n\nDEAR ${assignedTo.toUpperCase()},\nTHIS IS THE SECOND REMINDER FOR THE PENDING WORK !!! THE SECOND DEADLINE GIVEN BY YOU HAS ALSO LAPSED.. CONNECT WITH BOSS IMMEDIATELY.. PUT YOUR CLARIFICATIONS FOR THE SAME!! YOUR DEADLINE SHALL BE ONLY EXTENDED TO THE NEXT 24 HOURS.\n\nProject: ${clientName} — ${stageName}\n${taskList}`;

    case 'reminder-3':
      return `🚨 REMINDER 3\n\n@${primaryName} THIS IS EXTREME UNPROFESSIONAL BEHAVIOUR... SHALL BE REPORTED TO BOSS.. PUT UP YOUR CLARIFICATIONS REGARDING THE PROJECT IMMEDIATELY... THE THIRD DEADLINE WHEN CROSSED SHALL LEAD TO DEDUCTIONS IN SALARY OF YOU AND YOUR TEAM AS DECIDED BY BOSS... RESOLVE THE PROBLEM IN THE NEXT 24 HOURS AND PASS ON THE PROJECT FURTHER IMMEDIATELY.\n\nProject: ${clientName} — ${stageName}\n${taskList}`;

    case 'reminder-4':
      return `🚨 REMINDER 4\n\n@${primaryName} AMOUNT OF ₹1,500 SHALL BE DEDUCTED TILL DATE FOR NON PERFORMANCE AND FAILURE TO FOLLOW DEADLINE AS INSTRUCTED BY BOSS FOR PROJECT: ${clientName.toUpperCase()}.\n\nStage: ${stageName}\n${taskList}`;

    case 'reminder-5':
      return `🚨 REMINDER 5\n\nDEAR TEAM, PLS HELP ${primaryName} TO RESOLVE HIS PROBLEM WITHIN THE DEADLINE... FAILING WHICH SIMILAR DEDUCTION SHALL BE APPLICABLE FROM YOUR SALARY TOO.. BOSS IS DISAPPOINTED.\n\nProject: ${clientName} — ${stageName}\n${taskList}`;

    case 'reminder-6':
      return `🚨 REMINDER 6\n\nAMOUNT OF ₹3,000 TILL DATE SHALL BE DEDUCTED FROM THE SALARIES OF THE FOLLOWING STAFF FOR NOT RESOLVING THE PROBLEMS AND NOT PROVIDING CLARIFICATIONS FOR THE DELAY: ${assignedTo.toUpperCase()}.\n\nProject: ${clientName} — ${stageName}\n${taskList}`;

    default:
      return `Reminder: ${pendingCount} task(s) pending in ${stageName} for ${clientName}. Assigned to: ${assignedTo}.`;
  }
}
