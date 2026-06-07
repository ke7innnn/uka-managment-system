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
  const { data: phases, error } = await supabase.from('phases').select('id, name, status, completed, tasks, client_id');
  if (error) console.error(error);
  else {
    let completedPhases = 0;
    phases.forEach(p => {
       const tasks = typeof p.tasks === 'string' ? JSON.parse(p.tasks) : p.tasks;
       const completedCount = tasks?.filter(t => t.completed)?.length || 0;
       if (completedCount > 0 || p.completed || p.status === 'completed') {
          completedPhases++;
       }
    });
    console.log(`Found ${completedPhases} phases with completed tasks across all clients.`);
  }
}

run();
