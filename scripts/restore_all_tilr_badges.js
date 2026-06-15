import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

async function run() {
  console.log('Fetching ALL documents in the database to find historical TILRs...');
  
  const { data: docs } = await supabase
    .from('documents')
    .select('*');
    
  if (!docs || docs.length === 0) return;
  
  const clientIdsWithTilr = new Set();
  
  for (const doc of docs) {
    const docName = doc.name.toUpperCase();
    if (docName.includes('TILR') || docName.includes('T I L R') || docName.includes('T.I.L.R')) {
      clientIdsWithTilr.add(doc.client_id);
    }
  }
  
  let count = 0;
  for (const clientId of clientIdsWithTilr) {
    await supabase
      .from('clients')
      .update({ tilr_status: 'received' })
      .eq('id', clientId);
      
    console.log(`Restored historical TILR status to RECEIVED for client: ${clientId}`);
    count++;
  }
  console.log(`Done! Completely restored tilr_status to 'received' for ${count} clients based on their document history.`);
}
run();
