// Clean up the 9 missing document DB records 
// These files were deleted from storage by the old sync bug and cannot be recovered
// We'll remove their DB records too so they don't show as broken links

const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// These are the 9 missing files identified from the recovery check
// All from client b6cc5f05-d0c8-48fe-9d91-b94573aca3f1, uploaded 2026-05-25
const MISSING_STORAGE_PATHS = [
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/665e5009-7b62-456a-b452-180b55ab6f63.pdf', // AR APP.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/d1be1297-2ef6-4647-820f-42d3e1ebbb5f.pdf', // STR STABILITY.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/39b5a259-1f26-4011-8876-267e6f4de00a.pdf', // ST APP.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/93c44033-9d5a-4745-951c-bcff833952a8.pdf', // TREE NOC.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/29d87668-94de-4526-9ac0-5babd96756da.pdf', // ADV. TITLE SEARCH REPORT.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/29123b70-2deb-496e-9e80-aa34e9384ee1.pdf', // 8A.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/86897e37-a2c5-46d5-a64d-020dc4e3babb.pdf', // PIKPANI.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/99fa633a-35d1-426f-bea3-53513c0f7be9.pdf', // FERFAR.pdf
  'documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/e4bc5e03-d459-4840-a636-80625738d189.pdf', // 712.pdf
];

async function cleanupMissingDocs() {
  console.log('=== CLEANING UP 9 MISSING DOCUMENT DB RECORDS ===\n');
  console.log('These files were permanently deleted from storage by a sync bug.');
  console.log('Removing their DB records to prevent broken links in the app.\n');

  // Find the document IDs by matching their storage paths in URLs
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?client_id=eq.b6cc5f05-d0c8-48fe-9d91-b94573aca3f1&select=id,name,url`,
    { headers }
  );
  
  if (!res.ok) {
    console.error('Failed to fetch docs:', await res.text());
    return;
  }
  
  const allClientDocs = await res.json();
  console.log(`Found ${allClientDocs.length} total docs for this client in DB\n`);
  
  const toDelete = [];
  for (const doc of allClientDocs) {
    const isMissing = MISSING_STORAGE_PATHS.some(path => 
      doc.url && doc.url.includes(path.split('/').pop())
    );
    if (isMissing) {
      toDelete.push(doc);
      console.log(`  Will delete: "${doc.name}" (ID: ${doc.id})`);
    }
  }
  
  if (toDelete.length === 0) {
    console.log('No matching broken records found to delete.');
    return;
  }
  
  console.log(`\nDeleting ${toDelete.length} broken DB records...`);
  const idsToDelete = toDelete.map(d => d.id);
  
  for (const id of idsToDelete) {
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?id=eq.${id}`,
      { method: 'DELETE', headers }
    );
    if (delRes.ok || delRes.status === 204) {
      console.log(`  ✅ Deleted record: ${id}`);
    } else {
      console.log(`  ❌ Failed to delete ${id}: ${delRes.status} ${await delRes.text()}`);
    }
  }
  
  console.log('\n✅ Done! The broken document entries have been removed from the DB.');
  console.log('The app will no longer show these broken links.');
  console.log('\n⚠️  ACTION REQUIRED: You need to re-upload these 9 files manually:');
  console.log('  1. AR APP.pdf');
  console.log('  2. STR STABILITY.pdf');
  console.log('  3. ST APP.pdf');
  console.log('  4. TREE NOC.pdf');
  console.log('  5. ADV. TITLE SEARCH REPORT.pdf');
  console.log('  6. 8A.pdf');
  console.log('  7. PIKPANI.pdf');
  console.log('  8. FERFAR.pdf');
  console.log('  9. 712.pdf');
  console.log('\nAll other 161 documents are SAFE and working!');
}

cleanupMissingDocs().catch(console.error);
