'use client';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import Sidebar from '@/components/Sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard();

  return (
    <div className={styles.wrapper}>
      <div className={styles.sidebarDesktop}>
        <Sidebar />
      </div>
      <main className={styles.main}>{children}</main>
      <MobileBottomNav />
    </div>
  );
}
