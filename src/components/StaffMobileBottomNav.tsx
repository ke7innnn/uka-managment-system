'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, FolderKanban, Bell, AlertTriangle, User } from 'lucide-react';
import styles from './MobileBottomNav.module.css';
import { useEffect, useState } from 'react';
import { isStaffAuthenticated, getStaffById } from '@/lib/store';

const TABS = [
  { href: '/staff-dashboard',               label: 'Tasks',       Icon: CheckCircle2  },
  { href: '/staff-dashboard/projects',      label: 'Projects',    Icon: FolderKanban  },
  { href: '/staff-dashboard/inbox',         label: 'Inbox',       Icon: Bell          },
  { href: '/staff-dashboard/wall-of-shame', label: 'Performance', Icon: AlertTriangle },
  { href: '/staff-dashboard/profile',       label: 'Profile',     Icon: User          },
];

export default function StaffMobileBottomNav() {
  const pathname = usePathname();
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    const id = isStaffAuthenticated();
    if (!id) return;
    const member = getStaffById(id);
    if (!member) return;
    const pending = member.tasks.filter(t => !t.completed).length;
    setInboxCount(pending);
  }, [pathname]);

  return (
    <nav className={styles.nav}>
      {TABS.map(({ href, label, Icon }) => {
        const isRoot = href === '/staff-dashboard';
        const active = isRoot ? pathname === href : pathname.startsWith(href);
        const badge = href === '/staff-dashboard/inbox' && inboxCount > 0;
        return (
          <Link key={href} href={href} className={`${styles.tab} ${active ? styles.tabActive : ''}`}>
            <span className={styles.tabIcon} style={{ position: 'relative' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              {badge && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#ef4444', color: '#fff',
                  fontSize: '0.55rem', fontWeight: 700,
                  width: 14, height: 14, borderRadius: '999px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{inboxCount}</span>
              )}
            </span>
            <span className={styles.tabLabel}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
