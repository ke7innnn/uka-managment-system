import { useEffect, useState, useRef } from 'react';
import { WorkspaceMessage, getWorkspaceMessages, addWorkspaceMessage, deleteWorkspaceMessage, getStaff, setWorkspaceLastRead } from '@/lib/store';
import { Send, Hash, Info, User, Trash2 } from 'lucide-react';
import styles from './WorkspaceChat.module.css';

interface WorkspaceChatProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
}

export default function WorkspaceChat({ currentUserId, currentUserName, currentUserRole }: WorkspaceChatProps) {
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [input, setInput] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastNotifiedId = useRef<string>('');

  const getPingTargets = () => {
    const staffList = getStaff().map(s => s.name);
    return ['Umesh Kekre', 'Admin', ...staffList];
  };

  const loadMessages = () => {
    setMessages(getWorkspaceMessages());
    setWorkspaceLastRead(); // Automatically mark messages as read
  };

  useEffect(() => {
    loadMessages();
    const handleSync = () => loadMessages();
    window.addEventListener('uka-workspace-sync-complete', handleSync);
    
    // Polling as a fallback to keep chats in sync if multiple tabs are open
    const interval = setInterval(loadMessages, 5000);

    // Request notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('uka-workspace-sync-complete', handleSync);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Mentions and Ping Audio synthesized Alerts
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const isFromMe = latest.senderId === currentUserId;
    
    if (isFromMe || latest.id === lastNotifiedId.current) return;
    
    const mentionText1 = `@${currentUserName}`;
    const mentionText2 = `@${currentUserRole}`;
    const hasMention = latest.content.toLowerCase().includes(mentionText1.toLowerCase()) || 
                      latest.content.toLowerCase().includes(mentionText2.toLowerCase()) ||
                      (currentUserRole === 'Admin' && latest.content.toLowerCase().includes('@admin'));
                      
    if (hasMention) {
      lastNotifiedId.current = latest.id;
      
      // Beautiful audio cue (synthesized oscillator)
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 elegant tone
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.35);
        setTimeout(() => osc.stop(), 400);
      } catch (e) {}

      // Browser Popups
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`Workspace Ping from ${latest.senderName}`, {
          body: latest.content,
          icon: '/icon.png'
        });
      }
    }
  }, [messages, currentUserName, currentUserRole, currentUserId]);

  const handleInputChange = (val: string) => {
    setInput(val);
    
    // Mention Suggestion triggers
    const lastWord = val.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1).toLowerCase();
      setSuggestQuery(query);
      const targets = getPingTargets();
      const filtered = targets.filter(t => t.toLowerCase().includes(query));
      setMentionSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (name: string) => {
    const words = input.split(/\s+/);
    words.pop(); // Remove `@typed`
    words.push(`@${name}`);
    setInput(words.join(' ') + ' ');
    setShowSuggestions(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    addWorkspaceMessage(currentUserId, currentUserName, currentUserRole, input.trim());
    setInput('');
    setShowSuggestions(false);
    loadMessages();
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9\s\-\.\'\_\u00c0-\u017f]+)/g);
    const targets = getPingTargets().map(t => `@${t}`.toLowerCase());

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const potentialName = part.slice(1).trim().toLowerCase();
        const isTarget = targets.some(t => t.includes(potentialName) || potentialName.includes(t.slice(1)));
        
        if (isTarget) {
          return (
            <span key={index} className={styles.mentionHighlight}>
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.hashIcon}><Hash size={20} strokeWidth={2} /></div>
          <div>
            <h2 className={styles.chatTitle}>Workspace</h2>
            <p className={styles.chatSubtitle}>Group chat for all Admin and Staff. Messages delete automatically after 3 days.</p>
          </div>
        </div>
      </div>

      <div className={styles.messagesArea} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <Info size={40} className={styles.emptyIcon} />
            <h3>Welcome to the Workspace</h3>
            <p>This is a shared space for everyone. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === currentUserId;
            const isAdmin = msg.senderRole === 'Admin';
            const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.isMe : ''}`}>
                {!isMe && showHeader && (
                  <div className={styles.avatarWrap}>
                    <div className={`${styles.avatar} ${isAdmin ? styles.adminAvatar : ''}`}>
                      {msg.senderName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                
                <div className={styles.messageContent}>
                  {showHeader && (
                    <div className={styles.messageMeta}>
                      <span className={styles.senderName}>{msg.senderName}</span>
                      <span className={`${styles.senderRole} ${isAdmin ? styles.adminRole : ''}`}>
                        {msg.senderRole}
                      </span>
                      <span className={styles.time}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {(isMe || currentUserRole.toLowerCase().includes('admin')) && (
                        <button 
                          style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', marginLeft: 'auto', padding: '0 5px' }}
                          onClick={() => {
                            if (window.confirm('Delete this message for everyone?')) {
                              deleteWorkspaceMessage(msg.id);
                              loadMessages();
                            }
                          }}
                          title="Delete message for everyone"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                  <div className={`${styles.bubble} ${isMe ? styles.myBubble : styles.theirBubble}`}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.inputWrapperContainer}>
        {showSuggestions && (
          <div className={styles.suggestionsBox}>
            {mentionSuggestions.map((name, i) => (
              <button 
                key={name}
                type="button"
                className={styles.suggestionItem}
                onClick={() => selectSuggestion(name)}
              >
                <User size={14} className={styles.suggestIcon} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className={styles.inputArea}>
          <input
            type="text"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            placeholder="Message #workspace (type @ to ping)..."
            className={styles.inputField}
          />
          <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
            <Send size={18} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
