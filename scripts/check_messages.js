import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://teoggshqiyimbilbcvnv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log("Fetching messages from whatsapp_messages table...");
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Database error:", error.message);
  } else {
    console.log("Total messages found:", data.length);
    console.log("Messages detail:", JSON.stringify(data, null, 2));
  }
}

checkMessages();
