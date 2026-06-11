'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquareReply, 
  RefreshCw, 
  Search, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  MessageSquare,
  Clock
} from 'lucide-react';

// Strict type interfaces to satisfy ESLint
interface WhatsAppMessage {
  id: string;
  created_at: string;
  phone_number: string;
  sender_name: string | null;
  message_body: string;
  direction: 'inbound' | 'outbound';
  status: string;
}

interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  kyc: {
    otherOwners?: { name?: string; phone?: string }[];
    references?: { name?: string; phone?: string }[];
  } | null;
}

interface ParsedTemplate {
  isTemplate: boolean;
  templateName: string;
  clientName: string;
  items: { name: string; status: 'yes' | 'no' | 'neutral' }[];
  summary: string;
  yesCount: number;
  noCount: number;
  neutralCount: number;
}

function parseMessageBody(body: string): ParsedTemplate {
  if (!body) {
    return { isTemplate: false, templateName: '', clientName: '', items: [], summary: '', yesCount: 0, noCount: 0, neutralCount: 0 };
  }
  
  const templateMatch = body.match(/^\[Template:\s*([^\]]+)\]\s*-\s*([\s\S]*)$/);
  if (!templateMatch) {
    return {
      isTemplate: false,
      templateName: '',
      clientName: '',
      items: [],
      summary: body,
      yesCount: 0,
      noCount: 0,
      neutralCount: 0
    };
  }

  const [, templateName, content] = templateMatch;
  const parts = content.split(/,\s*/);
  const clientName = parts[0] || 'Client';
  const items: { name: string; status: 'yes' | 'no' | 'neutral' }[] = [];
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.includes(':')) {
      const lastColon = part.lastIndexOf(':');
      const name = part.slice(0, lastColon).trim();
      const val = part.slice(lastColon + 1).trim();
      
      let status: 'yes' | 'no' | 'neutral' = 'neutral';
      if (val.includes('✅') || val.includes('yes') || val === 'true') {
        status = 'yes';
      } else if (val.includes('❌') || val.includes('no') || val === 'false') {
        status = 'no';
      }
      
      items.push({ name, status });
    }
  }

  const yesCount = items.filter(item => item.status === 'yes').length;
  const noCount = items.filter(item => item.status === 'no').length;
  const neutralCount = items.filter(item => item.status === 'neutral').length;
  
  let summary = `Template: ${templateName}`;
  if (items.length > 0) {
    summary = `📋 Update: ${yesCount} Approved, ${noCount} Pending`;
  } else {
    summary = `📋 Template ${templateName} sent`;
  }

  return {
    isTemplate: true,
    templateName,
    clientName,
    items,
    summary,
    yesCount,
    noCount,
    neutralCount
  };
}

// Format contact names with sub-roles cleanly
function formatSenderName(name: string) {
  if (!name) return { main: 'Client', sub: '' };
  if (name === 'UKA Admin (Sent)' || name === 'UKA System') {
    return { main: 'UKA System', sub: 'Outbound' };
  }
  
  const match = name.match(/^(.*?)\s*\((Owner|Ref|WA):\s*(.*?)\)$/i);
  if (match) {
    const [, mainName, role, contactName] = match;
    return {
      main: mainName.trim(),
      sub: `${role === 'WA' ? 'WhatsApp Name' : role}: ${contactName.trim()}`
    };
  }
  
  return { main: name, sub: '' };
}

