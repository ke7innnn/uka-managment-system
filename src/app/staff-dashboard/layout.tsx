'use client';

import useStaffGuard from '@/hooks/useStaffGuard';
import StaffSidebar from '@/components/StaffSidebar';

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const authorized = useStaffGuard();

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <StaffSidebar />
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', marginLeft: '240px' }}>
        {children}
      </main>
    </div>
  );
}
