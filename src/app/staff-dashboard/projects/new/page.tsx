'use client';

import Link from 'next/link';
import ClientForm from '@/components/ClientForm';
import styles from '@/app/dashboard/clients/new/page.module.css';

export default function StaffNewClientPage() {
  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <Link href="/staff-dashboard/projects" className={styles.back}>← Back to Projects</Link>
      <div className={styles.header}>
        <h1 className={styles.title}>New Client</h1>
        <p className={styles.subtitle}>Add a new client to your CRM</p>
      </div>
      <ClientForm mode="new" successRedirect="/staff-dashboard/projects" />
    </div>
  );
}
