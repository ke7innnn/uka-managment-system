'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getClients, Client } from '@/lib/store';
import { FileText } from 'lucide-react';
import styles from './page.module.css';

const STATUS_COLORS: Record<Client['projectStatus'], string> = {
  active: '#10b981',
  completed: '#3b82f6',
  'on-hold': '#f59e0b',
  pending: '#9ca3af',
};

function ProjectsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status'); // 'active', 'completed', etc.

  useEffect(() => {
    setClients(getClients());
  }, []);

  const withProjects = clients.filter((c) => {
    const hasProject = c.projectName || c.phases.length > 0;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.projectName || '').toLowerCase().includes(search.toLowerCase()) ||
                        (c.clientUin || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? c.projectStatus === statusFilter : true;
    return hasProject && matchSearch && matchStatus;
  });

  // Sort active projects on top
  const sortedProjects = [...withProjects].sort((a, b) => {
    if (a.projectStatus === 'active' && b.projectStatus !== 'active') return -1;
    if (a.projectStatus !== 'active' && b.projectStatus === 'active') return 1;
    return 0;
  });

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {statusFilter ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Projects` : 'Projects'}
          </h1>
          <p className={styles.subtitle}>
            {statusFilter ? `Viewing only ${statusFilter} projects` : 'Track phase progress across all clients'}
          </p>
        </div>
        <Link href="/dashboard/clients/new" className={styles.newBtn}>+ New Client</Link>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by client, project name, or UIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        {statusFilter && (
          <Link 
            href="/dashboard/projects" 
            style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent)', 
              textDecoration: 'none',
              background: 'rgba(200, 169, 110, 0.08)',
              border: '1px solid rgba(200, 169, 110, 0.2)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(200, 169, 110, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(200, 169, 110, 0.08)'}
          >
            Clear Filter (Show All)
          </Link>
        )}
      </div>

      {sortedProjects.length === 0 ? (
        <div className={styles.empty}>
          No {statusFilter ? `${statusFilter} ` : ''}projects found.{' '}
          <Link href="/dashboard/clients/new">Create a client →</Link>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {sortedProjects.map((client) => {
            const allTasks = client.phases.flatMap(p => p.tasks || []);
            const doneTasks = allTasks.filter(t => t.completed).length;
            const totalTasks = allTasks.length;
            const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            return (
              <Link key={client.id} href={`/dashboard/clients/${client.id}?tab=phases`} className={`glass-panel ${styles.projectCard}`}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {client.clientUin && (
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: 'var(--accent)',
                      backgroundColor: 'rgba(200, 169, 110, 0.08)',
                      border: '1px solid rgba(200, 169, 110, 0.2)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      width: 'fit-content',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      UIN: {client.clientUin}
                    </div>
                  )}
                  {client.tilrStatus === 'received' ? (
                    <span className="tilr-received-badge" style={{ padding: '3px 8px', fontSize: '0.65rem' }}>TILR RECEIVED</span>
                  ) : (
                    <span className="tilr-pending-badge" style={{ padding: '3px 8px', fontSize: '0.65rem' }}>TILR PENDING</span>
                  )}
                  <span className={`priority-badge-${client.priority || 'medium'}`} style={{ padding: '3px 8px', fontSize: '0.65rem' }}>{(client.priority || 'medium').toUpperCase()}</span>
                </div>
                <div className={styles.cardTopHeader}>
                  <div className={styles.projAvatarCircle}>{client.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.projCardInfo}>
                    <h2 className={styles.projNameText}>{client.projectName || 'Unnamed Project'}</h2>
                    <p className={styles.projClientNameText}>
                      {client.name}
                      {client.clientId && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '0.4rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.4rem' }}>
                          ID: {client.clientId}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={styles.projStatusBadge}
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

                <div className={styles.projCardFooter}>
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

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Loading projects...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}

