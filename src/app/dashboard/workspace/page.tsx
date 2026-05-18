'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/store';
import WorkspaceChat from '@/components/WorkspaceChat';

export default function AdminWorkspacePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) return null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <WorkspaceChat 
        currentUserId="admin" 
        currentUserName="Umesh Kekre" 
        currentUserRole="Admin" 
      />
    </div>
  );
}
