'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClients, Client } from '@/lib/store';
import { FileText } from 'lucide-react';
import styles from './page.module.css';

const STATUS_COLORS: Record<Client['projectStatus'], string> = {
  active: '#10b981',
  completed: '#3b82f6',
  'on-hold': '#f59e0b',
  pending: '#9ca3af',
};

export default function ProjectsPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setClients(getClients());
  }, []);

  const withProjects = clients.filter((c) => c.projectName || c.phases.length > 0);

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>Track phase progress across all clients</p>
        </div>
        <Link href="/dashboard/clients/new" className={styles.newBtn}>+ New Client</Link>
      </div>

      {withProjects.length === 0 ? (
        <div className={styles.empty}>
          No projects with phases yet.{' '}
          <Link href="/dashboard/clients/new">Create a client →</Link>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {withProjects.map((client) => {
            const allTasks = client.phases.flatMap(p => p.tasks || []);
            const doneTasks = allTasks.filter(t => t.completed).length;
            const totalTasks = allTasks.length;
            const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            return (
              <Link key={client.id} href={`/dashboard/clients/${client.id}?tab=phases`} className={`glass-panel ${styles.projectCard}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardAvatar}>{client.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.cardInfo}>
                    <h2 className={styles.cardProjectName}>{client.projectName || 'Unnamed Project'}</h2>
                    <p className={styles.cardClientName}>{client.name}</p>
                  </div>
                  <span
                    className={styles.cardBadge}
                    style={{
                      background: `${STATUS_COLORS[client.projectStatus]}22`,
                      color: STATUS_COLORS[client.projectStatus],
                      border: `1px solid ${STATUS_COLORS[client.projectStatus]}44`,
                    }}
                  >
                    {client.projectStatus.replace('-', ' ')}
                  </span>
                </div>

                {/* Progress */}
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.progressPct}>{pct}%</span>
                </div>

                {/* Phases */}
                {client.phases.length > 0 ? (
                  <div className={styles.phasesRow}>
                    {client.phases.map((phase) => (
                      <div
                        key={phase.id}
                        className={`${styles.phaseChip} ${(phase.status === 'completed' || phase.completed) ? styles.phaseChipDone : ''}`}
                        title={phase.name}
                      >
                        <span className={styles.phaseChipDot} />
                        {phase.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noPhases}>No phases added</p>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.docCount} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><FileText size={13} strokeWidth={1.5} />{client.documents.length} doc{client.documents.length !== 1 ? 's' : ''}</span>
                  <span className={styles.viewLink}>View Details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
