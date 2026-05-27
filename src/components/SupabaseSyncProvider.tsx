'use client';

import { useEffect, useRef } from 'react';
import { pullFromSupabase } from '@/lib/supabaseSync';
import { getClients } from '@/lib/store';
import { processReminders } from '@/lib/reminders';

/**
 * SupabaseSyncProvider
 * 
 * Mounted once at the root layout. On first mount it pulls the latest
 * data from Supabase into localStorage so every page renders with
 * production-level data rather than whatever was in the local browser.
 * 
 * After the initial pull it listens for the 'uka-sync-complete' event
 * (fired by pullFromSupabase) and does nothing — writes are already
 * handled by the write-through cache in store.ts.
 *
 * REMINDERS: processReminders() is only called ONCE after the initial
 * Supabase pull. The function itself is debounced to max once per 30 min
 * and has a strict 24h gate per alert — so it is safe and won't spam.
 */
export default function SupabaseSyncProvider({ children }: { children: React.ReactNode }) {
  const didSync = useRef(false);

  useEffect(() => {
    if (didSync.current) return;
    if (typeof window === 'undefined') return;
    didSync.current = true;

    // Pull latest data from Supabase on first page load
    pullFromSupabase().then((success) => {
      if (success) {
        window.dispatchEvent(new Event('storage'));
        // Fire reminder check ONCE after loading fresh data.
        // The debounce inside processReminders prevents this from re-running
        // more than once per 30 minutes across the whole session.
        processReminders(getClients());
      }
    });

    // PWA App Badge Notification Sync — ONLY manages the app icon badge count.
    // Does NOT call processReminders (that would cause alert spam on every 30s tick).
    let lastPendingCount = -1;
    const updateAppBadge = () => {
      if (typeof navigator !== 'undefined') {
        try {
          const staffId = localStorage.getItem('uka_staff_auth');
          if (!staffId) {
            // @ts-ignore
            if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
            return;
          }
          
          const rawStaff = localStorage.getItem('uka_staff');
          if (rawStaff) {
            const staff = JSON.parse(rawStaff);
            const me = staff.find((s: any) => s.id === staffId);
            if (me && me.tasks) {
              const pending = me.tasks.filter((t: any) => !t.completed).length;
              
              // Android Local Notification fallback to trigger Android Launcher Dot/Badge
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const isAndroid = /Android/i.test(navigator.userAgent);
                if (isAndroid && pending > 0 && pending !== lastPendingCount) {
                  new Notification("UKA Management System", {
                    body: `You have ${pending} pending task(s) to complete.`,
                    icon: '/globe.svg'
                  });
                  lastPendingCount = pending;
                }
              }

              let badgeCount = 0;
              if (pending >= 3) badgeCount = 2;
              else if (pending > 0) badgeCount = 1;
              
              if ('setAppBadge' in navigator) {
                if (badgeCount > 0) {
                  // @ts-ignore
                  navigator.setAppBadge(badgeCount).catch(() => {});
                } else {
                  // @ts-ignore
                  if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
                }
              }
            }
          }
        } catch (err) {
          console.error("App badge update failed", err);
        }
      }
    };

    updateAppBadge();
    const interval = setInterval(updateAppBadge, 30000); // Check badge every 30s (no reminder logic here)
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
