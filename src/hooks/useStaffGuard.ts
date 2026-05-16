'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isStaffAuthenticated } from '@/lib/store';

export default function useStaffGuard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const staffId = isStaffAuthenticated();
    if (!staffId) {
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  return authorized;
}
