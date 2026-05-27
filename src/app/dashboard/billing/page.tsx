'use client';

import { useState } from 'react';
import BillTemplate from '@/components/BillTemplate';
import { Receipt, FileText } from 'lucide-react';
import styles from '@/app/dashboard/reports/page.module.css'; // Reusing dashboard styles for card look

export default function AdminBillingPage() {
  const [showBillTemplate, setShowBillTemplate] = useState(false);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Billing & Invoicing</h1>
      
      {!showBillTemplate ? (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div 
            onClick={() => setShowBillTemplate(true)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '2rem',
              width: '300px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '50%' }}>
              <Receipt size={32} style={{ color: 'var(--text)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Create a Bill</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Generate a professional bill for development permissions</p>
            </div>
          </div>
          
          <div 
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '2rem',
              width: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              opacity: 0.6,
            }}
          >
            <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '50%' }}>
              <FileText size={32} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Quotations</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Coming soon...</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button 
            onClick={() => setShowBillTemplate(false)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              cursor: 'pointer',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            ← Back to Billing
          </button>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
            <BillTemplate />
          </div>
        </div>
      )}
    </div>
  );
}
