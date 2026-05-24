'use client';
import { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import WorkspaceChat from './WorkspaceChat';
import { isAuthenticated, isStaffAuthenticated, getStaffById, getUnreadWorkspaceCount } from '@/lib/store';

export default function WorkspaceChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Determine user (Admin or Staff)
    if (isAuthenticated()) {
      setUser({ id: 'admin', name: 'Umesh Kekre', role: 'Admin' });
    } else {
      const staffId = isStaffAuthenticated();
      if (staffId) {
        const mem = getStaffById(staffId);
        if (mem) {
          setUser({ id: mem.id, name: mem.name, role: mem.role });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const updateUnread = () => {
      setUnread(getUnreadWorkspaceCount(user.id));
    };
    
    // Initial fetch
    updateUnread();
    
    // Polling interval for cross-tab syncing
    const interval = setInterval(updateUnread, 3000);
    
    // Listen for custom read event
    window.addEventListener('uka-workspace-read-complete', updateUnread);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('uka-workspace-read-complete', updateUnread);
    };
  }, [user]);

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '2rem', left: '18rem', zIndex: 9998,
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'var(--surface)', border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)', cursor: 'pointer', transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Live Workspace Chat"
        >
          <MessageSquare size={28} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: '#ef4444', color: 'white', fontSize: '12px',
              fontWeight: 'bold', width: '22px', height: '22px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '18rem', zIndex: 9999,
          width: '100%', maxWidth: '380px', height: '600px', maxHeight: '80vh',
          background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} /> Live Workspace
            </h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <WorkspaceChat currentUserId={user.id} currentUserName={user.name} currentUserRole={user.role} />
          </div>
        </div>
      )}
    </>
  );
}
