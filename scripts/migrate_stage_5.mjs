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

const oldTasksText = [
  "Prepare and upload offline drawing",
  "Online clear report to be readied and uploaded",
  "Drawing to be readied and uploaded",
  "Summarized Auto prompt is sent to client and boss on group (REPORT/DRAWING IS COMPLETE AND ATTACHMENT IS AUTO SENT)",
  "Drawing",
  "Report",
  "Marginal",
  "Engineering Drawing",
  "Complete FINAL OFFLINE DOCKET to be readied as per checklist",
  "Any issues/clarifications/CHANGES to be mentioned by Vrushali/uzaid to nihal and me on the site itself without verbal communication AND PROCESS E TO BE REPEATED (live chat window)",
  "Nihal to acknowledge that offline docket has been successfully received",
  "Nihal to ensure that file is inwarded and covering letter with online/offline number identification is uploaded on the site"
];

async function run() {
  const { data: phases, error } = await supabase.from('phases').select('id, name, status, completed, tasks, client_id');
  if (error) {
    console.error(error);
    return;
  }
  
  const updates = [];

  phases.forEach(p => {
    if (p.name.includes('Stage 5')) {
      const currentTasks = typeof p.tasks === 'string' ? JSON.parse(p.tasks) : p.tasks;
      
      // We need to inject the new tasks without losing their `completed` status
      // We recreate the tasks array.
      
      const newTasks = [];
      
      // Helper to find existing task state
      const findTask = (title) => currentTasks.find(t => t.title === title);
      
      const makeTask = (title, defaultAssignee) => {
        const existing = findTask(title);
        if (existing) return existing;
        return {
          title,
          assignedTo: defaultAssignee,
          completed: false
        };
      };

      const assignee = "Uzaid Khan & Vrushali Thakur & Nihal Gharat";
      
      newTasks.push(makeTask("take Auto Cad drawing from Uday.", assignee));
      newTasks.push(makeTask("Prepare and upload offline drawing", assignee));
      newTasks.push(makeTask("Online clear report to be readied and uploaded", assignee));
      newTasks.push(makeTask("Drawing to be readied and uploaded", assignee));
      newTasks.push(makeTask("Summarized Auto prompt is sent to client and boss on group (REPORT/DRAWING IS COMPLETE AND ATTACHMENT IS AUTO SENT)", assignee));
      newTasks.push(makeTask("point E report and service drawing", assignee));
      newTasks.push(makeTask("hardship point", assignee));
      newTasks.push(makeTask("Drawing", assignee));
      newTasks.push(makeTask("Report", assignee));
      newTasks.push(makeTask("Marginal", assignee));
      newTasks.push(makeTask("Engineering Drawing", assignee));
      newTasks.push(makeTask("Complete FINAL OFFLINE DOCKET to be readied as per checklist", assignee));
      newTasks.push(makeTask("Any issues/clarifications/CHANGES to be mentioned by Vrushali/uzaid to nihal and me on the site itself without verbal communication AND PROCESS E TO BE REPEATED (live chat window)", assignee));
      newTasks.push(makeTask("Nihal to acknowledge that offline docket has been successfully received", assignee));
      newTasks.push(makeTask("Nihal to ensure that file is inwarded and covering letter with online/offline number identification is uploaded on the site", assignee));
      
      // Ensure no custom tasks are lost if they existed
      currentTasks.forEach(t => {
        if (!newTasks.find(nt => nt.title === t.title)) {
           newTasks.push(t);
        }
      });
      
      updates.push({
        id: p.id,
        client_id: p.client_id,
        name: p.name,
        status: p.status,
        completed: p.completed,
        tasks: newTasks
      });
    }
  });

  if (updates.length > 0) {
    const { error: updateError } = await supabase.from('phases').upsert(updates);
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log(`Successfully updated ${updates.length} Stage 5 phases!`);
    }
  } else {
    console.log("No Stage 5 phases found to update.");
  }
}

run();
