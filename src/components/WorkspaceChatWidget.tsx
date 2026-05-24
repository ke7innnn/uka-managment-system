'use client';
import { useEffect, useState, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import WorkspaceChat from './WorkspaceChat';
import { isAuthenticated, isStaffAuthenticated, getStaffById, getUnreadWorkspaceCount } from '@/lib/store';

export default function WorkspaceChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [unread, setUnread] = useState(0);

  // Position and drag states
  const [position, setPosition] = useState({ x: 288, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [buttonStart, setButtonStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);

  // Initialize position on mount relative to actual window size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialY = window.innerHeight - 92; // 60px height + 32px (2rem) bottom spacing
      const initialX = 288; // 18rem
      setPosition({ x: initialX, y: initialY });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with left mouse click or touch events
    if (e.button !== 0 && e.type !== 'touchstart') return;
    setIsDragging(true);
    setDragMoved(false);
    setDragStart({ x: e.clientX, y: e.clientY });
    setButtonStart({ x: position.x, y: position.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // Check if dragging exceeded threshold to prevent simple click trigger
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setDragMoved(true);
    }
    
    let newX = buttonStart.x + dx;
    let newY = buttonStart.y + dy;
    
    // Keep button inside screen bounds with padding
    const size = 60;
    newX = Math.max(10, Math.min(window.innerWidth - size - 10, newX));
    newY = Math.max(10, Math.min(window.innerHeight - size - 10, newY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      setIsOpen(true);
    }
  };

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

  const getWindowStyles = (): React.CSSProperties => {
    if (typeof window === 'undefined') return { position: 'fixed', bottom: '2rem', left: '18rem' };
    
    let winLeft = position.x;
    let winTop = position.y - 615; // 600px height + 15px spacing above
    
    // Constrain left/right boundaries within viewport
    if (winLeft + 380 > window.innerWidth) {
      winLeft = window.innerWidth - 380 - 20;
    }
    if (winLeft < 20) {
      winLeft = 20;
    }
    
    // Constrain top/bottom boundaries within viewport
    if (winTop < 20) {
      winTop = position.y + 75; // 60px height + 15px spacing below
    }
    if (winTop + 600 > window.innerHeight) {
      winTop = window.innerHeight - 600 - 20;
    }
    if (winTop < 20) {
      winTop = 20; // fallback inside viewport
    }
    
    return {
      position: 'fixed',
      left: `${winLeft}px`,
      top: `${winTop}px`,
      zIndex: 9999,
      width: '100%',
      maxWidth: '380px',
      height: '600px',
      maxHeight: '80vh',
      background: 'var(--bg)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out'
    };
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && position.y !== -1 && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 9998,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            cursor: isDragging ? 'grabbing' : 'pointer',
            touchAction: 'none',
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          onMouseOver={(e) => {
            if (!isDragging) e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            if (!isDragging) e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Drag to reposition / Click to open Live Workspace Chat"
        >
          <MessageSquare size={28} style={{ pointerEvents: 'none' }} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: '#ef4444', color: 'white', fontSize: '12px',
              fontWeight: 'bold', width: '22px', height: '22px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              pointerEvents: 'none'
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div style={getWindowStyles()}>
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
