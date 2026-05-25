'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CloudOff, Info, X } from 'lucide-react';

export default function SupabaseConnectionWarning() {
  const [isMissingKeys, setIsMissingKeys] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if Supabase keys are configured in environment
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setIsMissingKeys(true);
    }

    // 2. Listen to custom sync failure and success events
    const handleSyncFailure = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSyncError(customEvent.detail || 'Network or database Scrutiny failure');
    };

    const handleSyncComplete = () => {
      setSyncError(null);
    };

    window.addEventListener('uka-sync-failed', handleSyncFailure);
    window.addEventListener('uka-sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('uka-sync-failed', handleSyncFailure);
      window.removeEventListener('uka-sync-complete', handleSyncComplete);
    };
  }, []);

  if (dismissed) return null;

  const showWarning = isMissingKeys || syncError;
  if (!showWarning) return null;

  return (
    <div className="supabase-warning-container animate-fade-in">
      <div className="supabase-warning-banner">
        <div className="supabase-warning-glow" />
        <div className="supabase-warning-content">
          <div className="supabase-warning-icon-wrapper">
            {isMissingKeys ? (
              <CloudOff className="supabase-warning-icon text-red" size={20} />
            ) : (
              <AlertCircle className="supabase-warning-icon text-amber" size={20} />
            )}
          </div>
          <div className="supabase-warning-text-group">
            <h4 className="supabase-warning-title">
              {isMissingKeys ? 'Database Sync Offline (Keys Missing)' : 'Supabase Synchronization Issue'}
            </h4>
            <p className="supabase-warning-desc">
              {isMissingKeys ? (
                <>
                  Environment variables <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and{' '}
                  <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> are missing on this host. 
                  Clients, messages, and all workspace data will show as <strong>0</strong> because the app cannot connect to your cloud database.
                  <span className="supabase-warning-action">
                    <strong>Solution:</strong> Please add these variables to your <strong>Vercel Settings → Environment Variables</strong> and re-deploy!
                  </span>
                </>
              ) : (
                <>
                  The last attempt to synchronize data with Supabase failed: <code className="supabase-warning-code">{syncError}</code>. 
                  Please check your internet connection or database access rules.
                </>
              )}
            </p>
          </div>
          <button 
            onClick={() => setDismissed(true)} 
            className="supabase-warning-dismiss"
            aria-label="Dismiss warning"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .supabase-warning-container {
          margin-bottom: 1.5rem;
          width: 100%;
        }
        .supabase-warning-banner {
          position: relative;
          background: rgba(20, 20, 20, 0.6);
          border: 1px solid ${isMissingKeys ? 'rgba(192, 96, 96, 0.35)' : 'rgba(200, 169, 110, 0.35)'};
          border-radius: var(--radius-lg);
          padding: 1.15rem 1.5rem;
          overflow: hidden;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .supabase-warning-glow {
          position: absolute;
          top: -50%;
          left: -10%;
          width: 40%;
          height: 200%;
          background: ${isMissingKeys ? 'radial-gradient(circle, rgba(192, 96, 96, 0.12) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(200, 169, 110, 0.12) 0%, transparent 60%)'};
          pointer-events: none;
          z-index: 0;
        }
        .supabase-warning-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .supabase-warning-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius);
          background: ${isMissingKeys ? 'rgba(192, 96, 96, 0.12)' : 'rgba(200, 169, 110, 0.12)'};
          flex-shrink: 0;
          margin-top: 0.15rem;
        }
        .supabase-warning-icon.text-red {
          color: var(--red, #c06060);
        }
        .supabase-warning-icon.text-amber {
          color: var(--amber, #c8a96e);
        }
        .supabase-warning-text-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .supabase-warning-title {
          font-family: var(--font);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.25px;
        }
        .supabase-warning-desc {
          font-size: 0.85rem;
          line-height: 1.45;
          color: var(--text-secondary);
        }
        .supabase-warning-desc strong {
          color: var(--text);
          font-weight: 600;
        }
        .supabase-warning-action {
          display: block;
          margin-top: 0.5rem;
          padding: 0.6rem 0.8rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.03);
          border-left: 3px solid ${isMissingKeys ? 'var(--red, #c06060)' : 'var(--amber, #c8a96e)'};
          font-size: 0.825rem;
          color: var(--text);
        }
        .supabase-warning-code {
          background: rgba(255, 255, 255, 0.06);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-family: monospace;
          color: var(--amber, #c8a96e);
          font-size: 0.8rem;
        }
        .supabase-warning-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: transparent;
          color: var(--text-tertiary);
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
          margin-top: -0.25rem;
          margin-right: -0.5rem;
        }
        .supabase-warning-dismiss:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }
        @media (max-width: 768px) {
          .supabase-warning-content {
            gap: 0.75rem;
          }
          .supabase-warning-banner {
            padding: 1rem;
          }
          .supabase-warning-icon-wrapper {
            width: 30px;
            height: 30px;
          }
          .supabase-warning-title {
            font-size: 0.9rem;
          }
          .supabase-warning-desc {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
