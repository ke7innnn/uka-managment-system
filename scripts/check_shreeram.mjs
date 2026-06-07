import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('clients').select('id, name, kyc').eq('id', 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1').single();
  if (error) console.error(error);
  else {
    console.log("Client Name:", data.name);
    console.log("KYC Object Keys:", data.kyc ? Object.keys(data.kyc) : 'null');
    console.log("Client UIN:", data.kyc?.clientUin);
  }
}

run();
