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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Query the phases table directly
  const { data: phases, error } = await supabase.from('phases').select('id, name');
  if (error) {
    console.error("Error fetching phases:", error);
    return;
  }
  
  console.log(`Found ${phases.length} phases in Supabase`);
  let updatedCount = 0;

  for (const phase of phases) {
    let newName = phase.name;
    if (!newName) continue;
    
    if (newName.includes('Stage 1a')) newName = newName.replace('Stage 1a', 'Stage 1');
    else if (newName.includes('Stage 1b')) newName = newName.replace('Stage 1b', 'Stage 2');
    else if (newName.includes('Stage 2c')) newName = newName.replace('Stage 2c', 'Stage 3');
    else if (newName.includes('Stage 3d')) newName = newName.replace('Stage 3d', 'Stage 4');
    else if (newName.includes('Stage 3e')) newName = newName.replace('Stage 3e', 'Stage 5');
    else if (newName.includes('Stage 3f')) newName = newName.replace('Stage 3f', 'Stage 6');

    if (newName !== phase.name) {
      console.log(`Renaming: "${phase.name}" -> "${newName}"`);
      const { error: updateError } = await supabase
        .from('phases')
        .update({ name: newName })
        .eq('id', phase.id);
        
      if (updateError) {
        console.error(`Failed to update phase ${phase.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Migration complete. Renamed ${updatedCount} phases in the database.`);
}

run();
