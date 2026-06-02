// Recovery script - checks Supabase DB vs Storage and lists ALL files
const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function fetchAll(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`REST error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listStorageFolder(folder) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/uka-storage`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix: folder, limit: 1000 })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Storage list error: ${res.status} ${txt}`);
  }
  return res.json();
}

async function checkFileExists(storagePath) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/uka-storage/${storagePath}`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.status === 200;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== UKA SUPABASE STORAGE RECOVERY CHECK ===\n');

  // 1. Get all DB document records
  console.log('Step 1: Fetching all document records from DB...');
  const docs = await fetchAll('documents?select=*&order=uploaded_at.desc');
  console.log(`  Found ${docs.length} document records in DB\n`);

  if (docs.length === 0) {
    console.log('⚠️  NO DOCUMENTS IN DB AT ALL. All records were deleted.\n');
  }

  // 2. List root of storage bucket
  console.log('Step 2: Listing Supabase Storage bucket root...');
  let rootFiles = [];
  try {
    rootFiles = await listStorageFolder('');
    console.log(`  Root items: ${rootFiles.map(f => f.name).join(', ')}\n`);
  } catch (e) {
    console.log(`  ❌ Failed to list root: ${e.message}\n`);
  }

  // 3. List 'documents' folder in storage
  console.log('Step 3: Listing storage/documents/ folder...');
  let docFolders = [];
  try {
    docFolders = await listStorageFolder('documents');
    console.log(`  Found ${docFolders.length} client folders in storage:\n`);
    for (const f of docFolders) {
      console.log(`    📁 ${f.name} (${f.metadata ? 'file' : 'folder'})`);
    }
  } catch (e) {
    console.log(`  ❌ Failed to list documents folder: ${e.message}\n`);
  }

  // 4. Check each DB document's URL against storage
  if (docs.length > 0) {
    console.log('\nStep 4: Checking each DB document against Supabase Storage...\n');
    let found = 0, missing = 0, nonStorage = 0;
    const missingDocs = [];

    for (const doc of docs) {
      const url = doc.url;
      if (!url) {
        console.log(`  ⚠️  "${doc.name}" has NO URL`);
        missing++;
        missingDocs.push(doc);
        continue;
      }
      if (url.startsWith('data:')) {
        nonStorage++;
        continue;
      }
      // Extract storage path
      const match = url.match(/\/public\/uka-storage\/(.+)/);
      if (!match) {
        console.log(`  ⚠️  "${doc.name}" has unknown URL format: ${url.substring(0,80)}`);
        nonStorage++;
        continue;
      }
      const storagePath = match[1];
      const exists = await checkFileExists(storagePath);
      if (exists) {
        found++;
        console.log(`  ✅ "${doc.name}" → EXISTS in Storage`);
      } else {
        missing++;
        missingDocs.push({ ...doc, storagePath });
        console.log(`  ❌ "${doc.name}" → MISSING from Storage! Path: ${storagePath}`);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`  ✅ Files found in Storage: ${found}`);
    console.log(`  ❌ Files MISSING from Storage: ${missing}`);
    console.log(`  ℹ️  Non-storage (data URLs): ${nonStorage}`);

    if (missingDocs.length > 0) {
      console.log(`\n=== MISSING FILES DETAIL ===`);
      for (const d of missingDocs) {
        console.log(`  - "${d.name}" | Client: ${d.client_id} | Uploaded: ${d.uploaded_at}`);
        console.log(`    URL: ${d.url}`);
      }
    }
  }

  // 5. List ALL files in every client subfolder in storage
  console.log('\nStep 5: Deep-listing ALL files in storage...\n');
  let totalStorageFiles = 0;
  for (const folder of docFolders) {
    const clientId = folder.name;
    try {
      const files = await listStorageFolder(`documents/${clientId}`);
      if (files.length > 0) {
        console.log(`📁 Client ${clientId}: ${files.length} file(s)`);
        for (const f of files) {
          const fUrl = `${SUPABASE_URL}/storage/v1/object/public/uka-storage/documents/${clientId}/${f.name}`;
          console.log(`   - ${f.name} (${f.metadata?.size ? Math.round(f.metadata.size/1024) + 'KB' : 'unknown size'})`);
          totalStorageFiles++;
        }
      }
    } catch (e) {
      console.log(`  ❌ Error listing ${clientId}: ${e.message}`);
    }
  }
  console.log(`\nTotal files physically in Storage: ${totalStorageFiles}`);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
