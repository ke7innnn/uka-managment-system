import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUnreadWorkspaceCount } from '@/lib/store';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Users, FolderKanban, FileText, UserCog, BarChart3, LogOut, CalendarCheck, MessageSquare } from 'lucide-react';

const NAV = [
  { href: '/dashboard',           label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/clients',   label: 'Clients',   Icon: Users            },
  { href: '/dashboard/projects',  label: 'Projects',  Icon: FolderKanban     },
  { href: '/dashboard/documents', label: 'Documents', Icon: FileText         },
  { href: '/dashboard/staff',     label: 'Staff',     Icon: UserCog          },
  { href: '/dashboard/attendance',label: 'Attendance',Icon: CalendarCheck    },
  { href: '/dashboard/workspace', label: 'Workspace', Icon: MessageSquare    },
  { href: '/dashboard/reports',   label: 'Reports',   Icon: BarChart3        },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnread = () => {
    setUnreadCount(getUnreadWorkspaceCount('admin'));
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
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.navIcon}><LogOut size={18} strokeWidth={1.75} /></span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
