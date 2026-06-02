import { PDFParse } from 'pdf-parse';
import * as fs from 'fs';

const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';
const CLIENT_ID = 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?client_id=eq.${CLIENT_ID}&select=*&name=like.RECOVERED%25&order=uploaded_at.asc`,
    { headers }
  );
  const docs = await res.json();
  console.log(`Processing ${docs.length} documents...`);

  const results = [];

  for (const doc of docs) {
    if (!doc.url) continue;
    console.log(`Reading ${doc.name}...`);
    try {
      const response = await fetch(doc.url);
      if (!response.ok) {
        results.push({ name: doc.name, error: `HTTP ${response.status}`, size: doc.size });
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      if (uint8Array.length === 0) {
        results.push({ name: doc.name, error: 'Empty file', size: doc.size });
        continue;
      }

      if (uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
        results.push({ name: doc.name, error: 'Not a PDF', size: doc.size });
        continue;
      }

      const parser = new PDFParse({ data: uint8Array });
      const result = await parser.getText({});
      
      results.push({
        name: doc.name,
        id: doc.id,
        url: doc.url,
        size: doc.size,
        pages: result.total,
        text: (result.text || '').substring(0, 4000)
      });
    } catch (e) {
      results.push({ name: doc.name, error: e.message, size: doc.size });
    }
  }

  fs.writeFileSync(
    '/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/all_chirag_texts.json',
    JSON.stringify(results, null, 2)
  );
  console.log('Saved all texts to scripts/all_chirag_texts.json');
}

main().catch(console.error);
