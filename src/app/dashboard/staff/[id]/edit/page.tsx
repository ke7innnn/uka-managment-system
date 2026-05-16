'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStaffById, StaffMember } from '@/lib/store';
import StaffForm from '@/components/StaffForm';
import styles from './page.module.css';

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<StaffMember | null>(null);

  useEffect(() => {
    const m = getStaffById(params.id);
    if (!m) { router.replace('/dashboard/staff'); return; }
    setMember(m);
  }, [params.id]);

  if (!member) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <Link href={`/dashboard/staff/${member.id}`} className={styles.back}>← Back to {member.name}</Link>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit — {member.name}</h1>
        <p className={styles.subtitle}>Update staff member information</p>
      </div>
      <StaffForm member={member} mode="edit" />
    </div>
  );
}
