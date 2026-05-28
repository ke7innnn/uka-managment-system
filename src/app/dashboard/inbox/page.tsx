'use client';
import { useEffect, useState } from 'react';
import { getAlerts, markAlertRead, PerformanceAlert } from '@/lib/store';
import { Inbox, AlertOctagon, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { icon: <AlertOctagon size={18} />, color: '#c06060', bg: 'rgba(192,96,96,0.08)', border: 'rgba(192,96,96,0.3)' },
  urgent:   { icon: <AlertTriangle size={18} />, color: '#c8a96e', bg: 'rgba(200,169,110,0.08)', border: 'rgba(200,169,110,0.25)' },
  warning:  { icon: <AlertTriangle size={18} />, color: '#c8a96e', bg: 'rgba(200,169,110,0.06)', border: 'rgba(200,169,110,0.18)' },
  info:     { icon: <Info size={18} />,          color: '#6aaa84', bg: 'rgba(106,170,132,0.06)', border: 'rgba(106,170,132,0.18)' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  'stage-start':    '🚀 Stage Started',
  'stage-ready':    '✅ Ready for Admin Review',
  'day-1-light':    '💬 Day 1 Reminder',
  'day-2-moderate': '📌 Day 2 Follow-up',
  'day-3-warning':  '⚠️ Day 3 Warning',
  'daily-update':   '💬 Daily Reminder',
  'deadline-24h':   '⏰ 24h Before Deadline',
  'reminder-1':     '⚠️ Reminder 1',
  'reminder-2':     '⚠️ Reminder 2',
  'reminder-3':     '🚨 Reminder 3',
  'reminder-4':     '🚨 Reminder 4',
  'reminder-5':     '🚨 Reminder 5',
  'reminder-6':     '🚨 Reminder 6',
};

export default function AdminInboxPage() {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  const load = () => setAlerts(getAlerts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  useEffect(() => {
    load();
    window.addEventListener('uka-sync-complete', load);
    return () => window.removeEventListener('uka-sync-complete', load);
  }, []);

  const markRead = (id: string) => { markAlertRead(id, 'admin'); load(); };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820, margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 400, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.4rem', flexWrap: 'wrap' }}>
          <Inbox size={22} /> Admin Inbox
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Stage alerts, reminders and automated notifications for all projects</p>
      </div>

      {/* Empty */}
      {alerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Inbox size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Your inbox is empty. Automated alerts will appear here when stages are started.</p>
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
                onClick={() => markRead(alert.id)}
                style={{
                  padding: '1rem 1.25rem',
                  borderLeft: `4px solid ${cfg.color}`,
                  background: isRead ? 'var(--bg-raised)' : cfg.bg,
                  opacity: isRead ? 0.65 : 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: 12,
                  boxSizing: 'border-box',
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                  {/* Icon */}
                  <span style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }}>{cfg.icon}</span>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                        {alert.clientName} — {alert.stageName}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {TEMPLATE_LABELS[alert.templateKey] || alert.templateKey}
                      </span>
                      {!isRead && (
                        <span style={{ background: 'var(--accent)', color: '#000', padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          NEW
                        </span>
                      )}
                    </div>

                    {/* Preview message */}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                      {alert.message.split('\n')[0]}
                    </p>

                    {/* Footer */}
                    <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>· {alert.assignedTo}</span>
                    </div>
                  </div>

                  {/* Read checkmark hint */}
                  {!isRead && (
                    <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }}>
                      <CheckCircle2 size={14} />
                    </span>
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
