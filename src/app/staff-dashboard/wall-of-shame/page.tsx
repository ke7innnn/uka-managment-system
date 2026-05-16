'use client';

import { useEffect, useState } from 'react';
import { getStaff, StaffMember, isStaffAuthenticated } from '@/lib/store';
import styles from './page.module.css';

type ShamedMessage = {
  id: string;
  targetName: string;
  pendingCount: number;
  completionPct: number;
  message: string;
  avatar: string;
};

const TEMPLATES = [
  "Attention **{name}**: Our records show you have **{count} pending projects** with only **{pct}% completion**. This is unacceptable. Please prioritize your work immediately.",
  "Warning for **{name}**: Your performance velocity is significantly below the team average. You have **{count} tasks** outstanding. Complete them now to avoid further alerts.",
  "Public Notice: **{name}** is currently delaying project milestones with **{count} incomplete tasks**. We expect these to be finished by EOD.",
  "Performance Review: **{name}**, you are currently at **{pct}% productivity**. Please update your status and finish the **{count} assigned projects**.",
];

export default function PerformanceAlertsPage() {
  const [messages, setMessages] = useState<ShamedMessage[]>([]);
  const [authId, setAuthId] = useState<string | null>(null);

  useEffect(() => {
    setAuthId(isStaffAuthenticated());
    const allStaff = getStaff();
    
    const generated: ShamedMessage[] = [];
    
    allStaff.forEach((s, index) => {
      const pendingCount = s.tasks.filter(t => !t.completed).length;
      const totalAssigned = s.tasks.length;
      const completionPct = totalAssigned > 0 ? Math.round(((totalAssigned - pendingCount) / totalAssigned) * 100) : 0;
      
      // Qualify for Accountability Monitor: Pending > 0 and completion < 50%
      if (pendingCount > 0 && completionPct < 50) {
        const template = TEMPLATES[index % TEMPLATES.length];
        const msgText = template
          .replace('{name}', s.name)
          .replace('{count}', pendingCount.toString())
          .replace('{pct}', completionPct.toString());

        generated.push({
          id: s.id,
          targetName: s.name,
          pendingCount,
          completionPct,
          message: msgText,
          avatar: s.name.charAt(0).toUpperCase()
        });
      }
    });

    // Sort by worst performers (most pending tasks)
    generated.sort((a, b) => b.pendingCount - a.pendingCount);
    
    setMessages(generated);
  }, []);

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>📢 Accountability Monitoring</h1>
        <p className={styles.subtitle}>
          Automated performance broadcast for underperforming staff members.
        </p>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>
            <div className={styles.onlineBadge}></div>
            ADMIN BROADCAST: PERFORMANCE_ALERTS
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
            ENCRYPTED · REAL-TIME
          </div>
        </div>

        <div className={styles.chatBody}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem' }}>✨</div>
              <p>No performance alerts currently active.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>All staff are meeting operational thresholds.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={styles.messageRow}>
                <div className={styles.avatar} style={{ border: msg.id === authId ? '2px solid #ef4444' : 'none' }}>
                  {msg.avatar}
                </div>
                <div className={styles.bubble} style={{ background: msg.id === authId ? 'rgba(239, 68, 68, 0.2)' : undefined }}>
                  <span className={styles.senderName}>ADMIN @ {msg.targetName} {msg.id === authId ? '(YOU)' : ''}</span>
                  <div className={styles.messageText} dangerouslySetInnerHTML={{ 
                    __html: msg.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }} />
                  <span className={styles.timestamp}>Just now · SEVERE ALERT</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.chatFooter}>
          <div className={styles.footerNote}>
            All messages are automated based on real-time task completion data.
          </div>
        </div>
      </div>
    </div>
  );
}
