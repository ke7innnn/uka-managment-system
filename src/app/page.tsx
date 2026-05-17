'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { getStaff } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const loginId = id.trim();
    const loginPass = password.trim();

    // 1. Check Admin (hardcoded — always works)
    if (loginId === 'boss@uka' && loginPass === 'password@uka') {
      localStorage.setItem('uka_admin_auth', 'true');
      router.push('/dashboard');
      return;
    }

    // 2. Check Staff from localStorage (fast path — already synced)
    const localStaff = getStaff();
    const localMatch = localStaff.find(
      (s) => s.name.toLowerCase() === loginId.toLowerCase() && s.password === loginPass
    );
    if (localMatch) {
      localStorage.setItem('uka_staff_auth', localMatch.id);
      router.push('/staff-dashboard');
      return;
    }

    // 3. Fallback: authenticate directly against Supabase
    // This runs on new devices / phones where localStorage is still empty
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error: dbErr } = await supabase
          .from('staff')
          .select('id, name, password, role, phone, email, department, joined_at, total_tasks_target, work_deadline, notes, profile_picture')
          .ilike('name', loginId)
          .eq('password', loginPass)
          .maybeSingle();

        if (!dbErr && data) {
          // Seed this staff member into localStorage for future fast logins
          const existing = getStaff();
          if (!existing.find(s => s.id === data.id)) {
            const seeded = [...existing, {
              id: data.id, name: data.name, role: data.role,
              password: data.password || '', email: data.email || '',
              phone: data.phone || '', department: data.department || '',
              joinedAt: data.joined_at, totalTasksTarget: data.total_tasks_target || 0,
              workDeadline: data.work_deadline, notes: data.notes || '',
              profilePicture: data.profile_picture || '', tasks: [], attendance: []
            }];
            localStorage.setItem('uka_staff', JSON.stringify(seeded));
          }
          localStorage.setItem('uka_staff_auth', data.id);
          router.push('/staff-dashboard');
          return;
        }
      }
    } catch (err) {
      console.error('Supabase login fallback error:', err);
    }

    // 4. Fail
    setLoading(false);
    setError('Invalid credentials. Please try again.');
  };


  return (
    <div className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.loginBox}`}>
        <div className={styles.logoContainer}>
          <h1 className={styles.logo}>UKA</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="id">Login ID</label>
            <input
              type="text"
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Enter your login ID"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
      
      <div className={styles.bgDecoration1}></div>
      <div className={styles.bgDecoration2}></div>
    </div>
  );
}
