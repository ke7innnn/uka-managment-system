'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const addLog = (msg: string) => setLogs(p => [...p, msg]);

  useEffect(() => {
    async function run() {
      addLog('🔍 Fetching ALL documents from Supabase DB...');
      const { data: allDocs, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (docErr) {
        addLog('❌ Error fetching docs: ' + docErr.message);
        setLoading(false);
        return;
      }

      addLog(`✅ Found ${allDocs?.length ?? 0} total document records in Supabase DB`);

      if (!allDocs || allDocs.length === 0) {
        addLog('⚠️ No documents exist in the database at all. They were deleted.');
        setLoading(false);
        return;
      }

      setDocs(allDocs);

      // Now check storage for first 5
      addLog('\n--- Checking Storage accessibility for first 5 docs ---');
      for (const doc of allDocs.slice(0, 5)) {
        const url = doc.url;
        addLog(`\n📄 Doc: "${doc.name}" | Client ID: ${doc.client_id}`);
        addLog(`   URL: ${url}`);

        if (url && url.includes('/public/uka-storage/')) {
          const path = url.split('/public/uka-storage/')[1];
          addLog(`   Storage Path: ${path}`);
          const { data: fileData, error: fileErr } = await supabase.storage
            .from('uka-storage')
            .download(path);

          if (fileErr) {
            addLog(`   ❌ Storage fetch FAILED: ${fileErr.message}`);
          } else {
            addLog(`   ✅ Storage file EXISTS! Size: ${fileData?.size} bytes`);
          }
        } else if (url && url.startsWith('data:')) {
          addLog(`   ℹ️ This is a local Base64 data URL (not from Supabase Storage)`);
        } else {
          addLog(`   ⚠️ Unknown URL format`);
        }
      }

      setLoading(false);
    }
    run();
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace', fontSize: '13px', background: '#0d0d0d', minHeight: '100vh', color: '#e0e0e0' }}>
      <h1 style={{ color: '#c8a96e', marginBottom: '16px' }}>🛠 Supabase Storage Debug</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>This page checks your Supabase database and storage bucket directly.</p>

      {loading && <p style={{ color: '#888' }}>Loading...</p>}

      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
        <h2 style={{ color: '#aaa', fontSize: '14px', marginBottom: '12px' }}>📋 Logs</h2>
        {logs.map((l, i) => (
          <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', color: l.startsWith('❌') ? '#f87171' : l.startsWith('✅') ? '#4ade80' : l.startsWith('⚠️') ? '#facc15' : '#ddd' }}>
            {l}
          </div>
        ))}
      </div>

      {docs.length > 0 && (
        <div>
          <h2 style={{ color: '#c8a96e', fontSize: '16px', marginBottom: '12px' }}>📁 All Documents in DB ({docs.length})</h2>
          {docs.map((doc, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
              <strong style={{ color: '#fff' }}>{doc.name}</strong>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                <span>Client ID: {doc.client_id}</span> ·{' '}
                <span>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</span> ·{' '}
                <span>Size: {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Unknown'}</span>
              </div>
              <div style={{ color: '#555', fontSize: '11px', marginTop: '4px', wordBreak: 'break-all' }}>
                URL: {doc.url?.substring(0, 120)}...
              </div>
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                style={{ color: '#c8a96e', fontSize: '12px', marginTop: '6px', display: 'inline-block' }}>
                Open →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
