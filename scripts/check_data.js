import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

async function checkData() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .gte('uploaded_at', today.toISOString());
    
  console.log('Documents from today:', docs ? docs.length : docErr);
  
  if (docs && docs.length > 0) {
    console.log(docs.map(d => ({ name: d.name, client_id: d.client_id })));
  }

  // Find clients updated today
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, progress_checklist, oc_checklist');
    
  console.log('Total clients:', clients?.length);
}

checkData();
