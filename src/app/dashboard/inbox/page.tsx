'use client';
import { useEffect, useState } from 'react';
import { getAlerts, markAlertRead, PerformanceAlert } from '@/lib/store';
import { Inbox, AlertOctagon, AlertTriangle, Info } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { icon: <AlertOctagon size={18} />, color: '#c06060', bg: 'rgba(192,96,96,0.08)', border: 'rgba(192,96,96,0.3)' },
  urgent:   { icon: <AlertTriangle size={18} />, color: '#c8a96e', bg: 'rgba(200,169,110,0.08)', border: 'rgba(200,169,110,0.25)' },
  warning:  { icon: <AlertTriangle size={18} />, color: '#c8a96e', bg: 'rgba(200,169,110,0.06)', border: 'rgba(200,169,110,0.18)' },
  info:     { icon: <Info size={18} />,          color: '#6aaa84', bg: 'rgba(106,170,132,0.06)', border: 'rgba(106,170,132,0.18)' },
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

export default function AdminInboxPage() {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  const load = () => setAlerts(getAlerts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  useEffect(() => { load(); }, []);

  const markRead = (id: string) => { markAlertRead(id, 'admin'); load(); };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.4rem' }}>
          <Inbox size={24} /> Admin Inbox
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Stage alerts, reminders and automated notifications for all projects</p>
      </div>

      {alerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Inbox size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Your inbox is empty. Automated alerts will appear here when stages are started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const isRead = alert.readBy.includes('admin');
            return (
              <div key={alert.id} className="glass-panel" onClick={() => markRead(alert.id)} style={{ padding: '1.25rem 1.5rem', borderLeft: `3px solid ${cfg.color}`, background: isRead ? 'var(--bg-raised)' : cfg.bg, opacity: isRead ? 0.65 : 1, cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: cfg.color, marginTop: 2 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{alert.clientName} — {alert.stageName}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{TEMPLATE_LABELS[alert.templateKey]}</span>
                      {!isRead && <span style={{ background: 'var(--accent)', color: '#000', padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>NEW</span>}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {alert.message.split('\n')[0]}
                    </p>
                    <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      {new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      · Assigned: {alert.assignedTo}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
