const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
env.forEach(line => {
  if(line.includes('=')) {
    const [k, ...v] = line.split('=');
    process.env[k.trim()] = v.join('=').trim().replace(/^\"|\"$/g, '');
  }
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function migrate() {
  const { data: phases, error } = await supabase.from('phases').select('*');
  if (error) { console.error(error); return; }

  console.log(`Found ${phases.length} phases to process.`);

  let updatedCount = 0;

  for (const phase of phases) {
    if (!phase.tasks || !Array.isArray(phase.tasks)) continue;

    let modified = false;
    let newTasks = [];

    // Stage 1
    if (phase.name.includes('Stage 1')) {
      newTasks = phase.tasks.map(t => {
        if (t.title.includes('Filing with sticker') && !t.templateName) { t.templateName = 'stage1_task1'; modified = true; }
        if (t.title.includes('Place order for 2 sets of TILR') && !t.templateName) { t.templateName = 'stage1_task2'; modified = true; }
        if (t.title.includes('OFFICE UIN') && !t.templateName) { t.templateName = 'stage1_task3'; modified = true; }
        return t;
      });
    }
    
    // Stage 2
    else if (phase.name.includes('Stage 2')) {
      newTasks = phase.tasks.map(t => {
        if (t.title.includes('Upload basic plot on DP marking') && !t.templateName) { t.templateName = 'stage2_task1'; modified = true; }
        return t;
      });
    }

    // Stage 3
    else if (phase.name.includes('Stage 3')) {
      newTasks = phase.tasks.map(t => {
        if (t.title.includes('Ready half CHECKLIST') && !t.templateName) { t.templateName = 'stage3_taskk1'; modified = true; }
        if (t.title.includes('1 office file copy') && !t.templateName) { t.templateName = 'stage3_task2'; modified = true; }
        if (t.title.includes('Rough challan estimate') && !t.templateName) { t.templateName = 'stage3_task3'; modified = true; }
        return t;
      });
    }

    // Stage 4
    else if (phase.name.includes('Stage 4')) {
      for (const t of phase.tasks) {
        // Split combined Legal/Tree task
        if (t.title === "Mention compliances of legal department, tree department scrutiny time to time.") {
          newTasks.push({ ...t, id: t.id + '_1', title: "Mention compliances of legal department scrutiny time to time.", templateName: "stage4_task1", requiresManualRemark: true });
          newTasks.push({ ...t, id: t.id + '_2', title: "Mention compliances of tree department scrutiny time to time.", templateName: "stage4_task2", requiresManualRemark: true });
          modified = true;
        } 
        // Split combined NOC task
        else if (t.title === "Upload final legal, tree NOC signed noting") {
          newTasks.push({ ...t, id: t.id + '_1', title: "Upload final legal NOC signed noting", templateName: "stage4_task3" });
          newTasks.push({ ...t, id: t.id + '_2', title: "Upload final tree NOC signed noting", templateName: "stage4_task4" });
          modified = true;
        }
        // Already split ones or others
        else {
          let updatedT = { ...t };
          if (updatedT.title.includes('Confirm and upload final TILR') && !updatedT.templateName) { updatedT.templateName = 'stage4_task5'; modified = true; }
          if (updatedT.title.includes('Upload DP marking') && !updatedT.templateName) { updatedT.templateName = 'stage4_tassksix'; modified = true; }
          if (updatedT.title.includes('PRE-AUTO DCR') && !updatedT.templateName) { updatedT.templateName = 'stage4_task7'; modified = true; }
          newTasks.push(updatedT);
        }
      }
    }

    // Stage 5
    else if (phase.name.includes('Stage 5')) {
      newTasks = phase.tasks.map(t => {
        if (t.title.includes('Online clear report') && !t.templateName) { t.templateName = 'stage5_task1'; modified = true; }
        if (t.title.includes('FINAL OFFLINE DOCKET') && !t.templateName) { t.templateName = 'stage5_task2'; modified = true; }
        return t;
      });
    }

    // Stage 6
    else if (phase.name.includes('Stage 6')) {
      newTasks = phase.tasks.map(t => {
        if (t.title.includes('APPROVED VIA OFFLINE MODE') && !t.templateName) { t.templateName = 'stahe6_task1'; modified = true; }
        return t;
      });
    } else {
      newTasks = phase.tasks;
    }

    if (modified) {
      await supabase.from('phases').update({ tasks: newTasks }).eq('id', phase.id);
      updatedCount++;
    }
  }

  console.log(`Migration completed! Updated ${updatedCount} phases.`);
}

migrate();
