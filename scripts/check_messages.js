import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

async function checkLogs() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const { data: messages } = await supabase
    .from('workspace_messages')
    .select('*')
    .gte('created_at', today.toISOString());
    
  console.log(`Found ${messages?.length || 0} messages today.`);
  
  if (messages && messages.length > 0) {
    messages.filter(m => m.content.toLowerCase().includes('tilr') || m.content.toLowerCase().includes('task') || m.content.toLowerCase().includes('stage') || m.content.toLowerCase().includes('completed') || m.content.toLowerCase().includes('checklist'))
            .forEach(m => console.log(m.content));
  }
}
checkLogs();
