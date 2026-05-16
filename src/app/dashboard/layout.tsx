'use client';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
