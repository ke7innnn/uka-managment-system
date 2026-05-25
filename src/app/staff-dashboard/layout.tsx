'use client';

import { useState } from 'react';
import useStaffGuard from '@/hooks/useStaffGuard';
import StaffSidebar from '@/components/StaffSidebar';
import WorkspaceChatWidget from '@/components/WorkspaceChatWidget';
import { Menu } from 'lucide-react';
import styles from '@/app/dashboard/layout.module.css';

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const authorized = useStaffGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  if (!authorized) return null;

  return (
    <div className={styles.wrapper}>
      {/* Mobile Top Header App Bar */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.menuButton} 
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} strokeWidth={2.25} />
        </button>
        <div className={styles.mobileHeaderBrand}>
          <img
            src="/icon.png"
            alt="UKA Logo"
            className={styles.mobileLogo}
          />
          <span className={styles.mobileBrandText}>UKA Staff</span>
        </div>
        <div style={{ width: 36 }} /> {/* Visual spacer balancing menu button */}
      </header>

      {/* Dimmed backdrop overlay closing drawer when tapped */}
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={closeSidebar} />
      )}

      {/* Mobile sliding Sidebar drawer */}
      <div className={`${styles.mobileSidebarDrawer} ${sidebarOpen ? styles.mobileSidebarOpen : ''}`}>
        <StaffSidebar onClose={closeSidebar} />
      </div>

      {/* PC default sidebar layout */}
      <div className={styles.sidebarDesktop}>
        <StaffSidebar />
      </div>

      <main className={styles.main}>{children}</main>

      <WorkspaceChatWidget />
    </div>
  );
}
