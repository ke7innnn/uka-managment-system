'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/store';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Users, FolderKanban, FileText, UserCog, BarChart3, LogOut, CalendarCheck } from 'lucide-react';

const NAV = [
  { href: '/dashboard',           label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/clients',   label: 'Clients',   Icon: Users            },
  { href: '/dashboard/projects',  label: 'Projects',  Icon: FolderKanban     },
  { href: '/dashboard/documents', label: 'Documents', Icon: FileText         },
  { href: '/dashboard/staff',     label: 'Staff',     Icon: UserCog          },
  { href: '/dashboard/attendance',label: 'Attendance',Icon: CalendarCheck    },
  { href: '/dashboard/reports',   label: 'Reports',   Icon: BarChart3        },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => { logout(); router.replace('/'); };

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandLogo}>U</div>
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
              <span>{label}</span>
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
