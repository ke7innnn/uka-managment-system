'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/store';

export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);
}
