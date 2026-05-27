require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('documents').select('*').limit(5);
  console.log("Documents:", JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    const url = data[0].url;
    console.log("Testing URL:", url);
    const path = url.split('/public/uka-storage/')[1];
    console.log("Path:", path);
    const { data: fileData, error: fileErr } = await supabase.storage.from('uka-storage').download(path);
    console.log("Download result:", { fileErr });
  }
}
main();
