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

const oldTitle = "Place order for 2 sets of TILR/NOCs (mention DATE & whether client is doing it or responsible persons name)";
const newTitle = "Place order for 2 sets of TILR/NOCs (mention DATE & whether client is doing it or responsible persons name) with Vijay";

async function run() {
  const { data: phases, error } = await supabase.from('phases').select('id, name, status, completed, tasks, client_id');
  if (error) {
    console.error(error);
    return;
  }
  
  const updates = [];

  phases.forEach(p => {
    if (p.name.includes('Stage 1')) {
      const currentTasks = typeof p.tasks === 'string' ? JSON.parse(p.tasks) : p.tasks;
      let changed = false;
      
      const updatedTasks = currentTasks.map(t => {
        if (t.title === oldTitle) {
          changed = true;
          return { ...t, title: newTitle };
        }
        return t;
      });

      if (changed) {
        updates.push({
          id: p.id,
          client_id: p.client_id,
          name: p.name,
          status: p.status,
          completed: p.completed,
          tasks: updatedTasks
        });
      }
    }
  });

  if (updates.length > 0) {
    const { error: updateError } = await supabase.from('phases').upsert(updates);
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log(`Successfully updated ${updates.length} Stage 1 phases!`);
    }
  } else {
    console.log("No Stage 1 phases found to update.");
  }
}

run();
