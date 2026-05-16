'use client';

import Link from 'next/link';
import ClientForm from '@/components/ClientForm';
import styles from './page.module.css';

export default function NewClientPage() {
  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <Link href="/dashboard/clients" className={styles.back}>← Back to Clients</Link>
      <div className={styles.header}>
        <h1 className={styles.title}>New Client</h1>
        <p className={styles.subtitle}>Add a new client to your CRM</p>
      </div>
      <ClientForm mode="new" />
    </div>
  );
}
