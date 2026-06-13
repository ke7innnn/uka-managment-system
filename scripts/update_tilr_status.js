import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

async function run() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .gte('uploaded_at', today.toISOString());
    
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
    const { data: clientData } = await supabase
      .from('clients')
      .update({ tilr_status: 'received' })
      .eq('id', clientId);
      
    console.log(`Updated TILR status for client ${clientId}`);
    count++;
  }
  console.log(`Done! Updated tilr_status to 'received' for ${count} clients.`);
}
run();
