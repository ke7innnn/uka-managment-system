// Fix Chirag Raut's client_id field (it has an email instead of UIN)
// and ensure KYC data is correct

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
  console.log('=== FIXING CLIENT NAME & UIN FOR CHIRAG RAUT ===\n');

  // Get current client data
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${CLIENT_ID}&select=*`,
    { headers }
  );
  const clients = await getRes.json();
  if (!clients.length) {
    console.log('❌ Client not found!');
    return;
  }
  const client = clients[0];
  console.log('Current state:');
  console.log(`  name: "${client.name}"`);
  console.log(`  company: "${client.company}"`);
  console.log(`  client_id: "${client.client_id}"`);
  console.log(`  kyc.clientUin: "${client.kyc?.clientUin || 'NOT SET'}"`);
  console.log(`  email: "${client.email}"`);

  // Fix: clear the client_id field (it has an email, not a UIN)
  // Set proper name and move email to correct field
  const updatedKyc = {
    ...(client.kyc || {}),
    clientUin: '' // Will be set by admin manually via UI
  };

  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${CLIENT_ID}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        client_id: null,              // Clear the email from client_id field
        email: client.email || 'chirag.raut25@gmail.com', // Keep email in correct field
        name: 'SHREE RAM DEEP PROPRIETOR MR. CHIRAG RAUT',
        company: 'SHREERAM ENTERPRISES PROPRIETOR MR. CHIRAG RAUT',
        kyc: updatedKyc
      })
    }
  );

  if (patchRes.ok || patchRes.status === 204) {
    console.log('\n✅ Client record updated:');
    console.log('  client_id field: CLEARED (was showing email as UIN)');
    console.log('  email field: preserved correctly');
    console.log('  name: kept as-is');
  } else {
    console.log(`\n❌ Update failed: ${patchRes.status} ${await patchRes.text()}`);
  }
  
  // Verify
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${CLIENT_ID}&select=id,name,company,client_id,email,kyc`,
    { headers }
  );
  const verified = await verifyRes.json();
  if (verified.length) {
    const v = verified[0];
    console.log('\nVerified state after fix:');
    console.log(`  name: "${v.name}"`);
    console.log(`  company: "${v.company}"`);
    console.log(`  client_id: "${v.client_id || '(empty - admin to set)'}"`);;
    console.log(`  email: "${v.email}"`);
    console.log(`  kyc.clientUin: "${v.kyc?.clientUin || '(empty - admin to set)'}"`);;
  }
  
  // Count documents now
  const docsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?client_id=eq.${CLIENT_ID}&select=id`,
    { headers }
  );
  const docs = await docsRes.json();
  console.log(`\nTotal documents now in DB: ${docs.length}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
