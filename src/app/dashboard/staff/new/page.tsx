'use client';

import Link from 'next/link';
import StaffForm from '@/components/StaffForm';
import styles from './page.module.css';

export default function NewStaffPage() {
  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <Link href="/dashboard/staff" className={styles.back}>← Back to Staff</Link>
      <div className={styles.header}>
        <h1 className={styles.title}>Add Staff Member</h1>
        <p className={styles.subtitle}>Register a new team member for monitoring</p>
      </div>
      <StaffForm mode="new" />
    </div>
  );
}
