/**
 * Reminder Engine — Full Timeline
 *
 * Template Order:
 *  Before deadline (while stage is in-progress):
 *    day-1-light       — +24h from stage start (info)
 *    day-2-moderate    — +48h from stage start (warning)
 *    day-3-warning     — +72h from stage start (warning)
 *    deadline-24h      — 24 hours before deadline (warning, friendly tone)
 *
 *  After deadline (stage still not completed):
 *    reminder-1        — Day 1 overdue (warning)
 *    reminder-2        — Day 2 overdue (urgent)
 *    reminder-3+       — Day 3+ overdue (critical, escalating salary threats)
 */

import { Client, Phase, addAlert, addWorkspaceMessage, getAlerts, saveAlerts } from './store';

export interface ReminderSchedule {
  stageId: string;
  clientId: string;
  startedAt: string;  // ISO
  lastFiredAt?: string; // ISO of last reminder sent
  nextFireAt: string; // ISO of when next reminder should fire
  templateIndex: number; // 0-5 (maps to template order)
  deadline24hFired?: boolean; // whether we already sent the 24h-before-deadline reminder
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
    templateIndex: 1, // next is day-1-light
    deadline24hFired: false,
  });
  saveSchedules(schedules);
}

/**
 * Call this when admin changes or adds a stage deadline (timeBound).
 * Creates or updates the reminder schedule.
 */
