'use client';

import { useState } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';
import { Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      {/* Mobile Top Header (only visible on small screens) */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className={styles.mobileBrand}>
          <div className={styles.mobileLogoBox}>U</div>
          <span>UKA</span>
        </div>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Wrapper */}
      <div className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
