'use client';

import useStaffGuard from '@/hooks/useStaffGuard';
import StaffSidebar from '@/components/StaffSidebar';
import StaffMobileBottomNav from '@/components/StaffMobileBottomNav';
import styles from '@/app/dashboard/layout.module.css';

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const authorized = useStaffGuard();

  if (!authorized) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.sidebarDesktop}>
        <StaffSidebar />
      </div>
      <main className={styles.main}>{children}</main>
      <StaffMobileBottomNav />
    </div>
  );
}
