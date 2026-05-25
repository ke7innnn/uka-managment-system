'use client';
import { useEffect, useState } from 'react';
import { getAlerts, markAlertRead, PerformanceAlert } from '@/lib/store';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, Bell } from 'lucide-react';
import styles from './page.module.css';

const SEVERITY_CONFIG = {
  critical: { icon: <AlertOctagon size={18} />, label: 'CRITICAL', color: '#c06060', bg: 'rgba(192,96,96,0.1)', border: 'rgba(192,96,96,0.3)' },
  urgent:   { icon: <AlertTriangle size={18} />, label: 'URGENT',   color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', border: 'rgba(200,169,110,0.3)' },
  warning:  { icon: <AlertTriangle size={18} />, label: 'WARNING',  color: '#c8a96e', bg: 'rgba(200,169,110,0.08)', border: 'rgba(200,169,110,0.2)' },
  info:     { icon: <Info size={18} />,          label: 'INFO',     color: '#6aaa84', bg: 'rgba(106,170,132,0.08)', border: 'rgba(106,170,132,0.2)' },
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

export default function AdminPerformanceAlertsPage() {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  const load = () => setAlerts(getAlerts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  useEffect(() => {
    load();
    window.addEventListener('uka-sync-complete', load);
    return () => window.removeEventListener('uka-sync-complete', load);
  }, []);

  const markRead = (id: string) => { markAlertRead(id, 'admin'); load(); };
  const markAllRead = () => { alerts.forEach(a => markAlertRead(a.id, 'admin')); load(); };

  const unread = alerts.filter(a => !a.readBy.includes('admin')).length;

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1><Bell size={22} /> Performance Alerts</h1>
          <p>Automated stage reminders and escalation alerts across all clients</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className={styles.markAllBtn}>
            Mark All Read ({unread})
          </button>
        )}
      </div>

      {/* Empty State */}
      {alerts.length === 0 ? (
        <div className={`glass-panel ${styles.emptyState}`}>
          <CheckCircle2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>No performance alerts yet. Alerts will appear here when stages are started.</p>
        </div>
      ) : (
        <div className={styles.alertList}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const isRead = alert.readBy.includes('admin');
            return (
              <div
                key={alert.id}
                className={`glass-panel ${styles.alertCard}`}
                style={{
                  background: isRead ? 'var(--bg-raised)' : cfg.bg,
                  opacity: isRead ? 0.7 : 1,
                  borderColor: cfg.border,
                }}
              >
                {/* Left accent stripe */}
                <div className={styles.alertAccent} style={{ background: cfg.color }} />

                <div className={styles.alertInner}>
                  <div className={styles.alertContent}>
                    {/* Icon */}
                    <span className={styles.alertIconWrap} style={{ color: cfg.color }}>{cfg.icon}</span>

                    {/* Body */}
                    <div className={styles.alertBody}>
                      {/* Tags */}
                      <div className={styles.alertTags}>
                        <span
                          className={styles.severityBadge}
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className={styles.templateLabel}>{TEMPLATE_LABELS[alert.templateKey] || alert.templateKey}</span>
                        {!isRead && <span className={styles.newBadge}>NEW</span>}
                      </div>

                      {/* Title */}
                      <div className={styles.alertTitle}>{alert.clientName} — {alert.stageName}</div>

                      {/* Meta */}
                      <div className={styles.alertMeta}>
                        Assigned to: <strong style={{ color: 'var(--text)' }}>{alert.assignedTo}</strong>
                        {alert.timeBound && (
                          <> · Deadline: <strong style={{ color: cfg.color }}>{new Date(alert.timeBound + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></>
                        )}
                      </div>

                      {/* Message */}
                      <pre className={styles.alertMessage}>{alert.message}</pre>

                      {/* Time */}
                      <div className={styles.alertTime}>
                        {new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Mark read button */}
                  {!isRead && (
                    <button onClick={() => markRead(alert.id)} className={styles.markReadBtn} title="Mark as read">
                      <CheckCircle2 size={14} /> Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
