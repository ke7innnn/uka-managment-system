'use client';

import { useEffect, useRef } from 'react';
import { pullFromSupabase } from '@/lib/supabaseSync';

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
      }
    });
  }, []);

  return <>{children}</>;
}
