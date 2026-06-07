'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

const CLIENT_VERSION = '1.0.7'; // Matches version.json initially

export default function UpdateNotification() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check version function
    const checkVersion = async () => {
      try {
        // Add random query param to bypass cache for the version check itself
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.version && data.version !== CLIENT_VERSION) {
          setHasUpdate(true);
        }
      } catch (e) {
        console.warn('Failed to check for app updates:', e);
      }
    };

    // Initial check on load
    checkVersion();

    // Poll version check every 60 seconds
    const interval = setInterval(checkVersion, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      // 1. Clear cache storage if supported
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 2. Unregister any service workers to ensure new scripts load
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch (err) {
      console.error('Error clearing cache on update:', err);
    } finally {
      // 3. Perform a clean hard reload of the page
      window.location.reload();
    }
  };

  if (!hasUpdate) return null;

  return (
    <div className="update-modal-overlay">
      <div className="update-modal-container">
        <div className="update-modal-glow" />
        <div className="update-modal-content">
          <div className="update-icon-wrapper">
            <RefreshCw className={`update-icon ${updating ? 'spin' : ''}`} size={28} />
          </div>
          
          <h2 className="update-title">Update Available</h2>
          <p className="update-description">
            A new version of the <strong>UKA Management System</strong> is ready. 
            Update now to apply the new brand logo and synchronize core updates.
          </p>

          <button 
            onClick={handleUpdate} 
            disabled={updating}
            className="update-action-btn"
          >
            {updating ? (
              <>
                <RefreshCw className="btn-icon spin" size={16} />
                <span>Applying Updates...</span>
              </>
            ) : (
              <>
                <Sparkles className="btn-icon" size={16} />
                <span>Update Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .update-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(4, 5, 8, 0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          padding: 1.5rem;
          animation: updateFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .update-modal-container {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: rgba(18, 20, 26, 0.85);
          border: 1px solid rgba(147, 112, 219, 0.25);
          border-radius: 18px;
          padding: 2.25rem 2rem;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 
                      0 0 30px rgba(124, 58, 237, 0.1);
          transform: translateY(20px);
          animation: updateSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards;
        }

        .update-modal-glow {
          position: absolute;
          top: -20%;
          left: -20%;
          width: 140%;
          height: 140%;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .update-modal-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .update-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(124, 58, 237, 0.12);
          border: 1px solid rgba(124, 58, 237, 0.25);
          color: #a78bfa;
          margin-bottom: 1.25rem;
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.15);
        }

        .update-icon {
          animation: pulseIcon 2.5s infinite ease-in-out;
        }

        .update-icon.spin {
          animation: spinIcon 1s linear infinite !important;
        }

        .update-title {
          font-family: inherit;
          font-size: 1.35rem;
          font-weight: 700;
          color: #f3f4f6;
          margin-bottom: 0.75rem;
          letter-spacing: 0.25px;
        }

        .update-description {
          font-size: 0.925rem;
          line-height: 1.55;
          color: #9ca3af;
          margin-bottom: 2rem;
        }

        .update-description strong {
          color: #e5e7eb;
          font-weight: 600;
        }

        .update-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.9rem 1.5rem;
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }

        .update-action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45),
                      0 0 10px rgba(167, 139, 250, 0.2);
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .update-action-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        .update-action-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
          background: #374151;
          box-shadow: none;
          color: #9ca3af;
        }

        .btn-icon {
          flex-shrink: 0;
        }

        .btn-icon.spin {
          animation: spinIcon 1s linear infinite;
        }

        @keyframes updateFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes updateSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseIcon {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.08) rotate(10deg);
          }
        }

        @keyframes spinIcon {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinIconReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
