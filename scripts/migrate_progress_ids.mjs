import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const mapping = {
  "1": "2", "2": "3", "3": "4", "4": "5", "5": "6", "6": "7", "7": "8", "8": "9", "9": "10",
  "10": "11", "11": "12", "12": "13", "13": "14", "14": "15", "15": "16", "16": "17", "17": "19",
  "18": "20", "19": "21", "20": "22", "21": "23", "22": "24", "23": "25", "24": "26", "25": "28",
  "26": "29", "27": "30", "28": "31", "29": "32", "30": "33", "31": "34", "32": "35", "33": "36",
  "34": "37", "35": "38", "36": "39", "37": "40", "38": "41", "39": "42", "43": "76", "44": "77",
  "45": "78", "46": "79", "47": "80", "48": "81", "49": "82", "50": "83", "51": "73", "52": "85",
  "57": "86", "59": "88", "60": "90", "61": "91", "62": "93", "64": "94", "65": "96", "66": "97",
  "67": "98", "68": "92", "69": "99", "70": "100", "71": "101", "72": "102", "73": "103", "74": "104",
  "75": "1", "76": "18", "77": "27", "78": "43", "79": "44", "80": "45", "81": "46", "82": "47",
  "83": "48", "84": "49", "85": "50", "86": "51", "87": "52", "88": "53", "89": "54", "90": "55",
  "91": "56", "92": "57", "93": "58", "94": "59", "95": "60", "96": "61", "97": "62", "98": "63",
  "99": "64", "100": "65", "101": "66", "102": "67", "103": "68", "104": "69", "105": "70", "106": "71",
  "107": "72", "108": "74", "109": "75", "110": "84", "111": "87", "112": "89", "113": "95", "114": "105",
  "115": "106"
};

async function run() {
  console.log("Starting DB migration...");
  const { data: clients, error } = await supabase.from('clients').select('id, progress_checklist, name');
  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  console.log(`Found ${clients.length} clients.`);

  let updatedCount = 0;

  for (const client of clients) {
    if (!client.progress_checklist || client.progress_checklist.length === 0) continue;

    const oldList = client.progress_checklist;
    const newList = [];

    let modified = false;

    for (const oldId of oldList) {
      const isNA = oldId.endsWith('-NA');
      const base = oldId.replace('-NA', '');
      
      if (mapping[base]) {
        newList.push(mapping[base] + (isNA ? '-NA' : ''));
        modified = true;
      } else {
        newList.push(oldId);
      }
    }

    if (modified) {
      console.log(`Updating client ${client.name} (id: ${client.id}): ${oldList.length} items migrated.`);
      const { error: updateError } = await supabase.from('clients').update({ progress_checklist: newList }).eq('id', client.id);
      if (updateError) {
        console.error(`Error updating client ${client.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} clients successfully.`);
}

run();
