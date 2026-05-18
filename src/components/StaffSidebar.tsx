'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutStaff, getStaff, isStaffAuthenticated, getStaffById, StaffMember, getUnreadWorkspaceCount } from '@/lib/store';
import styles from '@/components/Sidebar.module.css';
import { CheckCircle2, FolderKanban, Bell, AlertTriangle, User, LogOut, MessageSquare } from 'lucide-react';

const NAV = [
  { href: '/staff-dashboard',                label: 'My Tasks & Attendance', Icon: CheckCircle2  },
  { href: '/staff-dashboard/projects',       label: 'Client Projects',       Icon: FolderKanban  },
  { href: '/staff-dashboard/inbox',          label: 'My Inbox',              Icon: Bell          },
  { href: '/staff-dashboard/workspace',      label: 'Workspace',             Icon: MessageSquare },
  { href: '/staff-dashboard/wall-of-shame',  label: 'Performance Alerts',    Icon: AlertTriangle },
  { href: '/staff-dashboard/profile',        label: 'My Profile',            Icon: User          },
];

export default function StaffSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [inboxCount, setInboxCount] = useState(0);
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [member, setMember] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const staffId = isStaffAuthenticated();
    if (!staffId) return;
    const allStaff = getStaff();
    const currentStaff = allStaff.find(s => s.id === staffId);
    if (!currentStaff) return;
    setMember(currentStaff);

    const pendingTasks = currentStaff.tasks.filter(t => !t.completed).length;
    let count = 0;
    if (pendingTasks > 0) count += 1;
    if (pendingTasks >= 3) count += 1;
    setInboxCount(count);

    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (count > 0) {
        // @ts-ignore
        navigator.setAppBadge(count).catch(console.error);
      } else {
        // @ts-ignore
        navigator.clearAppBadge().catch(console.error);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const staffId = isStaffAuthenticated();
    if (!staffId) return;

    const updateCount = () => {
      setWorkspaceCount(getUnreadWorkspaceCount(staffId));
    };

    updateCount();
    window.addEventListener('uka-workspace-sync-complete', updateCount);
    window.addEventListener('uka-workspace-read-complete', updateCount);

    const interval = setInterval(updateCount, 5000);
    return () => {
      window.removeEventListener('uka-workspace-sync-complete', updateCount);
      window.removeEventListener('uka-workspace-read-complete', updateCount);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = () => { logoutStaff(); router.push('/'); };

  return (
    <div className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.logo}>
        <img
          src="/icon.png"
          alt="UKA Logo"
          className={styles.logoBox}
          style={{ objectFit: 'cover', background: 'transparent', boxShadow: 'none' }}
        />
        <span className={styles.logoText}>UKA</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`${styles.navItem} ${pathname === href ? styles.active : ''}`}
          >
            <span className={styles.navIcon}><Icon size={18} strokeWidth={1.75} /></span>
            <span className={styles.navLabel} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span>{label}</span>
              {href === '/staff-dashboard/inbox' && inboxCount > 0 && (
                <span className={styles.navBadge} style={{ marginLeft: 'auto' }}>{inboxCount}</span>
              )}
              {label === 'Workspace' && workspaceCount > 0 && (
                <span className={styles.navBadge} style={{ marginLeft: 'auto' }}>{workspaceCount}</span>
              )}
            </span>
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.navIcon}><LogOut size={18} strokeWidth={1.75} /></span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
