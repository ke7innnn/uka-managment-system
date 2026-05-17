'use client';

import { useState } from 'react';
import useStaffGuard from '@/hooks/useStaffGuard';
import StaffSidebar from '@/components/StaffSidebar';
import styles from '@/app/dashboard/layout.module.css';
import { Menu, X } from 'lucide-react';

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const authorized = useStaffGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authorized) return null;

  return (
    <div className={styles.wrapper}>
      {/* Mobile Top Header (only visible on small screens) */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className={styles.mobileBrand}>
          <div className={styles.mobileLogoBox}>U</div>
          <span>UKA STAFF</span>
        </div>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Wrapper */}
      <div className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <StaffSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
