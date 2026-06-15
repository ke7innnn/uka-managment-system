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

  let updatedCount = 0;

  for (const phase of phases) {
    if (!phase.tasks) continue;
    let tasks = phase.tasks;
    if (typeof tasks === 'string') {
      try { tasks = JSON.parse(tasks); } catch(e) { continue; }
    }
    if (!Array.isArray(tasks)) continue;

    let modified = false;
    let newTasks = [];

    for (const t of tasks) {
      let title = t.title || "";
      let isSplit = false;

      // Split 1
      if (title === "Mention compliances of legal department, tree department scrutiny time to time." || title === "Mention compliances of legal department, tree department scrutiny time to time") {
        newTasks.push({ ...t, id: t.id + '_1', title: "Mention compliances of legal department scrutiny time to time.", templateName: "stage4_task1", requiresManualRemark: true });
        newTasks.push({ ...t, id: t.id + '_2', title: "Mention compliances of tree department scrutiny time to time.", templateName: "stage4_task2", requiresManualRemark: true });
        modified = true;
        isSplit = true;
      }
      // Split 2
      else if (title === "Upload final legal, tree NOC signed noting" || title === "Upload final legal, tree NOC signed noting.") {
        newTasks.push({ ...t, id: t.id + '_1', title: "Upload final legal NOC signed noting", templateName: "stage4_task3" });
        newTasks.push({ ...t, id: t.id + '_2', title: "Upload final tree NOC signed noting", templateName: "stage4_task4" });
        modified = true;
        isSplit = true;
      }
      
      if (!isSplit) {
        let updatedT = { ...t };
        if (title.includes('Filing with sticker') && !updatedT.templateName) { updatedT.templateName = 'stage1_task1'; modified = true; }
        if (title.includes('Place order for 2 sets of TILR') && !updatedT.templateName) { updatedT.templateName = 'stage1_task2'; modified = true; }
        if (title.includes('OFFICE UIN') && !updatedT.templateName) { updatedT.templateName = 'stage1_task3'; modified = true; }
        
        if (title.includes('Upload basic plot on DP marking') && !updatedT.templateName) { updatedT.templateName = 'stage2_task1'; modified = true; }
        
        if (title.includes('Ready half CHECKLIST') && !updatedT.templateName) { updatedT.templateName = 'stage3_taskk1'; modified = true; }
        if (title.includes('1 office file copy') && !updatedT.templateName) { updatedT.templateName = 'stage3_task2'; modified = true; }
        if (title.includes('Rough challan estimate') && !updatedT.templateName) { updatedT.templateName = 'stage3_task3'; modified = true; }

        if (title.includes('Confirm and upload final TILR') && !updatedT.templateName) { updatedT.templateName = 'stage4_task5'; modified = true; }
        if (title.includes('Upload DP marking') && !updatedT.templateName) { updatedT.templateName = 'stage4_tassksix'; modified = true; }
        if (title.includes('PRE-AUTO DCR') && !updatedT.templateName) { updatedT.templateName = 'stage4_task7'; modified = true; }

        if (title.includes('Online clear report') && !updatedT.templateName) { updatedT.templateName = 'stage5_task1'; modified = true; }
        if (title.includes('FINAL OFFLINE DOCKET') && !updatedT.templateName) { updatedT.templateName = 'stage5_task2'; modified = true; }

        if (title.includes('APPROVED VIA OFFLINE MODE') && !updatedT.templateName) { updatedT.templateName = 'stahe6_task1'; modified = true; }

        newTasks.push(updatedT);
      }
    }

    if (modified) {
      await supabase.from('phases').update({ tasks: newTasks }).eq('id', phase.id);
      updatedCount++;
    }
  }

  console.log(`Migration completed! Updated ${updatedCount} phases.`);
}

migrate();
