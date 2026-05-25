'use client';

import { useEffect, useState } from 'react';
import { getClients, Client } from '@/lib/store';
import Link from 'next/link';
import { FileText, Plus, Pencil } from 'lucide-react';
import styles from '@/app/dashboard/projects/page.module.css';

export default function StaffProjectsPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setClients(getClients());
    window.addEventListener('uka-sync-complete', () => setClients(getClients()));
    return () => window.removeEventListener('uka-sync-complete', () => setClients(getClients()));
  }, []);

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Client Projects</h1>
          <p className={styles.subtitle}>Select a project to view or upload documents.</p>
        </div>
        <Link
          href="/staff-dashboard/projects/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--accent)',
            color: '#000',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <Plus size={16} /> New Client
        </Link>
      </div>

      <div className={styles.projectGrid}>
        {clients.map((client) => (
          <div key={client.id} className={`glass-panel ${styles.projectCard}`}>
            <div className={styles.cardTopHeader}>
              <div className={styles.projAvatarCircle}>{client.name.charAt(0).toUpperCase()}</div>
              <div className={styles.projCardInfo}>
                <h2 className={styles.projNameText}>{client.projectName || 'General Project'}</h2>
                <p className={styles.projClientNameText}>
                  {client.name}
                  {client.clientId && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '0.4rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.4rem' }}>
                      ID: {client.clientId}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Action buttons — view + edit only (no delete) */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', width: '100%' }}>
              <Link
                href={`/staff-dashboard/projects/${client.id}`}
                style={{ flex: 1, textDecoration: 'none', background: 'var(--accent-bg)', color: 'var(--accent-light)', border: '1px solid var(--border-active)', padding: '0.65rem 0.75rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s ease', fontSize: '0.85rem' }}
              >
                <FileText size={14} /> View
              </Link>
              <Link
                href={`/staff-dashboard/projects/${client.id}/edit`}
                style={{ flex: 1, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.65rem 0.75rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s ease', fontSize: '0.85rem' }}
              >
                <Pencil size={14} /> Edit
              </Link>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
            No clients or projects available.
          </div>
        )}
      </div>
    </div>
  );
}
