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

  useEffect(() => { load(); }, []);

  const markRead = (id: string) => {
    markAlertRead(id, 'admin');
    load();
  };

  const markAllRead = () => {
    alerts.forEach(a => markAlertRead(a.id, 'admin'));
    load();
  };

  const unread = alerts.filter(a => !a.readBy.includes('admin')).length;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'var(--text)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={24} /> Performance Alerts
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Automated stage reminders and escalation alerts across all clients
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ background: 'var(--accent-bg)', border: '1px solid var(--border-active)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Mark All Read ({unread})
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>No performance alerts yet. Alerts will appear here when stages are started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const isRead = alert.readBy.includes('admin');
            return (
              <div
                key={alert.id}
                className="glass-panel"
                style={{ padding: '1.25rem 1.5rem', borderLeft: `3px solid ${cfg.color}`, background: isRead ? 'var(--bg-raised)' : cfg.bg, opacity: isRead ? 0.7 : 1, transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                    <span style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em' }}>{cfg.label}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{TEMPLATE_LABELS[alert.templateKey] || alert.templateKey}</span>
                        {!isRead && <span style={{ background: 'var(--accent)', color: '#000', padding: '1px 6px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>NEW</span>}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                        {alert.clientName} — {alert.stageName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Assigned to: <strong style={{ color: 'var(--text)' }}>{alert.assignedTo}</strong>
                        {alert.timeBound && <> · Deadline: <strong style={{ color: cfg.color }}>{new Date(alert.timeBound + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></>}
                      </div>
                      <pre style={{ fontFamily: 'var(--font)', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', margin: 0 }}>
                        {alert.message}
                      </pre>
                      <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        {new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {!isRead && (
                    <button onClick={() => markRead(alert.id)} title="Mark as read" style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}>
                      <CheckCircle2 size={14} />
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
