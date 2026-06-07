// Script to permanently delete ALL root-folder documents from Shreeram's client.
// ALSO writes a tombstone so they can never be re-pushed from localStorage cache.
// SAFE: Only touches Shreeram's client. Does NOT touch foldered documents or other clients.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

const SHREERAM_CLIENT_ID = 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔍 Fetching ALL documents for Shreeram (${SHREERAM_CLIENT_ID})...\n`);

  const { data: allDocs, error } = await supabase
    .from('documents')
    .select('id, name, folder, subfolder, uploaded_at')
    .eq('client_id', SHREERAM_CLIENT_ID);

  if (error) {
    console.error('❌ Error fetching documents:', error.message);
    process.exit(1);
  }

  console.log(`📋 Total documents in Shreeram's client: ${allDocs.length}`);

  // Root folder = no folder assigned
  const toDelete = allDocs.filter(d => !d.folder || d.folder === '' || d.folder === null);
  const toKeep   = allDocs.filter(d =>  d.folder && d.folder !== '');

  console.log(`\n✅ KEEPING — inside folders (${toKeep.length} documents):`);
  toKeep.forEach(d => console.log(`   - "${d.name}" | folder: ${d.folder} | subfolder: ${d.subfolder || 'none'}`));

  console.log(`\n🗑️  TO DELETE — root/staged files (${toDelete.length} documents):`);
  toDelete.forEach(d => console.log(`   - "${d.name}" | id: ${d.id}`));

  if (toDelete.length === 0) {
    console.log('\n✅ Root folder is already empty. Nothing to delete.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — nothing deleted. Remove --dry-run to execute.');
    return;
  }

  const idsToDelete = toDelete.map(d => d.id);

  // 1. Delete from Supabase
  console.log(`\n🗑️  Deleting ${idsToDelete.length} root documents from Supabase...`);
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .in('id', idsToDelete)
    .eq('client_id', SHREERAM_CLIENT_ID);

  if (deleteError) {
    console.error('❌ Supabase delete failed:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ Deleted from Supabase.');

  // 2. Write tombstone file so the app code can inject it into localStorage on next load
  // This prevents the browser localStorage cache from re-pushing them.
  const tombstonePath = path.join(process.cwd(), 'scripts', 'deleted_doc_ids_tombstone.json');
  let existing = [];
  if (fs.existsSync(tombstonePath)) {
    existing = JSON.parse(fs.readFileSync(tombstonePath, 'utf8'));
  }
  const merged = Array.from(new Set([...existing, ...idsToDelete]));
  fs.writeFileSync(tombstonePath, JSON.stringify(merged, null, 2));
  console.log(`✅ Tombstone written: ${tombstonePath}`);
  console.log(`   ${merged.length} total deleted document IDs recorded.`);

  // 3. Print a browser console snippet the user can run to clear localStorage too
  console.log('\n📋 IMPORTANT: Also run this in your browser console (F12 > Console) to clear the local cache:');
  console.log('──────────────────────────────────────────────────────────────────');
  console.log(`const deletedIds = ${JSON.stringify(idsToDelete)};`);
  console.log(`const raw = localStorage.getItem('uka_clients');`);
  console.log(`if (raw) {`);
  console.log(`  const clients = JSON.parse(raw);`);
  console.log(`  const updated = clients.map(c => c.id === '${SHREERAM_CLIENT_ID}' ? { ...c, documents: (c.documents || []).filter(d => !deletedIds.includes(d.id)) } : c);`);
  console.log(`  localStorage.setItem('uka_clients', JSON.stringify(updated));`);
  console.log(`  const existing = JSON.parse(localStorage.getItem('uka_deleted_doc_ids') || '[]');`);
  console.log(`  localStorage.setItem('uka_deleted_doc_ids', JSON.stringify([...new Set([...existing, ...deletedIds])]));`);
  console.log(`  console.log('✅ Local cache cleaned. Reload the page now.');`);
  console.log(`}`);
  console.log('──────────────────────────────────────────────────────────────────');

  console.log('\n✅ All foldered documents are untouched.');
  console.log('✅ No other clients were affected.');
}

main();
