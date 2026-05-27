import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUnreadWorkspaceCount, getUnreadAlertsCount } from '@/lib/store';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Users, FolderKanban, FileText, UserCog, BarChart3, LogOut, CalendarCheck, MessageSquare, Inbox, Bell, Sun, Moon, X, Receipt } from 'lucide-react';

const NAV = [
  { href: '/dashboard',                        label: 'Dashboard',          Icon: LayoutDashboard },
  { href: '/dashboard/clients',               label: 'Clients',            Icon: Users            },
  { href: '/dashboard/projects',              label: 'Projects',           Icon: FolderKanban     },
  { href: '/dashboard/documents',             label: 'Documents',          Icon: FileText         },
  { href: '/dashboard/billing',               label: 'Billing',            Icon: Receipt          },
  { href: '/dashboard/staff',                 label: 'Staff',              Icon: UserCog          },
  { href: '/dashboard/attendance',            label: 'Attendance',         Icon: CalendarCheck    },
  { href: '/dashboard/workspace',             label: 'Workspace',          Icon: MessageSquare    },
  { href: '/dashboard/inbox',                 label: 'Inbox',              Icon: Inbox            },
  { href: '/dashboard/performance-alerts',    label: 'Performance Alerts', Icon: Bell             },
  { href: '/dashboard/reports',               label: 'Reports',            Icon: BarChart3        },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const updateUnread = () => {
    setUnreadCount(getUnreadWorkspaceCount('admin'));
    setAlertsCount(getUnreadAlertsCount('admin'));
    setInboxCount(getUnreadAlertsCount('admin'));
  };

  useEffect(() => {
    updateUnread();
    
    // Theme sync
    const saved = localStorage.getItem('uka_theme') || 'dark';
    setTheme(saved as 'dark' | 'light');
    document.documentElement.setAttribute('data-theme', saved);

    const handleThemeChange = () => {
      const current = localStorage.getItem('uka_theme') || 'dark';
      setTheme(current as 'dark' | 'light');
    };
    window.addEventListener('uka-theme-change', handleThemeChange);
    
    // Recalculate on sync and read completion events
    window.addEventListener('uka-workspace-sync-complete', updateUnread);
    window.addEventListener('uka-workspace-read-complete', updateUnread);
    
    const interval = setInterval(updateUnread, 5000);
    return () => {
      window.removeEventListener('uka-theme-change', handleThemeChange);
      window.removeEventListener('uka-workspace-sync-complete', updateUnread);
      window.removeEventListener('uka-workspace-read-complete', updateUnread);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('uka_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new Event('uka-theme-change'));
  };

  const handleLogout = () => { logout(); router.replace('/'); };

  return (
    <aside className={styles.sidebar}>
      {/* Mobile Close Button */}
      {onClose && (
        <button className={styles.closeMobileDrawer} onClick={onClose} aria-label="Close menu">
          <X size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Brand */}
      <div className={styles.brand}>
        <img
          src="/icon.png"
          alt="UKA Logo"
          className={styles.brandLogo}
          style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', background: 'transparent', boxShadow: 'none' }}
        />
        <span className={styles.brandSub}>UKA</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
            >
              <span className={styles.navIcon}><Icon size={18} strokeWidth={1.75} /></span>
              <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span>{label}</span>
                {label === 'Workspace' && unreadCount > 0 && (
                  <span className={styles.navBadge} style={{ marginLeft: 'auto' }}>{unreadCount}</span>
                )}
                {label === 'Inbox' && inboxCount > 0 && (
                  <span className={styles.navBadge} style={{ marginLeft: 'auto' }}>{inboxCount}</span>
                )}
                {label === 'Performance Alerts' && alertsCount > 0 && (
                  <span className={styles.navBadge} style={{ marginLeft: 'auto', background: 'var(--red)' }}>{alertsCount}</span>
                )}
              </span>
            </Link>
          );
        })}
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
    </aside>
  );
}
