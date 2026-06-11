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
    <div className="workspace-page-container">
      <style>{`
        .workspace-page-container {
          padding: 0;
          max-width: 100%;
          width: 100%;
          margin: 0;
        }
        @media (max-width: 768px) {
          .workspace-page-container {
            padding: 0 !important;
          }
        }
      `}</style>
      <WorkspaceChat 
        currentUserId="admin" 
        currentUserName="Umesh Kekre" 
        currentUserRole="Admin" 
      />
    </div>
  );
}
