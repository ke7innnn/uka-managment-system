// RESTORE all 76 orphan documents for Chirag Raut (b6cc5f05)
// These files exist in storage but have no DB records — the records were wiped by the sync bug.
// We re-create DB records for all of them so they appear in the app and can be opened.

const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const CLIENT_ID = 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1';

async function listStorageFolder(prefix) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/uka-storage`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 })
  });
  if (!res.ok) throw new Error(`Storage list error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertDocRecord(doc) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(doc)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Insert error: ${res.status} ${err}`);
  }
  return res.json();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getMimeType(filename) {
  if (filename.endsWith('.pdf')) return 'application/pdf';
  if (filename.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (filename.endsWith('.doc')) return 'application/msword';
  if (filename.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function main() {
  console.log('=== RESTORING DOCUMENTS FOR CHIRAG RAUT (SHREE RAM DEEP) ===\n');
  console.log(`Client ID: ${CLIENT_ID}\n`);

  // List all files in storage for this client
  const storageFiles = await listStorageFolder(`documents/${CLIENT_ID}`);
  console.log(`Found ${storageFiles.length} files in storage\n`);

  if (storageFiles.length === 0) {
    console.log('❌ No files found in storage!');
    return;
  }

  // Check what's already in DB
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/documents?client_id=eq.${CLIENT_ID}&select=url`, { headers });
  const existingDocs = await dbRes.json();
  const existingUrls = new Set(existingDocs.map(d => d.url));
  console.log(`Existing DB records: ${existingDocs.length}\n`);

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of storageFiles) {
    const fileName = file.name;
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/uka-storage/documents/${CLIENT_ID}/${fileName}`;
    const fileSize = file.metadata?.size || 0;
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // Skip if already in DB
    if (existingUrls.has(fileUrl)) {
      skipped++;
      continue;
    }

    // Generate a display name based on file UUID 
    // Files are named as UUIDs — we'll use "RECOVERED - {short UUID}.{ext}" as name
    // so admins know to rename them appropriately
    const shortId = fileName.substring(0, 8).toUpperCase();
    const displayName = `RECOVERED-${shortId}.${ext}`;
    
    const doc = {
      id: generateUUID(),
      client_id: CLIENT_ID,
      name: displayName,
      url: fileUrl,
      uploaded_at: file.created_at || new Date().toISOString(),
      type: getMimeType(fileName),
      size: fileSize,
      uploaded_by: null,
      folder: null,       // No folder info — admin must re-organize
      subfolder: null
    };

    try {
      await insertDocRecord(doc);
      console.log(`  ✅ Restored: ${displayName} (${Math.round(fileSize/1024)}KB)`);
      restored++;
    } catch (e) {
      console.log(`  ❌ Failed to restore ${fileName}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== RESTORATION COMPLETE ===`);
  console.log(`  ✅ Restored: ${restored} files`);
  console.log(`  ⏭️  Skipped (already in DB): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`\n⚠️  ACTION REQUIRED:`);
  console.log(`  All ${restored} files have been restored with generic names (RECOVERED-XXXXXXXX.pdf).`);
  console.log(`  Please go to the client's document page and rename each file to its proper name.`);
  console.log(`  The files ARE the originals — only the names were lost, not the content.`);
  
  // Also fix the client name/UIN issue — check what's in DB
  console.log('\n=== CHECKING CLIENT NAME & UIN ===');
  const clientRes = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${CLIENT_ID}&select=id,name,company,client_id,kyc`,
    { headers }
  );
  const clients = await clientRes.json();
  if (clients.length > 0) {
    const c = clients[0];
    console.log(`  Name in DB: "${c.name}"`);
    console.log(`  Company: "${c.company}"`);
    console.log(`  client_id field: "${c.client_id}"`);
    console.log(`  KYC clientUin: "${c.kyc?.clientUin || 'NOT SET'}"`);
    console.log(`\n  ℹ️  The "client_id" field currently contains an email: "${c.client_id}"`);
    console.log(`  This is being shown as the Client ID in the UI.`);
    console.log(`  To fix: go to client edit page and update the Client ID and UIN fields.`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
