// Examine unclassified PDFs to print text details for manual rules expansion
import { PDFParse } from 'pdf-parse';

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
  console.log(`Checking text for ${docs.length} documents...`);

  for (const doc of docs) {
    if (!doc.url) continue;
    try {
      const response = await fetch(doc.url);
      if (!response.ok) continue;
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      if (uint8Array.length === 0) continue;

      if (uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
        continue;
      }

      const parser = new PDFParse({ data: uint8Array });
      const result = await parser.getText({ first: 3 });
      const cleanText = (result.text || '').replace(/\s+/g, ' ').trim();
      
      if (cleanText.replace(/-- \d+ of \d+ --/g, '').trim().length > 10) {
        console.log(`\n📄 [${doc.name}] (${Math.round(doc.size/1024)}KB)`);
        console.log(`   Text: "${cleanText.substring(0, 400)}"`);
      }
    } catch (e) {
      // ignore
    }
  }
}

main().catch(console.error);
