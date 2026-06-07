// Script to delete RECOVERED... documents from the ROOT folder of Shreeram's client page.
// SAFE: Only touches documents that:
//   1. Belong to Shreeram's specific client ID
//   2. Have a name starting with "RECOVERED"
//   3. Have NO folder assigned (root folder only)
// Does NOT touch any named documents, any other clients, or any foldered documents.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

// Shreeram's client ID (from the URL in your screenshot)
const SHREERAM_CLIENT_ID = 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔍 Fetching ALL documents for Shreeram (${SHREERAM_CLIENT_ID})...\n`);

  const { data: allDocs, error } = await supabase
    .from('documents')
    .select('id, name, folder, subfolder, url, uploaded_at')
    .eq('client_id', SHREERAM_CLIENT_ID);

  if (error) {
    console.error('❌ Error fetching documents:', error.message);
    process.exit(1);
  }

  console.log(`📋 Total documents in Shreeram's client: ${allDocs.length}`);

  // STRICT filter: ONLY documents that:
  // 1. Name starts with "RECOVERED" (case-insensitive)
  // 2. Are in the root folder (folder is null or empty string)
  const toDelete = allDocs.filter(d => {
    const isRecovered = d.name && d.name.toUpperCase().startsWith('RECOVERED');
    const isRootFolder = !d.folder || d.folder === '' || d.folder === null;
    return isRecovered && isRootFolder;
  });

  // Show what will be KEPT (named docs, foldered docs)
  const toKeep = allDocs.filter(d => !toDelete.find(td => td.id === d.id));

  console.log(`\n✅ KEEPING (${toKeep.length} documents):`);
  toKeep.forEach(d => {
    console.log(`   - "${d.name}" | folder: ${d.folder || 'root'} | subfolder: ${d.subfolder || 'none'}`);
  });

  console.log(`\n🗑️  TO DELETE (${toDelete.length} RECOVERED documents from root):`);
  toDelete.forEach(d => {
    console.log(`   - ID: ${d.id} | name: "${d.name}" | uploaded: ${d.uploaded_at}`);
  });

  if (toDelete.length === 0) {
    console.log('\n✅ Nothing to delete. Already clean!');
    return;
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE — nothing was deleted. Run without --dry-run to delete.');
    return;
  }

  // Confirm delete
  const idsToDelete = toDelete.map(d => d.id);
  console.log(`\n🗑️  Deleting ${idsToDelete.length} RECOVERED documents from Supabase...`);

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .in('id', idsToDelete)
    .eq('client_id', SHREERAM_CLIENT_ID); // Double safety: only Shreeram's client

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${idsToDelete.length} RECOVERED documents from Shreeram's root folder.`);
  console.log('✅ All named documents and foldered documents are untouched.');
  console.log('✅ No other clients were affected.');
}

main();
