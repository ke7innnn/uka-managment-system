'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

import { getStaff } from '@/lib/store';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = id.trim();
    const loginPass = password.trim();

    // 1. Check Admin
    if (loginId === 'boss@uka' && loginPass === 'password@uka') {
      localStorage.setItem('uka_admin_auth', 'true');
      router.push('/dashboard');
      return;
    }

    // 2. Check Staff
    const staffList = getStaff();
    const staffMatch = staffList.find(
      (s) => s.name.toLowerCase() === loginId.toLowerCase() && s.password === loginPass
    );

    if (staffMatch) {
      localStorage.setItem('uka_staff_auth', staffMatch.id);
      router.push('/staff-dashboard');
      return;
    }

    // 3. Fail
    setError('Invalid credentials. Please try again.');
  };

  return (
    <div className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.loginBox}`}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>UKA</div>
          <h1 className={styles.title}>Management System</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="id">Login ID (Admin Email or Staff Name)</label>
            <input
              type="text"
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="boss@uka or Vrushali Thakur"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password (Admin Pass or Phone No)</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className={styles.submitBtn}>
            Sign In
          </button>
        </form>
      </div>
      
      <div className={styles.bgDecoration1}></div>
      <div className={styles.bgDecoration2}></div>
    </div>
  );
}
