// Fix storage RLS - make uka-storage bucket public and check/fix policies
const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SERVICE_KEY_NEEDED = true;

// The anon key cannot change bucket policies. 
// We need to use the Supabase Management API or the service_role key.
// This script checks the public URL access for the 9 missing files 
// and also tests that existing files are accessible.

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';

// Test if a known working file is accessible via public URL
async function testPublicAccess() {
  // Test a known file - 712.pdf from client b6cc5f05 that EXISTS in storage
  // But it has a different path than the missing ones
  
  console.log('\n=== TESTING WHY FILES ARE NOT OPENING ===\n');
  
  // The MISSING 9 files are all from client b6cc5f05 and were uploaded on 2026-05-25
  // The WORKING files from the same client (b6cc5f05) are newer uploads
  
  // Let's test a WORKING file URL vs a MISSING file URL
  const workingFileUrl = 'https://teoggshqiyimbilbcvnv.supabase.co/storage/v1/object/public/uka-storage/documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/048684e3-e292-42b3-a192-7373878eb2c2.pdf';
  const missingFileUrl = 'https://teoggshqiyimbilbcvnv.supabase.co/storage/v1/object/public/uka-storage/documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/e4bc5e03-d459-4840-a636-80625738d189.pdf';
  
  console.log('Testing WORKING file access:');
  try {
    const r1 = await fetch(workingFileUrl, { method: 'HEAD' });
    console.log(`  Status: ${r1.status} ${r1.statusText}`);
    console.log(`  Content-Type: ${r1.headers.get('content-type')}`);
    console.log(`  Content-Length: ${r1.headers.get('content-length')}`);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  
  console.log('\nTesting MISSING file access:');
  try {
    const r2 = await fetch(missingFileUrl, { method: 'HEAD' });
    console.log(`  Status: ${r2.status} ${r2.statusText}`);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  
  // The 9 missing files from b6cc5f05 were uploaded on 2026-05-25
  // These were probably the ORIGINAL uploads before the storage bug was introduced
  // And were already deleted from storage by the code bug previously fixed
  
  // Now let's check if CORS is the issue - try fetching (not just HEAD) a file
  console.log('\nTesting actual GET fetch on a working file:');
  try {
    const r3 = await fetch(workingFileUrl);
    console.log(`  Status: ${r3.status}`);
    if (r3.ok) {
      const blob = await r3.blob();
      console.log(`  SUCCESS! Got ${blob.size} bytes`);
    }
  } catch (e) {
    console.log(`  CORS/Fetch Error: ${e.message}`);
  }
  
  // Also check bucket configuration
  console.log('\nChecking bucket configuration:');
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
  
  try {
    const bucketRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/uka-storage`, { headers });
    if (bucketRes.ok) {
      const bucket = await bucketRes.json();
      console.log(`  Bucket name: ${bucket.name}`);
      console.log(`  Public: ${bucket.public}`);
      console.log(`  File size limit: ${bucket.file_size_limit}`);
      console.log(`  Allowed MIME types: ${JSON.stringify(bucket.allowed_mime_types)}`);
      
      if (!bucket.public) {
        console.log('\n  ⚠️  BUCKET IS PRIVATE! This could be why files are not opening.');
        console.log('  You need to make it public in Supabase Dashboard:');
        console.log('  Storage > uka-storage > Settings > Make Public');
      } else {
        console.log('\n  ✅ Bucket is PUBLIC - URLs should work');
      }
    } else {
      const err = await bucketRes.text();
      console.log(`  Bucket check error: ${bucketRes.status} - ${err}`);
    }
  } catch(e) {
    console.log(`  Error: ${e.message}`);
  }
}

testPublicAccess().catch(console.error);
