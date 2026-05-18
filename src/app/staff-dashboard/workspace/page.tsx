'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isStaffAuthenticated, getStaffById, StaffMember } from '@/lib/store';
import WorkspaceChat from '@/components/WorkspaceChat';

export default function StaffWorkspacePage() {
  const router = useRouter();
  const [member, setMember] = useState<StaffMember | null>(null);

  useEffect(() => {
    const staffId = isStaffAuthenticated();
    if (!staffId) {
      router.replace('/');
      return;
    }
    const mem = getStaffById(staffId);
    if (!mem) {
      router.replace('/');
      return;
    }
    setMember(mem);
  }, [router]);

  if (!member) return null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <WorkspaceChat 
        currentUserId={member.id} 
        currentUserName={member.name} 
        currentUserRole={member.role} 
      />
    </div>
  );
}