export function updateStageReminderSchedule(client: Client, phase: Phase): void {
  if (phase.status !== 'in-progress') return;

  const now = new Date();
  const schedules = getSchedules();
  const existingIdx = schedules.findIndex(s => s.stageId === phase.id && s.clientId === client.id);

  if (existingIdx !== -1) {
    // If a schedule already exists, force check immediately to process newly added deadline
    schedules[existingIdx].nextFireAt = now.toISOString();
    // Reset the 24h flag if the deadline changed significantly
    schedules[existingIdx].deadline24hFired = false;
  } else {
    // If schedule doesn't exist, initialize it
    const isOverdue = phase.timeBound ? now > new Date(phase.timeBound + 'T23:59:59') : false;
    const nextFireAt = isOverdue ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    schedules.push({
      stageId: phase.id,
      clientId: client.id,
      startedAt: phase.startedAt || now.toISOString(),
      lastFiredAt: now.toISOString(),
      nextFireAt: nextFireAt.toISOString(),
      templateIndex: 1,
      deadline24hFired: false,
    });
  }
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
    const client = clients.find(c => c.id === schedule.clientId);
    if (!client) return;
    const phase = client.phases.find(p => p.id === schedule.stageId);
    if (!phase) return;

    // If stage is completed, remove schedule
    if (phase.status === 'completed') {
      schedule.templateIndex = 999; // mark for removal
      changed = true;
      return;
    }

    const pendingTasks = (phase.tasks || []).filter(t => !t.completed).map(t => t.title);
    if (pendingTasks.length === 0) return;

    const uniqueAssignees = [...new Set((phase.tasks || []).map(t => t.assignedTo).filter(Boolean))];
    const assignedTo = uniqueAssignees.join(', ') || 'Team';

    const deadlinePassed = phase.timeBound ? now > new Date(phase.timeBound + 'T23:59:59') : false;

    // ── 24h-before-deadline reminder ──────────────────────────────────────────
    // Fire once when we're within 24h of the deadline but it hasn't passed yet
    if (phase.timeBound && !deadlinePassed && !schedule.deadline24hFired) {
      const deadlineDate = new Date(phase.timeBound + 'T23:59:59');
      const msUntilDeadline = deadlineDate.getTime() - now.getTime();
      const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);

      if (hoursUntilDeadline <= 24) {
        const msg = buildMessage('deadline-24h', client.name, phase.name, pendingTasks.length, pendingTasks.slice(0, 5), assignedTo, phase.timeBound);
        addAlert({
          clientId: client.id,
          clientName: client.name,
          stageName: phase.name,
          assignedTo,
          pendingTasks,
          timeBound: phase.timeBound,
          severity: 'warning',
          templateKey: 'deadline-24h',
          message: msg,
        });
        addWorkspaceMessage(
          'system',
          '🤖 System',
          'Automated',
          `⏰ DEADLINE APPROACHING: "${phase.name}" for ${client.name} is due in less than 24 hours. Assigned to: ${assignedTo}. Please finish up!`
        );
        schedule.deadline24hFired = true;
        changed = true;
      }
    }

    // ── Pre-deadline day reminders (day-1, day-2, day-3, and beyond) ────────
    // These fire on schedule every 24h while the stage is in-progress, before deadline
    if (!deadlinePassed && new Date(schedule.nextFireAt) <= now) {
      const templateMap: Record<number, string> = {
        1: 'day-1-light',
        2: 'day-2-moderate',
        3: 'day-3-warning',
      };
      
      // If we've passed day 3, just use a generic 'daily-update' template
      const templateKey = templateMap[schedule.templateIndex] || 'daily-update';

      const severity: 'info' | 'warning' | 'urgent' =
        schedule.templateIndex === 1 ? 'info' :
        schedule.templateIndex === 2 ? 'warning' : 'warning';

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
        message: msg,
      });

      schedule.lastFiredAt = now.toISOString();
      // Keep incrementing index so we know how many days have passed, and schedule next check in 24h
      schedule.templateIndex += 1;
      schedule.nextFireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      changed = true;
      return;
    }

    // ── Post-deadline escalating reminders ───────────────────────────────────
    if (deadlinePassed && new Date(schedule.nextFireAt) <= now) {
      // Calculate stage duration in days to space reminders proportionally
      const startDate = phase.startedAt ? new Date(phase.startedAt) : new Date(schedule.startedAt);
      const deadlineDate = new Date(phase.timeBound + 'T23:59:59');
      const durationInMs = deadlineDate.getTime() - startDate.getTime();
      const durationInDays = Math.max(1, Math.round(durationInMs / (1000 * 60 * 60 * 24)));

      // Proportional interval: divide stage duration by 6 templates (minimum 1 day)
      const interval = Math.max(1, Math.floor(durationInDays / 6));

      // Calculate days overdue
      const msOverdue = now.getTime() - deadlineDate.getTime();
      const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24)) + 1;

      // Escalate milestone index every proportional 'interval' days overdue (cap at 6)
      const reminderIndex = Math.min(6, Math.floor((daysOverdue - 1) / interval) + 1);

      const templateKey = `reminder-${reminderIndex}`;
      let severity: 'info' | 'warning' | 'urgent' | 'critical';
      if (reminderIndex === 1 || reminderIndex === 2) {
        severity = 'warning';
      } else if (reminderIndex === 3 || reminderIndex === 4) {
        severity = 'urgent';
      } else {
        severity = 'critical';
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
        message: msg,
      });

      // Post workspace message for warnings and above
      const emoji = severity === 'critical' ? '🚨' : severity === 'urgent' ? '🔴' : '⚠️';
      const alertBody = msg.split('\n\n')[1] || msg;
      addWorkspaceMessage(
        'system',
        '🤖 System',
        'Automated',
        `${emoji} REMINDER ${reminderIndex} OVERDUE:\n${alertBody}`
      );

      // Schedule next check in 24h
      schedule.lastFiredAt = now.toISOString();
      schedule.nextFireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      schedule.templateIndex = Math.min(schedule.templateIndex + 1, 5);
      changed = true;
    }
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

    case 'daily-update':
      return `💬 Daily Reminder\n\nHi ${assignedTo.split(' ')[0]}, just a friendly check-in. "${stageName}" for ${clientName} is still in progress with ${pendingCount} pending task(s).\n\n${taskList}\n\n${deadlineStr}\n\nKeep pushing forward, you're doing great! Let us know if you need any help.`;

    case 'deadline-24h':
      return `⏰ Heads Up — Less than 24 Hours Left!\n\nHey ${assignedTo}, just a friendly heads up — the deadline for "${stageName}" (client: ${clientName}) is coming up in less than 24 hours.\n\n${taskList}\n\n${deadlineStr}\n\nYou still have time — please make sure all pending tasks are wrapped up before the deadline. Reach out on workspace chat if you need help!`;

    // ── POST-DEADLINE ESCALATING REMINDERS ──
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
