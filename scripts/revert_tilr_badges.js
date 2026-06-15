import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

async function run() {
  const pendingClients = [
    '1bb0b19b-cb24-406e-aad0-4509f706c518', // SHREE MAHAVEER
    'abbcb5cb-5b2a-4d94-bfe4-db09b3874597', // SHREE RAM DEEP
    '43ea0d95-732a-4cba-89be-df1e316c9df9'  // SUKHDA
  ];
  
  for (const clientId of pendingClients) {
    await supabase
      .from('clients')
      .update({ tilr_status: 'pending' })
      .eq('id', clientId);
    console.log(`Reverted TILR status to PENDING for client: ${clientId}`);
  }
}

run();
