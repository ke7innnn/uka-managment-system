'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => setLogs(p => [...p, msg]);

  useEffect(() => {
    async function run() {
      addLog('Starting debug...');
      const { data: docs, error: docErr } = await supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(5);
      if (docErr) { addLog('Error fetching docs: ' + docErr.message); return; }
      
      addLog('Fetched ' + docs?.length + ' docs from DB');
      if (!docs || docs.length === 0) return;
      
      const url = docs[0].url;
      addLog('Latest Doc URL: ' + url);
      
      if (url.includes('/public/uka-storage/')) {
        const path = url.split('/public/uka-storage/')[1];
        addLog('Extracted Path: ' + path);
        
        // Check if object exists using download
        const { data: fileData, error: fileErr } = await supabase.storage.from('uka-storage').download(path);
        if (fileErr) {
          addLog('Download error: ' + fileErr.message);
        } else {
          addLog('Download SUCCESS! Size: ' + fileData?.size);
        }
        
        // List directory
        const dirParts = path.split('/');
        const dir = dirParts.slice(0, dirParts.length - 1).join('/');
        addLog('Listing directory: ' + dir);
        const { data: listData, error: listErr } = await supabase.storage.from('uka-storage').list(dir);
        if (listErr) {
          addLog('List error: ' + listErr.message);
        } else {
          addLog('List results: ' + JSON.stringify(listData.map(f => f.name)));
        }
      }
    }
    run();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Storage</h1>
      {logs.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}
