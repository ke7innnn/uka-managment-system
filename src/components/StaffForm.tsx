'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StaffMember, addStaffMember, updateStaffMember } from '@/lib/store';
import styles from './StaffForm.module.css';

type FormData = {
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  totalTasksTarget: string;
  workDeadline: string;
  notes: string;
  profilePicture: string;
};

interface Props {
  member?: StaffMember;
  mode: 'new' | 'edit';
}

export default function StaffForm({ member, mode }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name:             member?.name || '',
    role:             member?.role || '',
    email:            member?.email || '',
    phone:            member?.phone || '',
    department:       member?.department || '',
    totalTasksTarget: String(member?.totalTasksTarget ?? 10),
    workDeadline:     member?.workDeadline ? member.workDeadline.split('T')[0] : '',
    notes:            member?.notes || '',
    profilePicture:   member?.profilePicture || '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.role.trim()) { setError('Role is required.'); return; }

    const target = parseInt(form.totalTasksTarget) || 1;

    if (mode === 'new') {
      addStaffMember({
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.phone.trim() || undefined,
        department: form.department.trim() || undefined,
        totalTasksTarget: target,
        workDeadline: form.workDeadline || undefined,
        notes: form.notes.trim() || undefined,
        profilePicture: form.profilePicture || undefined,
        tasks: [],
        attendance: [],
      });
      router.push('/dashboard/staff');
    } else {
      updateStaffMember(member!.id, {
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || undefined,
        totalTasksTarget: target,
        workDeadline: form.workDeadline || undefined,
        notes: form.notes.trim() || undefined,
        profilePicture: form.profilePicture || undefined,
      });
      router.push(`/dashboard/staff/${member!.id}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) { height *= maxSize / width; width = maxSize; }
          } else {
            if (height > maxSize) { width *= maxSize / height; height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          set('profilePicture', dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <Section title="Personal Info">
        <div className={styles.grid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Profile Picture</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {form.profilePicture ? (
                <img src={form.profilePicture} alt="Profile Preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-hover)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Image</div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <Field id="name"       label="Full Name *"   value={form.name}       onChange={v => set('name', v)}       placeholder="e.g. Priya Sharma" />
          <Field id="role"       label="Role / Title *" value={form.role}      onChange={v => set('role', v)}       placeholder="e.g. Video Editor" />
          <Field id="department" label="Department"    value={form.department}  onChange={v => set('department', v)} placeholder="e.g. Production" />
          <Field id="email"      label="Email"         value={form.email}       onChange={v => set('email', v)}     type="email" placeholder="priya@uka.com" />
          <Field id="phone"      label="Phone"         value={form.phone}       onChange={v => set('phone', v)}     type="tel" placeholder="9876543210" />
        </div>
      </Section>

      <Section title="Work Settings">
        <div className={styles.grid}>
          <Field
            id="totalTasksTarget"
            label="Total Tasks Target"
            value={form.totalTasksTarget}
            onChange={v => set('totalTasksTarget', v)}
            type="number"
            placeholder="e.g. 65"
          />
          <div className={styles.fieldGroup}>
            <label htmlFor="workDeadline" className={styles.label}>Overall Work Deadline</label>
            <input
              type="date"
              id="workDeadline"
              value={form.workDeadline}
              onChange={e => set('workDeadline', e.target.value)}
              className={styles.input}
            />
          </div>
        </div>
      </Section>

      <Section title="Notes">
        <div className={styles.fieldGroup}>
          <label htmlFor="notes" className={styles.label}>Internal Notes</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any notes about this staff member…"
            rows={3}
            className={styles.textarea}
          />
        </div>
      </Section>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>Cancel</button>
        <button type="submit" className={styles.submitBtn}>
          {mode === 'new' ? '+ Add Staff Member' : 'Save Changes'}
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

function Field({ label, id, value, onChange, placeholder, type = 'text' }: {
  label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input type={type} id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={styles.input} />
    </div>
  );
}
