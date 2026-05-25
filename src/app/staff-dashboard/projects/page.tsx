'use client';

import { useEffect, useState, useRef } from 'react';
import { getClients, Client } from '@/lib/store';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import styles from '@/app/dashboard/projects/page.module.css';

export default function StaffProjectsPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => { 
    setClients(getClients()); 
  }, []);

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Client Projects</h1>
        <p className={styles.subtitle}>Select a project to view or upload documents.</p>
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
            
            <Link 
              href={`/staff-dashboard/projects/${client.id}`}
              style={{ textDecoration: 'none', background: 'var(--accent-bg)', color: 'var(--accent-light)', border: '1px solid var(--border-active)', padding: '0.75rem 1rem', borderRadius: '10px', width: '100%', cursor: 'pointer', fontWeight: 600, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }}
            >
              <FileText size={16} /> View Project
            </Link>
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
