'use client';

import { useEffect, useState } from 'react';
import { getStaff, isStaffAuthenticated, StaffMember } from '@/lib/store';
import { Mailbox, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import styles from './page.module.css';
import Link from 'next/link';

type Message = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  type: 'urgent' | 'warning' | 'info';
  timestamp: string;
};

export default function StaffInboxPage() {
  const [member, setMember] = useState<StaffMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const staffId = isStaffAuthenticated();
    if (!staffId) return;
    
    const allStaff = getStaff();
    const currentStaff = allStaff.find(s => s.id === staffId);
    if (!currentStaff) return;
    
    setMember(currentStaff);

    // Generate Automated Messages Based on Performance
    const generatedMsgs: Message[] = [];
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
    
    const pendingTasks = currentStaff.tasks.filter(t => !t.completed);
    
    if (pendingTasks.length > 0) {
      // General reminder for pending tasks
      generatedMsgs.push({
        id: 'msg-1',
        sender: 'Automated System',
        subject: `Daily Reminder: You have ${pendingTasks.length} pending task(s)`,
        body: `This is your automated daily reminder. You currently have ${pendingTasks.length} task(s) that are incomplete. Please prioritize finishing your assigned work as soon as possible.`,
        type: 'warning',
        timestamp: `Today, 09:00 AM`
      });

      // Special aggressive message if they have 3 or more pending tasks (like "testing 2")
      if (pendingTasks.length >= 3) {
        generatedMsgs.push({
          id: 'msg-2',
          sender: 'Admin Alert',
          subject: 'URGENT: Severe Task Backlog Detected',
          body: `WARNING: You have accumulated ${pendingTasks.length} uncompleted tasks. This is severely delaying our project pipeline. If this backlog is not cleared immediately, it will be flagged for an administrative review. Complete your pending work now.`,
          type: 'urgent',
          timestamp: `Today, 09:05 AM`
        });
      }
    } else if (currentStaff.tasks.length > 0) {
      // Good job message if all tasks are done
      generatedMsgs.push({
        id: 'msg-3',
        sender: 'Automated System',
        subject: 'All Tasks Completed!',
        body: `Great job! You have 0 pending tasks. Check back later to see if new work has been assigned by the Admin.`,
        type: 'info',
        timestamp: `Today, 08:30 AM`
      });
    }

    setMessages(generatedMsgs);
  }, []);

  if (!member) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Inbox</h1>
          <p className={styles.subtitle}>Automated alerts and task reminders</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <Mailbox size={18} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: 8 }} /> No messages or alerts at this time.
        </div>
      ) : (
        <div className={styles.messageList}>
          {messages.map((msg) => (
            <div key={msg.id} className={`glass-panel ${styles.messageCard} ${styles[msg.type]}`}>
              <div className={styles.iconBox}>
                {msg.type === 'urgent' ? <AlertOctagon size={20} strokeWidth={1.75} /> : msg.type === 'warning' ? <AlertTriangle size={20} strokeWidth={1.75} /> : <Info size={20} strokeWidth={1.75} />}
              </div>
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>{msg.sender}</span>
                  <span className={styles.timestamp}>{msg.timestamp}</span>
                </div>
                <div className={styles.subject}>{msg.subject}</div>
                <div className={styles.body}>{msg.body}</div>
                {msg.type !== 'info' && (
                  <div style={{ marginTop: '1rem' }}>
                    <Link href="/staff-dashboard" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                      Go to Tasks →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
