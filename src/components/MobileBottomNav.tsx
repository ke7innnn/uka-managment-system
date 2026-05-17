'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FolderKanban, UserCog, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import styles from './MobileBottomNav.module.css';

const PRIMARY_TABS = [
  { href: '/dashboard',           label: 'Home',    Icon: LayoutDashboard },
  { href: '/dashboard/clients',   label: 'Clients', Icon: Users            },
  { href: '/dashboard/projects',  label: 'Projects',Icon: FolderKanban     },
  { href: '/dashboard/staff',     label: 'Staff',   Icon: UserCog          },
];

const MORE_TABS = [
  { href: '/dashboard/documents', label: 'Documents'  },
  { href: '/dashboard/attendance',label: 'Attendance' },
  { href: '/dashboard/reports',   label: 'Reports'    },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_TABS.some(t => pathname.startsWith(t.href));

  return (
    <>
      {/* More Sheet Overlay */}
      {moreOpen && (
        <div className={styles.overlay} onClick={() => setMoreOpen(false)} />
      )}

      {/* More Sheet */}
      <div className={`${styles.moreSheet} ${moreOpen ? styles.moreSheetOpen : ''}`}>
        <div className={styles.sheetHandle} />
        <p className={styles.sheetLabel}>More Sections</p>
        {MORE_TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMoreOpen(false)}
            className={`${styles.sheetItem} ${pathname.startsWith(href) ? styles.sheetItemActive : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Bottom Tab Bar */}
      <nav className={styles.nav}>
        {PRIMARY_TABS.map(({ href, label, Icon }) => {
          const isRoot = href === '/dashboard';
          const active = isRoot ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`${styles.tab} ${active ? styles.tabActive : ''}`}>
              <span className={styles.tabIcon}><Icon size={22} strokeWidth={active ? 2.5 : 1.75} /></span>
              <span className={styles.tabLabel}>{label}</span>
            </Link>
          );
        })}
        <button
          className={`${styles.tab} ${isMoreActive ? styles.tabActive : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <span className={styles.tabIcon}><MoreHorizontal size={22} strokeWidth={1.75} /></span>
          <span className={styles.tabLabel}>More</span>
        </button>
      </nav>
    </>
  );
}
