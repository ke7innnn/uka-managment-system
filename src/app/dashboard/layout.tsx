'use client';

import { useState } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Sidebar from '@/components/Sidebar';
import AdminAssistantChat from '@/components/AdminAssistantChat';
import WorkspaceChatWidget from '@/components/WorkspaceChatWidget';
import SupabaseConnectionWarning from '@/components/SupabaseConnectionWarning';
import { Menu } from 'lucide-react';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

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
          <span className={styles.mobileBrandText}>UKA Admin</span>
        </div>
        <div style={{ width: 36 }} /> {/* Visual spacer balancing menu button */}
      </header>

      {/* Dimmed backdrop overlay closing drawer when tapped */}
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={closeSidebar} />
      )}

      {/* Mobile sliding Sidebar drawer */}
      <div className={`${styles.mobileSidebarDrawer} ${sidebarOpen ? styles.mobileSidebarOpen : ''}`}>
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* PC default sidebar layout */}
      <div className={styles.sidebarDesktop}>
        <Sidebar />
      </div>

      <main className={styles.main}>
        <SupabaseConnectionWarning />
        {children}
      </main>

      <AdminAssistantChat />
      <WorkspaceChatWidget />
    </div>
  );
}
