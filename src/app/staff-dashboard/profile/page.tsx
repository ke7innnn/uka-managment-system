'use client';

import { useEffect, useState } from 'react';
import { getStaffById, isStaffAuthenticated, updateStaffMember, StaffMember } from '@/lib/store';
import styles from '@/app/dashboard/staff/[id]/page.module.css';

export default function StaffProfilePage() {
  const [member, setMember] = useState<StaffMember | null>(null);

  const reload = () => {
    const id = isStaffAuthenticated();
    if (id) {
      const m = getStaffById(id);
      if (m) setMember(m);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && member) {
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
          try {
            updateStaffMember(member.id, { profilePicture: dataUrl });
            reload(); // refresh to show updated image
          } catch (err) {
            alert('Error saving image. It may be too large.');
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    // reset input so same file can be selected again
    e.target.value = '';
  };

  if (!member) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className={styles.header} style={{ marginBottom: '2rem' }}>
        <h1 className={styles.title}>My Profile</h1>
      </div>

      <div className={`glass-panel ${styles.hero}`} style={{ marginBottom: '2rem' }}>
        <div className={styles.heroLeft}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('pfp-upload')?.click()}>
            {member.profilePicture ? (
              <img src={member.profilePicture} alt={member.name} className={styles.heroAvatar} style={{ objectFit: 'cover', transition: 'opacity 0.2s' }} />
            ) : (
              <div className={styles.heroAvatar} style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--accent)', borderRadius: '50%', padding: '4px', border: '2px solid var(--bg-elevated)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <input type="file" id="pfp-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroName}>{member.name}</h2>
            <p className={styles.heroRole}>{member.role} {member.department ? `· ${member.department}` : ''}</p>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
        Personal Details
      </h3>

      <div className={styles.infoGrid}>
        <InfoBox label="Full Name" value={member.name} />
        <InfoBox label="Role" value={member.role} />
        <InfoBox label="Department" value={member.department} />
        <InfoBox label="Phone Number (Password)" value={member.password || member.phone} />
        <InfoBox label="Joined Date" value={new Date(member.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </div>
      
      <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Need to update your details? Please contact the Admin.
      </p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className={styles.infoBox}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoVal}>{value || <span style={{ opacity: 0.4 }}>—</span>}</span>
    </div>
  );
}
