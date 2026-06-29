'use client';

import { useEffect, useState } from 'react';
import { getStaffById, isStaffAuthenticated, updateStaffMember, StaffMember, logoutStaff } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Briefcase, Building2, Phone, CalendarDays, Upload, Shield } from 'lucide-react';
import styles from '@/app/dashboard/staff/[id]/page.module.css';

export default function StaffProfilePage() {
  const [member, setMember] = useState<StaffMember | null>(null);
  const router = useRouter();

  const reload = () => {
    const id = isStaffAuthenticated();
    if (id) {
      const m = getStaffById(id);
      if (m) setMember(m);
    }
  };

  useEffect(() => { 
    reload();
    window.addEventListener('uka-sync-complete', reload);
    return () => window.removeEventListener('uka-sync-complete', reload);
  }, []);

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
          // Upload compressed blob to Supabase Storage
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const path = `profiles/${member.id}/avatar.jpg`;
            const { error } = await supabase.storage.from('uka-storage').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (error) { alert('Upload failed: ' + error.message); return; }
            // Add cache-buster so img tag actually re-fetches
            const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
            const urlWithBust = `${publicUrl}?t=${Date.now()}`;
            updateStaffMember(member.id, { profilePicture: urlWithBust });
            reload();
          }, 'image/jpeg', 0.85);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  if (!member) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className={styles.header} style={{ marginBottom: '2rem' }}>
        <h1 className={styles.title}>My Profile</h1>
      </div>

      <div className={`glass-panel`} style={{ position: 'relative', overflow: 'hidden', padding: 0, marginBottom: '2rem' }}>
        {/* Banner */}
        <div style={{ height: '140px', background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(6,182,212,0.1) 100%)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
        </div>
        
        {/* Profile Content */}
        <div style={{ padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-50px', position: 'relative', zIndex: 10 }}>
          <div style={{ position: 'relative', cursor: 'pointer', marginBottom: '1.25rem', borderRadius: '50%', padding: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} onClick={() => document.getElementById('pfp-upload')?.click()}>
            {member.profilePicture ? (
              <img src={member.profilePicture} alt={member.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', transition: 'opacity 0.2s', display: 'block' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent)', borderRadius: '50%', padding: '6px', border: '2px solid var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
              <Upload size={14} strokeWidth={2.5} />
            </div>
            <input type="file" id="pfp-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>
          
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem', textAlign: 'center' }}>{member.name}</h2>
          <p style={{ fontSize: '1rem', color: 'var(--accent-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
            <Shield size={16} /> Staff Member
          </p>
        </div>
      </div>

      <div className={`glass-panel`} style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Personal Details</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow icon={User} label="Full Name" value={member.name} />
          <InfoRow icon={Briefcase} label="Role" value={member.role} />
          <InfoRow icon={Building2} label="Department" value={member.department} />
          <InfoRow icon={Phone} label="Phone Number (Password)" value={member.password || member.phone} isMasked={true} />
          <InfoRow icon={CalendarDays} label="Joined Date" value={new Date(member.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </div>
      </div>
      
      <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <button 
          onClick={() => { logoutStaff(); router.push('/'); }}
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log Out
        </button>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Shield size={14} /> Need to update your details? Please contact the Admin.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, isMasked }: { icon: any; label: string; value?: string; isMasked?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-bg)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, marginBottom: '0.2rem', fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0, fontWeight: 500, fontFamily: isMasked ? 'monospace' : 'inherit', letterSpacing: isMasked ? '1px' : 'normal' }}>
          {value || <span style={{ opacity: 0.4 }}>—</span>}
        </p>
      </div>
    </div>
  );
}
