'use client';

import { useEffect, useState } from 'react';
import { getAlertsForUser, markAlertRead, isStaffAuthenticated, getStaff, PerformanceAlert } from '@/lib/store';
import { Mailbox, AlertOctagon, AlertTriangle, Info, Bell } from 'lucide-react';
import styles from './page.module.css';

const SEVERITY_CONFIG = {
  critical: { icon: <AlertOctagon size={18} />, label: 'CRITICAL', color: '#c06060' },
  urgent:   { icon: <AlertTriangle size={18} />, label: 'URGENT',   color: '#c8a96e' },
  warning:  { icon: <AlertTriangle size={18} />, label: 'WARNING',  color: '#c8a96e' },
  info:     { icon: <Info size={18} />,          label: 'INFO',     color: '#6aaa84' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  'stage-start':    '🚀 Stage Started',
  'day-1-light':    '💬 Day 1 Reminder',
  'day-2-moderate': '📌 Day 2 Follow-up',
  'day-3-warning':  '⚠️ Day 3 Warning',
  'daily-update':   '💬 Daily Reminder',
  'deadline-24h':   '⏰ 24h Before Deadline',
  'reminder-1':     '⚠️ Reminder 1 (Mild)',
  'reminder-2':     '⚠️ Reminder 2 (Second Warning)',
  'reminder-3':     '🚨 Reminder 3 (Salary Threat)',
  'reminder-4':     '🚨 Reminder 4 (Salary Deduction)',
  'reminder-5':     '🚨 Reminder 5 (Team Deduction)',
  'reminder-6':     '🚨 Reminder 6 (Final Deduction)',
};

export default function StaffInboxPage() {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [staffName, setStaffName] = useState('');

  const load = (name: string) => {
    const userAlerts = getAlertsForUser(name).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAlerts(userAlerts);
  };

  useEffect(() => {
    const staffId = isStaffAuthenticated();
    if (!staffId) return;
    const staff = getStaff().find(s => s.id === staffId);
    if (!staff) return;
    setStaffName(staff.name);
    load(staff.name);
  }, []);

  const markRead = (id: string) => { markAlertRead(id, staffName); load(staffName); };

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Inbox</h1>
          <p className={styles.subtitle}>Stage reminders and automated task alerts</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className={styles.emptyState}>
          <Mailbox size={18} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: 8 }} /> No messages or alerts at this time.
        </div>
      ) : (
        <div className={styles.messageList}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const isRead = alert.readBy.includes(staffName);
            return (
              <div
                key={alert.id}
                className={`glass-panel ${styles.messageCard} ${styles[alert.severity === 'critical' ? 'urgent' : alert.severity]}`}
                onClick={() => markRead(alert.id)}
                style={{ opacity: isRead ? 0.65 : 1, cursor: 'pointer', transition: 'all 0.2s', borderLeft: `3px solid ${cfg.color}` }}
              >
                <div className={styles.iconBox} style={{ color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.sender}>{TEMPLATE_LABELS[alert.templateKey] || '🤖 Automated'}</span>
                    <span className={styles.timestamp}>
                      {new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.subject}>
                    {alert.clientName} — {alert.stageName}
                    {!isRead && <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#000', padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>NEW</span>}
                  </div>
                  <div className={styles.body} style={{ whiteSpace: 'pre-wrap' }}>{alert.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
