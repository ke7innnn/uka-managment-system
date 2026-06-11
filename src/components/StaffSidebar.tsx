'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutStaff, getStaff, isStaffAuthenticated, getStaffById, StaffMember, getUnreadWorkspaceCount, getUnreadAlertsCount } from '@/lib/store';
import styles from '@/components/Sidebar.module.css';
import { CheckCircle2, FolderKanban, Bell, AlertTriangle, User, LogOut, MessageSquare, Sun, Moon, X, Receipt } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

const NAV = [
  { href: '/staff-dashboard',                        label: 'My Tasks',              Icon: CheckCircle2  },
  { href: '/staff-dashboard/projects',               label: 'Client Projects',       Icon: FolderKanban  },
  { href: '/staff-dashboard/billing',                label: 'Billing',               Icon: Receipt       },
  { href: '/staff-dashboard/inbox',                  label: 'My Inbox',              Icon: Bell          },
  { href: '/staff-dashboard/workspace',              label: 'Workspace',             Icon: MessageSquare },
  { href: '/staff-dashboard/performance-alerts',     label: 'Performance Alerts',    Icon: AlertTriangle },
  { href: '/staff-dashboard/profile',                label: 'My Profile',            Icon: User          },
];

export default function StaffSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [inboxCount, setInboxCount] = useState(0);
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [member, setMember] = useState<StaffMember | null>(null);
  const [theme, setTheme] = useState<string>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('uka_theme') || 'dark';
    setTheme(savedTheme);
  }, []);

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
    setAlertsCount(getUnreadAlertsCount(currentStaff.name));

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
      const allStaff = getStaff();
      const currentStaff = allStaff.find(s => s.id === staffId);
      if (currentStaff) {
        setAlertsCount(getUnreadAlertsCount(currentStaff.name));
      }
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
      {/* Mobile Close Button */}
      {onClose && (
        <button className={styles.closeMobileDrawer} onClick={onClose} aria-label="Close menu">
          <X size={18} strokeWidth={2.5} />
        </button>
      )}

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
              {label === 'My Inbox' && inboxCount > 0 && (
                <span className={styles.navBadge} style={{ marginLeft: 'auto' }}>{inboxCount}</span>
              )}
              {label === 'Workspace' && workspaceCount > 0 && (
                <span className={styles.navBadge} style={{ marginLeft: 'auto' }}>{workspaceCount}</span>
              )}
              {label === 'Performance Alerts' && alertsCount > 0 && (
                <span className={styles.navBadge} style={{ marginLeft: 'auto', background: 'var(--red)' }}>{alertsCount}</span>
              )}
            </span>
          </Link>
        ))}
      </nav>

      {/* Footer / Toggle & Logout */}
      <div className={styles.footer} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.75rem',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Theme
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'dark', color: '#080808', border: '#c8a96e', title: 'Dark Gold' },
              { id: 'light', color: '#fdfcf8', border: '#b08d48', title: 'Light Gold' },
              { id: 'sage', color: '#121b16', border: '#6aaa84', title: 'Sage Green' },
              { id: 'blue', color: '#0a1024', border: '#a8d5e2', title: 'Deep Blue' },
              { id: 'ruby', color: '#1f0a10', border: '#c06060', title: 'Ruby Red' },
            ].map(t => (
              <button
                key={t.id}
                title={t.title}
                onClick={() => {
                  setTheme(t.id);
                  localStorage.setItem('uka_theme', t.id);
                  document.documentElement.setAttribute('data-theme', t.id);
                  window.dispatchEvent(new Event('uka-theme-change'));
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: t.color,
                  border: theme === t.id ? `2px solid ${t.border}` : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, border-color 0.2s',
                  transform: theme === t.id ? 'scale(1.15)' : 'scale(1)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = theme === t.id ? 'scale(1.15)' : 'scale(1)'}
              />
            ))}
          </div>
        </div>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.navIcon}><LogOut size={18} strokeWidth={1.75} /></span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
