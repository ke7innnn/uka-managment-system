'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientById, Client } from '@/lib/store';
import ClientForm from '@/components/ClientForm';
import styles from './page.module.css';

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const c = getClientById(params.id);
    if (!c) { router.replace('/dashboard/clients'); return; }
    setClient(c);
  }, [params.id]);

  if (!client) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <Link href={`/dashboard/clients/${client.id}`} className={styles.back}>← Back to Client</Link>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit — {client.name}</h1>
        <p className={styles.subtitle}>Update client information</p>
      </div>
      <ClientForm client={client} mode="edit" />
    </div>
  );
}
