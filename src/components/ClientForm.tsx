'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Client, addClient, updateClient } from '@/lib/store';
import styles from './ClientForm.module.css';

type FormData = {
  name: string;
  clientId: string;
  company: string;
  email: string;
  phone: string;
  place: string;
  address: string;
  notes: string;
  tags: string;
  projectName: string;
  projectStatus: Client['projectStatus'];
  priority: 'low' | 'medium' | 'high';
};

interface Props {
  client?: Client;
  mode: 'new' | 'edit';
}

export default function ClientForm({ client, mode }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: client?.name || '',
    clientId: client?.clientId || '',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    place: client?.place || '',
    address: client?.address || '',
    notes: client?.notes || '',
    tags: client?.tags?.join(', ') || '',
    projectName: client?.projectName || '',
    projectStatus: client?.projectStatus || 'pending',
    priority: client?.priority || 'medium',
  });
  const [error, setError] = useState('');

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Client name is required.'); return; }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (mode === 'new') {
      addClient({
        name: form.name.trim(),
        clientId: form.clientId.trim() || undefined,
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        place: form.place.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags,
        projectName: form.projectName.trim() || undefined,
        projectStatus: form.projectStatus,
        priority: form.priority,
        phases: [],
        documents: [],
      });
      router.push('/dashboard/clients');
    } else {
      updateClient(client!.id, {
        name: form.name.trim(),
        clientId: form.clientId.trim() || undefined,
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        place: form.place.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags,
        projectName: form.projectName.trim() || undefined,
        projectStatus: form.projectStatus,
        priority: form.priority,
      });
      router.push(`/dashboard/clients/${client!.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <Section title="Personal Information">
        <div className={styles.grid}>
          <Field label="Full Name *" id="name" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Rahul Sharma" />
          <Field label="Client ID" id="clientId" value={form.clientId} onChange={(v) => set('clientId', v)} placeholder="e.g. UKA-101" />
          <Field label="Company / Brand" id="company" value={form.company} onChange={(v) => set('company', v)} placeholder="e.g. Ktech Studios" />
          <Field label="Email" id="email" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="rahul@example.com" />
          <Field label="Phone" id="phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+91 98765 43210" />
          <Field label="City / Place" id="place" value={form.place} onChange={(v) => set('place', v)} placeholder="Mumbai" />
          <Field label="Full Address" id="address" value={form.address} onChange={(v) => set('address', v)} placeholder="Street, City, State…" />
        </div>
      </Section>

      <Section title="Project Details">
        <div className={styles.grid}>
          <Field label="Project Name" id="projectName" value={form.projectName} onChange={(v) => set('projectName', v)} placeholder="e.g. Brand Identity 2024" />
          <div className={styles.fieldGroup}>
            <label htmlFor="projectStatus" className={styles.label}>Project Status</label>
            <select
              id="projectStatus"
              value={form.projectStatus}
              onChange={(e) => set('projectStatus', e.target.value as Client['projectStatus'])}
              className={styles.select}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="priority" className={styles.label}>Project Priority</label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as FormData['priority'])}
              className={styles.select}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>
        <Field label="Tags (comma-separated)" id="tags" value={form.tags} onChange={(v) => set('tags', v)} placeholder="photography, branding, video" />
      </Section>

      <Section title="Notes">
        <div className={styles.fieldGroup}>
          <label htmlFor="notes" className={styles.label}>Internal Notes</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional notes about this client…"
            rows={4}
            className={styles.textarea}
          />
        </div>
      </Section>

      <div className={styles.actions}>
        <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" className={styles.submitBtn}>
          {mode === 'new' ? '+ Create Client' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, id, value, onChange, placeholder, type = 'text',
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
}
