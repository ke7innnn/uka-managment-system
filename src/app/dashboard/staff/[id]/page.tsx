'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getStaffById, updateStaffMember, StaffMember,
  StaffTask,
  staffCompletionPct, staffStatusColor,
} from '@/lib/store';
import { Mail, Phone, BarChart2, Calendar, AlertTriangle, User, CheckCircle2, Check, Trash2 } from 'lucide-react';
import styles from './page.module.css';

const COLOR_MAP = {
  green:  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7', dot: '#10b981', label: 'On Track' },
  yellow: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fcd34d', dot: '#f59e0b', label: 'Needs Attention' },
  red:    { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#fca5a5', dot: '#ef4444', label: 'Behind' },
};

function daysLeft(deadline?: string) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [tab, setTab] = useState<'tasks' | 'overview'>('overview');

  // Task form
  const [taskTitle, setTaskTitle]       = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');

  const reload = () => {
    const m = getStaffById(params.id);
    if (!m) { router.replace('/dashboard/staff'); return; }
    setMember(m);
  };
  useEffect(() => { reload(); }, [params.id]);

  if (!member) return null;

  const color  = staffStatusColor(member);
  const c      = COLOR_MAP[color];
  const pct    = staffCompletionPct(member);
  const done   = member.tasks.filter(t => t.completed).length;
  const days   = daysLeft(member.workDeadline);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const addTask = () => {
    const title = taskTitle.trim();
    if (!title || !taskDeadline) return;
    const task: StaffTask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      deadline: taskDeadline,
      createdAt: new Date().toISOString(),
    };
    updateStaffMember(member.id, { tasks: [...member.tasks, task] });
    setTaskTitle(''); setTaskDeadline('');
    reload();
  };

  const toggleTask = (taskId: string) => {
    const updated = member.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined };
      }
      return t;
    });
    updateStaffMember(member.id, { tasks: updated });
    reload();
  };

  const deleteTask = (taskId: string) => {
    updateStaffMember(member.id, { tasks: member.tasks.filter(t => t.id !== taskId) });
    reload();
  };

  // Removed Attendance Handlers
  const overdueTasks = member.tasks.filter(t => !t.completed && new Date(t.deadline) < new Date());
  const pendingTasks = member.tasks.filter(t => !t.completed && new Date(t.deadline) >= new Date());
  const doneTasks    = member.tasks.filter(t => t.completed);

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <Link href="/dashboard/staff" className={styles.back}>← Back to Staff</Link>

      {/* Hero */}
      <div className={`glass-panel ${styles.hero}`} style={{ borderColor: c.border }}>
        <div className={styles.heroLeft}>
          <div className={styles.heroAvatarWrap}>
            {member.profilePicture ? (
              <img src={member.profilePicture} alt={member.name} className={styles.heroAvatar} style={{ objectFit: 'cover' }} />
            ) : (
              <div className={styles.heroAvatar} style={{ background: `linear-gradient(135deg,${c.dot}99,${c.dot}44)`, color: c.text }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName} style={{ color: c.text }}>{member.name}</h1>
            <p className={styles.heroRole}>{member.role}{member.department ? ` · ${member.department}` : ''}</p>
            <div className={styles.heroMeta}>
              {member.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={13} strokeWidth={1.5} />{member.email}</span>}
              {member.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={13} strokeWidth={1.5} />{member.phone}</span>}
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <span className={styles.heroBadge} style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block', marginRight: 6 }} />{c.label}
          </span>
          <Link href={`/dashboard/staff/${member.id}/edit`} className={styles.editBtn}>Edit</Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className={styles.summaryStrip}>
        <SummaryCard Icon={BarChart2} label="Tasks Done" value={`${done}/${member.tasks.length}`} sub={`${pct}%`} color={c.text} />
        <SummaryCard
          Icon={Calendar}
          label="Deadline"
          value={days === null ? '—' : days < 0 ? 'Overdue!' : `${days} days`}
          sub={member.workDeadline ? new Date(member.workDeadline).toLocaleDateString('en-IN') : ''}
          color={days !== null && days < 3 ? '#f87171' : '#4ade80'}
        />
        {overdueTasks.length > 0 && (
          <SummaryCard Icon={AlertTriangle} label="Overdue Tasks" value={`${overdueTasks.length}`} color="#f87171" />
        )}
      </div>

      {/* Progress bar */}
      <div className={`glass-panel ${styles.progressBar}`}>
        <div className={styles.pbHeader}>
          <span className={styles.pbLabel}>Overall Task Progress</span>
          <span className={styles.pbPct} style={{ color: c.text }}>{pct}%</span>
        </div>
        <div className={styles.pbTrack}>
          <div className={styles.pbFill} style={{ width: `${pct}%`, background: `linear-gradient(90deg,${c.dot},${c.text})` }} />
        </div>
        <p className={styles.pbSub}>{done} completed · {pendingTasks.length} pending · {overdueTasks.length} overdue</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['overview','tasks'] as const).map(t => (
          <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? <User size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} /> : <CheckCircle2 size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}{t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'tasks' && member.tasks.length > 0 && <span className={styles.tabBadge}>{member.tasks.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ───────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.infoGrid}>
            <InfoBox label="Full Name"   value={member.name} />
            <InfoBox label="Role"        value={member.role} />
            <InfoBox label="Department"  value={member.department} />
            <InfoBox label="Email"       value={member.email} />
            <InfoBox label="Phone"       value={member.phone} />
            <InfoBox label="Login Password" value={member.password || member.phone} />
            <InfoBox label="Task Target" value={`${member.totalTasksTarget} tasks`} />
            <InfoBox label="Work Deadline" value={member.workDeadline ? new Date(member.workDeadline).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : undefined} />
            <InfoBox label="Joined"      value={new Date(member.joinedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} />
          </div>
          {member.notes && (
            <div className={styles.notesBox}>
              <h3 className={styles.notesTitle}>Notes</h3>
              <p className={styles.notesText}>{member.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tasks Tab ──────────────────────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <div className={styles.tabContent}>
          {/* Add task form */}
          <div className={styles.addTaskRow}>
            <input
              type="text"
              placeholder="Task title…"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              className={styles.taskInput}
              id="new-task-title"
            />
            <input
              type="date"
              value={taskDeadline}
              onChange={e => setTaskDeadline(e.target.value)}
              className={styles.dateInput}
              id="new-task-deadline"
              title="Task deadline"
            />
            <button className={styles.addBtn} onClick={addTask}>+ Add Task</button>
          </div>

          {member.tasks.length === 0 ? (
            <div className={styles.empty}>No tasks added yet.</div>
          ) : (
            <div className={styles.taskSections}>
              {overdueTasks.length > 0 && (
                <TaskGroup title="Overdue" tasks={overdueTasks} onToggle={toggleTask} onDelete={deleteTask} />
              )}
              {pendingTasks.length > 0 && (
                <TaskGroup title="Pending" tasks={pendingTasks} onToggle={toggleTask} onDelete={deleteTask} />
              )}
              {doneTasks.length > 0 && (
                <TaskGroup title="Completed" tasks={doneTasks} onToggle={toggleTask} onDelete={deleteTask} dimmed />
              )}
            </div>
          )}
        </div>
      )}

      {/* Removed Attendance Tab content */}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({ Icon, label, value, sub, color }: { Icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryIcon}><Icon size={18} strokeWidth={1.5} style={{ color: color || 'var(--text-secondary)' }} /></span>
      <div>
        <span className={styles.summaryVal} style={{ color }}>{value}</span>
        {sub && <span className={styles.summarySub}>{sub}</span>}
        <span className={styles.summaryLabel}>{label}</span>
      </div>
    </div>
  );
}

function TaskGroup({ title, tasks, onToggle, onDelete, dimmed = false }: {
  title: string; tasks: StaffTask[]; onToggle: (id: string) => void; onDelete: (id: string) => void; dimmed?: boolean;
}) {
  return (
    <div className={styles.taskGroup}>
      <h3 className={styles.taskGroupTitle}>{title} <span className={styles.taskGroupCount}>({tasks.length})</span></h3>
      {tasks.map(task => {
        const dl = daysLeft(task.deadline);
        const overdue = !task.completed && dl !== null && dl < 0;
        return (
          <div key={task.id} className={`${styles.taskItem} ${dimmed ? styles.taskDimmed : ''} ${overdue ? styles.taskOverdue : ''}`}>
            <button
              className={`${styles.taskCheck} ${task.completed ? styles.taskChecked : ''}`}
              onClick={() => onToggle(task.id)}
              id={`task-check-${task.id}`}
            >
              {task.completed && <Check size={12} strokeWidth={2.5} />}
            </button>
            <div className={styles.taskBody}>
              <span className={styles.taskTitle}>{task.title}</span>
              <span className={styles.taskDeadline} style={{ color: overdue ? '#fca5a5' : undefined }}>
                {overdue ? <AlertTriangle size={11} strokeWidth={2} style={{ marginRight: 3, verticalAlign: 'middle', color: '#f87171' }} /> : ''}Due: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {dl !== null && !task.completed && <> · {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}</>}
              </span>
            </div>
            <button className={styles.taskDelete} onClick={() => onDelete(task.id)} title="Remove"><Trash2 size={14} strokeWidth={1.75} /></button>
          </div>
        );
      })}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className={styles.infoBox}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoVal}>{value || <span style={{ opacity: 0.4 }}>—</span>}</span>
    </div>
  );
}
