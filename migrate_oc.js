const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env vars
const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
for (const line of lines) {
  if (line.trim().startsWith('#') || !line.includes('=')) continue;
  const [key, ...rest] = line.split('=');
  const value = rest.join('=').trim().replace(/^"/, '').replace(/"$/, '');
  process.env[key.trim()] = value;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: clients, error } = await supabase.from('clients').select('id, oc_checklist');
  if (error) {
    console.error("Error fetching clients:", error);
    return;
  }

  let updatedCount = 0;
  for (const client of clients) {
    if (!client.oc_checklist || client.oc_checklist.length === 0) continue;

    let changed = false;
    const newOc = client.oc_checklist.map(item => {
      let baseIdStr = item;
      let isNA = false;
      if (item.endsWith('-NA')) {
        baseIdStr = item.replace('-NA', '');
        isNA = true;
      }
      const baseId = parseInt(baseIdStr);
      if (!isNaN(baseId) && baseId >= 1 && baseId <= 20) {
        changed = true;
        const newId = baseId + 106;
        return isNA ? `${newId}-NA` : `${newId}`;
      }
      return item;
    });

    if (changed) {
      console.log(`Updating client ${client.id}...`);
      const { error: updateError } = await supabase.from('clients').update({ oc_checklist: newOc }).eq('id', client.id);
      if (updateError) console.error("Error updating client:", updateError);
      else updatedCount++;
    }
  }
  console.log(`Successfully migrated ${updatedCount} clients.`);
}

run();
