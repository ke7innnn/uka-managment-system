// Find SHREE RAM DEEP / CHIRAG RAUT client and diagnose all issues
const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function fetchJSON(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function listStorageFolder(prefix) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/uka-storage`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix, limit: 1000 })
  });
  if (!res.ok) return [];
  return res.json();
}

async function checkFileExists(path) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/uka-storage/${path}`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.status === 200;
  } catch { return false; }
}

async function main() {
  console.log('=== SEARCHING FOR: SHREE RAM DEEP / CHIRAG RAUT ===\n');

  // Search all clients
  const allClients = await fetchJSON('clients?select=id,name,company,project_name,client_id,kyc,created_at&order=created_at.desc');
  console.log(`Total clients in DB: ${allClients.length}\n`);

  // Filter by name
  const keywords = ['chirag', 'raut', 'shree', 'ram', 'deep'];
  const matches = allClients.filter(c => {
    const haystack = `${c.name} ${c.company || ''} ${c.project_name || ''} ${JSON.stringify(c.kyc || {})}`.toLowerCase();
    return keywords.some(k => haystack.includes(k));
  });

  if (matches.length === 0) {
    console.log('❌ No client found matching CHIRAG RAUT or SHREE RAM DEEP');
    console.log('\nAll client names:');
    allClients.forEach(c => console.log(`  - ${c.name} | company: ${c.company || 'N/A'} | project: ${c.project_name || 'N/A'} | id: ${c.id}`));
    return;
  }

  console.log(`Found ${matches.length} matching client(s):\n`);

  for (const client of matches) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CLIENT ID: ${client.id}`);
    console.log(`Name: ${client.name}`);
    console.log(`Company: ${client.company || 'N/A'}`);
    console.log(`Project: ${client.project_name || 'N/A'}`);
    console.log(`Client ID (UIN field): ${client.client_id || 'N/A'}`);
    console.log(`KYC clientUin: ${client.kyc?.clientUin || 'N/A'}`);
    console.log(`KYC applicantName: ${client.kyc?.applicantName || 'N/A'}`);
    console.log(`Created: ${client.created_at}`);

    // Get documents
    const docs = await fetchJSON(`documents?client_id=eq.${client.id}&select=*`);
    console.log(`\nDocuments in DB: ${docs.length}`);

    if (docs.length === 0) {
      console.log('⚠️  NO DOCUMENTS IN DB FOR THIS CLIENT');
    } else {
      for (const doc of docs) {
        const exists = doc.url && !doc.url.startsWith('data:') 
          ? await checkFileExists(doc.url.split('/public/uka-storage/')[1] || '')
          : doc.url ? true : false;
        const status = exists ? '✅' : '❌';
        console.log(`  ${status} "${doc.name}" | folder: ${doc.folder || 'none'} | subfolder: ${doc.subfolder || 'none'}`);
        if (!exists) console.log(`       URL: ${doc.url}`);
      }
    }

    // Check storage
    console.log(`\nStorage files for client ${client.id}:`);
    const storageFiles = await listStorageFolder(`documents/${client.id}`);
    if (storageFiles.length === 0) {
      console.log('  ⚠️  NO FILES IN STORAGE for this client folder');
    } else {
      console.log(`  Found ${storageFiles.length} physical files in storage:`);
      for (const f of storageFiles) {
        const sizeKB = f.metadata?.size ? Math.round(f.metadata.size / 1024) : '?';
        const url = `${SUPABASE_URL}/storage/v1/object/public/uka-storage/documents/${client.id}/${f.name}`;
        // Check if this file has a corresponding DB record
        const inDB = docs.some(d => d.url && d.url.includes(f.name));
        const dbStatus = inDB ? '✅ in DB' : '⚠️  ORPHAN (in storage but no DB record)';
        console.log(`  📄 ${f.name} (${sizeKB}KB) — ${dbStatus}`);
        if (!inDB) console.log(`       URL: ${url}`);
      }
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