// Collapsible card component for outbound template details
function OutboundTemplateCard({ parsed }: { parsed: ParsedTemplate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const total = parsed.yesCount + parsed.noCount;
  const percentage = total > 0 ? Math.round((parsed.yesCount / total) * 100) : 0;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {parsed.templateName === 'client_ukaprogress' ? '📊 UKA Progress Update' : 
           parsed.templateName === 'ocprogress_uka' ? '🏠 OC Checklist Update' : 
           `📋 Template: ${parsed.templateName}`}
        </span>
      </div>
      
      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>
        {parsed.clientName}
      </div>

      {total > 0 && (
        <div style={{ marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>Verified Progress</span>
            <span>{parsed.yesCount} / {total} Done ({percentage}%)</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--grad-accent)', borderRadius: 3, transition: 'width 0.4s ease-out' }} />
          </div>
        </div>
      )}

      {parsed.items.length > 0 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 6, 
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border)', 
            padding: '5px 10px', 
            borderRadius: 6, 
            fontSize: '0.725rem', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            marginTop: 4,
            width: '100%',
            transition: 'all 0.15s ease'
          }}
        >
          {isExpanded ? (
            <>Hide Checklist Details <ChevronUp size={13} /></>
          ) : (
            <>View Checklist Details <ChevronDown size={13} /></>
          )}
        </button>
      )}

      {isExpanded && parsed.items.length > 0 && (
        <div 
          className="custom-scrollbar"
          style={{ 
            maxHeight: 180, 
            overflowY: 'auto', 
            border: '1px solid var(--border)', 
            borderRadius: 8, 
            background: 'rgba(0,0,0,0.25)', 
            padding: '6px 10px',
            fontSize: '0.725rem',
            marginTop: 4
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
            {parsed.items.map((item, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '3px 6px',
                  background: item.status === 'yes' ? 'rgba(106,170,132,0.04)' : item.status === 'no' ? 'rgba(192,96,96,0.04)' : 'transparent',
                  borderRadius: 4,
                  border: `1px solid ${item.status === 'yes' ? 'rgba(106,170,132,0.08)' : item.status === 'no' ? 'rgba(192,96,96,0.08)' : 'transparent'}`
                }}
              >
                <span style={{ color: item.status === 'yes' ? 'var(--text)' : 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                  {item.name}
                </span>
                <span style={{ 
                  fontSize: '0.6rem', 
                  fontWeight: 700, 
                  padding: '1px 5px', 
                  borderRadius: 99,
                  background: item.status === 'yes' ? 'var(--green-bg)' : item.status === 'no' ? 'var(--red-bg)' : 'rgba(255,255,255,0.04)',
                  color: item.status === 'yes' ? 'var(--green)' : item.status === 'no' ? 'var(--red)' : 'var(--text-tertiary)'
                }}>
                  {item.status === 'yes' ? 'APPROVED' : item.status === 'no' ? 'PENDING' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsappRepliesPage() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatPhone, setActiveChatPhone] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMessages(data);
    } else {
      console.error('Error fetching WhatsApp messages:', error);
    }
  }, []);

  const fetchClientProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, kyc');
    
    if (data) {
      setClientProfiles(data as unknown as ClientProfile[]);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMessages(), fetchClientProfiles()]);
    setRefreshing(false);
  }, [fetchMessages, fetchClientProfiles]);

  // Combined fetch for initial component mount (uses setTimeout to avoid synchronous setState inside effect warning)
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      await Promise.all([fetchMessages(), fetchClientProfiles()]);
      if (isMounted) {
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    };

    init();
    const interval = setInterval(fetchMessages, 10000); // Poll messages every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMessages, fetchClientProfiles]);

  // Scroll to bottom of active conversation thread
  useEffect(() => {
    if (activeChatPhone && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatPhone, messages]);

  // Group messages into chats
  const chatsMap: { [key: string]: { phoneNumber: string; clientName: string; messages: WhatsAppMessage[]; latestMessageTime: string; hasUnread: boolean } } = {};

  messages.forEach(msg => {
    const phone = msg.phone_number;
    if (!chatsMap[phone]) {
      chatsMap[phone] = {
        phoneNumber: phone,
        clientName: msg.sender_name || 'Client',
        messages: [],
        latestMessageTime: msg.created_at,
        hasUnread: false
      };
    }
    
    chatsMap[phone].messages.push(msg);
    
    if (new Date(msg.created_at) > new Date(chatsMap[phone].latestMessageTime)) {
      chatsMap[phone].latestMessageTime = msg.created_at;
    }
    
    if (msg.direction !== 'outbound' && msg.status !== 'read') {
      chatsMap[phone].hasUnread = true;
    }
    
    // Pick the most detailed sender name resolved
    if (msg.sender_name && msg.sender_name !== 'Client' && msg.sender_name !== 'Unknown Client' && msg.sender_name !== 'UKA Admin (Sent)') {
      const currentName = chatsMap[phone].clientName;
      if (currentName === 'Client' || currentName === 'Unknown Client' || currentName === 'UKA Admin (Sent)' || msg.sender_name.includes('Owner') || msg.sender_name.includes('Ref')) {
        chatsMap[phone].clientName = msg.sender_name;
      }
    }
  });

  // Try to resolve 'UKA Admin (Sent)' or 'Unknown Client' using loaded clientProfiles
  Object.values(chatsMap).forEach(chat => {
    if (chat.clientName === 'UKA Admin (Sent)' || chat.clientName === 'Unknown Client' || chat.clientName === 'Client') {
      const chatPhone10 = chat.phoneNumber.replace(/\D/g, '').slice(-10);
      const matchedClient = clientProfiles.find(c => {
        const checkPhone = (p: string) => p && p.replace(/\D/g, '').endsWith(chatPhone10);
        if (checkPhone(c.phone)) return true;
        if (c.kyc?.otherOwners?.some((o: any) => checkPhone(o.phone))) return true;
        if (c.kyc?.references?.some((r: any) => checkPhone(r.phone))) return true;
        return false;
      });
      if (matchedClient) {
        chat.clientName = matchedClient.name;
      }
    }
  });

  // Convert map to array and sort chats by latest activity time
  const chatList = Object.values(chatsMap).sort((a, b) => 
    new Date(b.latestMessageTime).getTime() - new Date(a.latestMessageTime).getTime()
  );

  // Sort messages inside each chat chronologically (oldest first)
  chatList.forEach(chat => {
    chat.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  // Filter conversations based on user search query
  const filteredChatList = chatList.filter(chat => {
    const query = searchQuery.toLowerCase();
    const formatted = formatSenderName(chat.clientName);
    return (
      formatted.main.toLowerCase().includes(query) ||
      formatted.sub.toLowerCase().includes(query) ||
      chat.phoneNumber.includes(query) ||
      chat.messages.some(m => m.message_body?.toLowerCase().includes(query))
    );
  });

  // Mark all unread messages in the active thread as read
  useEffect(() => {
    if (activeChatPhone && messages.length > 0) {
      const unreadIds = messages
        .filter(m => m.phone_number === activeChatPhone && m.direction !== 'outbound' && m.status !== 'read')
        .map(m => m.id);

      if (unreadIds.length > 0) {
        const markThreadAsRead = async () => {
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'read' })
            .in('id', unreadIds);
          fetchMessages(); // Refresh local states
        };
        markThreadAsRead();
      }
    }
  }, [activeChatPhone, messages, fetchMessages]);

  // Try to find matching Client ID in clients table profiles for direct link
  const getMatchedClientProfile = (phone: string) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    
    return clientProfiles.find(c => {
      const checkPhone = (p: string | null | undefined) => p && typeof p === 'string' && p.replace(/\D/g, '').endsWith(last10);
      
      if (checkPhone(c.phone)) return true;
      if (c.kyc?.otherOwners?.some((o) => checkPhone(o.phone))) return true;
      if (c.kyc?.references?.some((r) => checkPhone(r.phone))) return true;
      return false;
    });
  };

  const activeChat = activeChatPhone ? chatsMap[activeChatPhone] : null;
  const activeClientProfile = activeChatPhone ? getMatchedClientProfile(activeChatPhone) : null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Dynamic Style Injection for Responsive Scrollbars & Grid Panels */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .chat-layout {
          display: flex;
          height: calc(100vh - 190px);
          min-height: 500px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--bg-raised);
          border: 1px solid var(--border);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .chat-sidebar {
          width: 330px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
        }

        .chat-thread-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.03);
          position: relative;
        }

        @media (max-width: 768px) {
          .chat-layout {
            height: calc(100vh - 130px);
          }
          .chat-sidebar.mobile-hidden {
            display: none !important;
          }
          .chat-thread-container.mobile-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Top Title Panel */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 1.85rem)', fontWeight: 400, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.2rem' }}>
            <MessageSquareReply size={22} className="text-gradient" /> WhatsApp Inbox
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Track, view and manage WhatsApp notifications and client replies in real-time</p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          style={{ 
            background: 'var(--bg-raised)', 
            border: '1px solid var(--border)', 
            padding: '0.5rem 0.75rem', 
            borderRadius: 8, 
            color: 'var(--text)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.85rem',
            transition: 'all 0.15s ease'
          }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Main Dual-pane Container */}
      {chatList.length === 0 && !loading ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <MessageSquareReply size={44} style={{ marginBottom: 12, opacity: 0.25 }} />
          <p style={{ fontSize: '0.95rem' }}>No messages logged yet.</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4, color: 'var(--text-tertiary)' }}>Outbound updates and incoming webhook replies will appear here dynamically.</p>
        </div>
      ) : (
        <div className="chat-layout">
          
          {/* Left Panel: Contacts Sidebar */}
          <div className={`chat-sidebar ${activeChatPhone ? 'mobile-hidden' : ''}`}>
            
            {/* Sidebar Search Bar */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="Search client or phone..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    color: 'var(--text)'
                  }}
                />
              </div>
            </div>

            {/* Contacts Scroll list */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
              {filteredChatList.map(chat => {
                const isSelected = activeChatPhone === chat.phoneNumber;
                const formatted = formatSenderName(chat.clientName);
                const lastMsg = chat.messages[chat.messages.length - 1];
                const isOutbound = lastMsg?.direction === 'outbound';
                const parsedLast = isOutbound ? parseMessageBody(lastMsg?.message_body) : null;
                
                // Construct snippet text for preview
                let snippet = lastMsg?.message_body || '';
                if (isOutbound && parsedLast?.isTemplate) {
                  snippet = parsedLast.summary;
                } else if (snippet.length > 50) {
                  snippet = snippet.slice(0, 50) + '...';
                }

                return (
                  <div
                    key={chat.phoneNumber}
                    onClick={() => setActiveChatPhone(chat.phoneNumber)}
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(200, 169, 110, 0.05)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {formatted.main}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {new Date(chat.latestMessageTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {formatted.sub && (
                      <div style={{ fontSize: '0.725rem', color: 'var(--accent)', fontWeight: 500, marginBottom: 4, opacity: 0.85 }}>
                        {formatted.sub}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: isSelected ? 'var(--text-secondary)' : 'var(--text-tertiary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                        {isOutbound ? '📤 ' : ''}{snippet}
                      </span>
                      {chat.hasUnread && (
                        <span style={{ width: 8, height: 8, background: '#6aaa84', borderRadius: '50%' }} />
                      )}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      +{chat.phoneNumber}
                    </div>
                  </div>
                );
              })}
              {filteredChatList.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  No matches found
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Thread Window */}
          <div className={`chat-thread-container ${!activeChatPhone ? 'mobile-hidden' : ''}`}>
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div style={{ 
                  padding: '0.9rem 1.5rem', 
                  borderBottom: '1px solid var(--border)', 
                  background: 'rgba(0,0,0,0.12)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    
                    {/* Back Button on Mobile */}
                    <button 
                      onClick={() => setActiveChatPhone(null)}
                      style={{ 
                        marginRight: 4, 
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        padding: 6,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>

                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
                        {formatSenderName(activeChat.clientName).main}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <span>+{activeChat.phoneNumber}</span>
                        {formatSenderName(activeChat.clientName).sub && (
                          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            • {formatSenderName(activeChat.clientName).sub}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contextual Actions (View client profile index link) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {activeClientProfile && (
                      <a 
                        href={`/dashboard/clients/${activeClientProfile.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(200, 169, 110, 0.08)',
                          border: '1px solid rgba(200, 169, 110, 0.25)',
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          color: 'var(--accent)',
                          fontWeight: 500,
                          transition: 'all 0.15s ease',
                          cursor: 'pointer'
                        }}
                      >
                        Client Profile <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Conversation Message Stream */}
                <div 
                  className="custom-scrollbar"
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1.5rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem' 
                  }}
                >
                  {activeChat.messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'outbound';
                    const parsed = isOutbound ? parseMessageBody(msg.message_body) : null;
                    
                    // Look up preceding outbound message as replied-to context
                    let precedingOutbound: WhatsAppMessage | null = null;
                    let precedingOutboundParsed: ParsedTemplate | null = null;
                    
                    if (!isOutbound) {
                      for (let i = idx - 1; i >= 0; i--) {
                        if (activeChat.messages[i].direction === 'outbound') {
                          precedingOutbound = activeChat.messages[i];
                          precedingOutboundParsed = parseMessageBody(precedingOutbound.message_body);
                          break;
                        }
                      }
                    }

                    return (
                      <div 
                        key={msg.id} 
                        style={{ 
                          alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isOutbound ? 'flex-end' : 'flex-start',
                          gap: 3
                        }}
                      >
                        {/* Bubble Message Card */}
                        <div 
                          className="glass-panel"
                          style={{
                            padding: '1rem',
                            borderRadius: 14,
                            borderTopRightRadius: isOutbound ? 2 : 14,
                            borderTopLeftRadius: isOutbound ? 14 : 2,
                            background: isOutbound 
                              ? 'rgba(200, 169, 110, 0.04)' 
                              : 'var(--bg-elevated)',
                            border: isOutbound 
                              ? '1px solid rgba(200, 169, 110, 0.18)' 
                              : '1px solid var(--border)',
                            borderLeftWidth: isOutbound ? 3 : 1,
                            borderLeftColor: isOutbound ? 'var(--accent)' : 'var(--border)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                            minWidth: 150
                          }}
                        >
                          {/* Replied-To Context quote box for inbound replies */}
                          {precedingOutbound && (
                            <div style={{ 
                              background: 'rgba(0, 0, 0, 0.18)', 
                              borderLeft: '3px solid var(--accent)', 
                              padding: '6px 10px', 
                              borderRadius: 6, 
                              fontSize: '0.75rem', 
                              marginBottom: 10, 
                              color: 'var(--text-secondary)',
                              opacity: 0.9,
                              maxWidth: '100%',
                              overflow: 'hidden'
                            }}>
                              <div style={{ fontWeight: 700, fontSize: '0.65rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>
                                Replied to message
                              </div>
                              <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {precedingOutboundParsed?.isTemplate ? precedingOutboundParsed.summary : precedingOutbound.message_body}
                              </div>
                            </div>
                          )}

                          {/* Render bubble body */}
                          {isOutbound && parsed?.isTemplate ? (
                            <OutboundTemplateCard parsed={parsed} />
                          ) : (
                            <p style={{ 
                              margin: 0, 
                              fontSize: '0.875rem', 
                              color: 'var(--text)', 
                              lineHeight: 1.5, 
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {msg.message_body}
                            </p>
                          )}
                        </div>

                        {/* Timestamp & Status footer */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          fontSize: '0.675rem', 
                          color: 'var(--text-tertiary)',
                          padding: '0 4px'
                        }}>
                          <Clock size={10} style={{ opacity: 0.7 }} />
                          {new Date(msg.created_at).toLocaleString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                          {isOutbound && (
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Sent</span>
                          )}
                          {!isOutbound && msg.status === 'received' && (
                            <span style={{ color: '#6aaa84', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <span style={{ width: 5, height: 5, background: '#6aaa84', borderRadius: '50%' }} /> New
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Anchor for Auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              // Empty thread state
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--text-tertiary)',
                padding: '2rem'
              }}>
                <MessageSquare size={40} style={{ marginBottom: 12, opacity: 0.15 }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Select a Conversation</p>
                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Choose a client thread from the list to view replies</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
