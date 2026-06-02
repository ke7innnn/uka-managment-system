// Reset all document folders and subfolders to null for Chirag Raut (b6cc5f05)
const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const CLIENT_ID = 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1';

async function main() {
  console.log('=== UNCLASSIFYING CHIRAG RAUT\'S DOCUMENTS ===\n');

  const patchUrl = `${SUPABASE_URL}/rest/v1/documents?client_id=eq.${CLIENT_ID}`;
  const response = await fetch(patchUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      folder: null,
      subfolder: null
    })
  });

  if (response.ok || response.status === 204) {
    const updatedDocs = await response.json();
    console.log(`✅ Successfully reset ${updatedDocs.length} documents back to root level (unclassified).`);
  } else {
    console.error(`❌ Failed to update documents in Supabase: ${response.status} ${await response.text()}`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
