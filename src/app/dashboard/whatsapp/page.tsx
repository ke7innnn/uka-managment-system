'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquareReply, RefreshCw, CheckCircle2 } from 'lucide-react';
import styles from '../inbox/page.module.css';

export default function WhatsappRepliesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMessages(data);
    } else {
      console.error('Error fetching WhatsApp messages:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('whatsapp_messages').update({ status: 'read' }).eq('id', id);
    fetchMessages();
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820, margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 400, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.4rem' }}>
            <MessageSquareReply size={22} /> WhatsApp Replies
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Incoming messages from clients on your WhatsApp Business number</p>
        </div>
        <button onClick={fetchMessages} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {messages.length === 0 && !loading ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <MessageSquareReply size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No messages received yet. When clients reply, they will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map(msg => {
            const isInbound = msg.direction !== 'outbound';
            const isRead = msg.status === 'read' || !isInbound;
            const isOutbound = !isInbound;
            
            return (
              <div
                key={msg.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderLeft: `4px solid ${isOutbound ? '#3b82f6' : (isRead ? 'var(--border)' : '#6aaa84')}`,
                  background: isOutbound ? 'rgba(59, 130, 246, 0.03)' : (isRead ? 'var(--bg-raised)' : 'rgba(106,170,132,0.06)'),
                  opacity: (isRead && !isOutbound) ? 0.8 : 1,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  marginLeft: isOutbound ? '3rem' : '0',
                  marginRight: isInbound ? '3rem' : '0',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {isOutbound ? 'UKA System' : (msg.sender_name || 'Client')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {isOutbound ? 'Sent to ' : ''}+{msg.phone_number}
                      </span>
                      {isInbound && !isRead && (
                        <span style={{ background: 'var(--accent)', color: '#000', padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>
                          NEW
                        </span>
                      )}
                      {isOutbound && (
                        <span style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 600 }}>
                          OUTBOUND
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {new Date(msg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.message_body}
                  </p>
                </div>

                {isInbound && !isRead && (
                  <button 
                    onClick={() => markAsRead(msg.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                    title="Mark as read"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
