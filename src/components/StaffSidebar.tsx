'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutStaff, getStaff, isStaffAuthenticated, getStaffById, StaffMember, getUnreadWorkspaceCount, getUnreadAlertsCount } from '@/lib/store';
import styles from '@/components/Sidebar.module.css';
import { CheckCircle2, FolderKanban, Bell, AlertTriangle, User, LogOut, MessageSquare, Sun, Moon, X, Receipt } from 'lucide-react';

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

    // Theme sync
    const saved = localStorage.getItem('uka_theme') || 'dark';
    setTheme(saved as 'dark' | 'light');
    document.documentElement.setAttribute('data-theme', saved);

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
    const handleThemeChange = () => {
      const current = localStorage.getItem('uka_theme') || 'dark';
      setTheme(current as 'dark' | 'light');
    };
    window.addEventListener('uka-theme-change', handleThemeChange);
    return () => window.removeEventListener('uka-theme-change', handleThemeChange);
  }, []);

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

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('uka_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new Event('uka-theme-change'));
  };

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
        <button 
          onClick={toggleTheme}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            width: '100%', 
            padding: '0.75rem 1rem', 
            borderRadius: '10px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            justifyContent: 'flex-start'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </span>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.navIcon}><LogOut size={18} strokeWidth={1.75} /></span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
