import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUnreadWorkspaceCount, getUnreadAlertsCount } from '@/lib/store';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Users, FolderKanban, FileText, UserCog, BarChart3, LogOut, MessageSquare, Inbox, Bell, X, Receipt } from 'lucide-react';

const NAV = [
  { href: '/dashboard',                        label: 'Dashboard',          Icon: LayoutDashboard },
  { href: '/dashboard/clients',               label: 'Clients',            Icon: Users            },
  { href: '/dashboard/projects',              label: 'Projects',           Icon: FolderKanban     },
  { href: '/dashboard/documents',             label: 'Documents',          Icon: FileText         },
  { href: '/dashboard/billing',               label: 'Billing',            Icon: Receipt          },
  { href: '/dashboard/staff',                 label: 'Staff',              Icon: UserCog          },
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
  const [theme, setTheme] = useState<string>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('uka_theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  const updateUnread = () => {
    setUnreadCount(getUnreadWorkspaceCount('admin'));
    setAlertsCount(getUnreadAlertsCount('admin'));
    setInboxCount(getUnreadAlertsCount('admin'));
  };

  useEffect(() => {
    updateUnread();
    
    // Recalculate on sync and read completion events
    window.addEventListener('uka-workspace-sync-complete', updateUnread);
    window.addEventListener('uka-workspace-read-complete', updateUnread);
    
    const interval = setInterval(updateUnread, 5000);
    return () => {
      window.removeEventListener('uka-workspace-sync-complete', updateUnread);
      window.removeEventListener('uka-workspace-read-complete', updateUnread);
      clearInterval(interval);
    };
  }, []);

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
    </aside>
  );
}
