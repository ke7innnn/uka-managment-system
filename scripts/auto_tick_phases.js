import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

const ITEMS = [
  { aliases: ["INWARD COPY"] },
  { aliases: ["7/12", "7-12", "SATBARA", "PROPERTY CARD"] },
  { aliases: ["6/12", "MUTATION"] },
  { aliases: ["PIKPANI"] },
  { aliases: ["8A", "8-A", "8 A", "आठ-अ"] },
  { aliases: ["TITLE REPORT", "TITLE SEARCH"] },
  { aliases: ["NO CLAIM"] },
  { aliases: ["PAPER NOTICE", "PAPERS NOTICE"] },
  { aliases: ["SALE PERMISSION", "SALE PERMIT"] },
  { aliases: ["NA ORDER", "N A ORDER"] },
  { aliases: ["GAON NAKASHA", "GAV NAKASHA"] },
  { aliases: ["GAVTHAN", "GAOTHAN"] },
  { aliases: ["PHYSICAL", "LEVEL SURVEY", "PHYSICAL SURVEY"] },
  { aliases: ["SITE PHOTOS", "GOOGLE LOCATION", "LOCATION"] },
  { aliases: ["RR RATE"] },
  { aliases: ["GUTBOOK", "GUT BOOK"] },
  { aliases: ["TILR", "T I L R", "T.I.L.R"] },
  { aliases: ["COURT CASE", "COMPLAINT", "NOTICE"] },
  { aliases: ["SOCIETY REG", "REGISTRATION CERTIFICATE", "REGISTERATION CERTIFICATE"] },
  { aliases: ["CONSENT"] },
  { aliases: ["GHARPATTI"] },
  { aliases: ["ASSESSMENT"] },
  { aliases: ["SHARE CERT"] },
  { aliases: ["LIGHT BILL", "ELECTRICITY"] },
  { aliases: ["PAN CARD", "PAN", "PANCARD"] },
  { aliases: ["AADHAR", "ADHAR"] },
  { aliases: ["TENANT PAPER"] },
  { aliases: ["LIST OF MEMBER", "MEMBER LIST", "LIST  OF MEMBER"] },
  { aliases: ["79 A", "79A", "SEC 79", "SECTION 79"] },
  { aliases: ["SUB REGISTER NOC"] },
  { aliases: ["SOCIETY RESOLUTION", "RESOLUTION", "ANUAL GENERAL MEETING", "GENERAL MEETING"] },
  { aliases: ["C1 NOTICE", "C 1", "DILAPIDATED"] },
  { aliases: ["DEV. AGREEMENT", "DEVELOPMENT AGREEMENT", "DA"] },
  { aliases: ["POWER", "P O A", "POA", "P A"] },
  { aliases: ["PARTNERSHIP DEED"] },
  { aliases: ["FIRM PAN"] },
  { aliases: ["NO DUES"] },
  { aliases: ["OLD APPROVAL"] },
  { aliases: ["AS BUILT"] },
  { aliases: ["JOINT SOC", "JOINT SOCIETY"] },
  { aliases: ["ALL AFFIDAVIT"] },
  { aliases: ["AR. APPOINTMENT", "AR APPOINTMENT"] },
  { aliases: ["AR. ACCEPTANCE", "AR ACCEPTANCE"] },
  { aliases: ["AR. SUPERVISION", "AR SUPERVISION"] },
  { aliases: ["AR. LICENCE", "AR LICENCE", "LIC M F", "LIC. CLN", "LIC"] },
  { aliases: ["STR. APPOINTMENT", "STR APPOINTMENT"] },
  { aliases: ["STR. ACCEPTANCE", "STR ACCEPTANCE"] },
  { aliases: ["STR. SUPERVISION", "STR SUPERVISION"] },
  { aliases: ["STR. STABILITY", "STR STABILITY", "STRUCTURAL STABILITY"] },
  { aliases: ["SITE. APPOINTMENT", "SITE APPOINTMENT"] },
  { aliases: ["SITE. ACCEPTANCE", "SITE ACCEPTANCE"] },
  { aliases: ["SITE. SUPERVISION", "SITE SUPERVISION"] },
  { aliases: ["ADJOINING FLAT", "ADJOINING AFF"] },
  { aliases: ["AFFIDAVIT"] },
  { aliases: ["BALANCE AFFIDAVIT"] },
  { aliases: ["DECLARATION AFF"] },
  { aliases: ["INDEMNITY BOND"] },
  { aliases: ["OP AFFIDAVIT"] },
  { aliases: ["SELF DECLARATION"] },
  { aliases: ["SEWAGE DISPOSAL"] },
  { aliases: ["TENANT BAND", "TENTENT BHANDH PATR", "BANDH PATR"] },
  { aliases: ["UNDERTAKING"] },
  { aliases: ["PRATIDNYA PATRA", "PRATIDNYA PATR"] },
  { aliases: ["TREE PRATIDNYA"] },
  { aliases: ["BAND PATRA", "BANDHPATR"] },
  { aliases: ["GREEN ZONE"] },
  { aliases: ["EWS AFFIDAVIT", "EWS LIG"] },
  { aliases: ["5 POINTS LETTER", "5 POINT LETTER"] },
  { aliases: ["APPENDIX-A-1", "APPENDIX A 1", "APPENDIX  A 1", "APPENDIX A-1"] },
  { aliases: ["NO FORM"] },
  { aliases: ["ZONE REMARK", "ZONE DAKHALA"] },
  { aliases: ["CLIENT KYC", "KYC"] },
  { aliases: ["APPENDIX - A1", "APPENDIX A 1", "APPENDIX A1", "APPENDIX   A"] },
  { aliases: ["APPENDIX - B", "APPENDIX B", "APPENDIX  B"] },
  { aliases: ["DP", "D P", "DP NOTING"] },
  { aliases: ["TREE NOC", "PROVISIONAL TREE"] },
  { aliases: ["FIRE NOC", "PROVISIONAL FIRE"] },
  { aliases: ["LAYOUT PLAN", "LAYOUT"] },
];

async function run() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .gte('uploaded_at', today.toISOString());
    
  if (!docs || docs.length === 0) return;
  
  const clientMatchStrings = {}; 
  for (const doc of docs) {
    const docName = doc.name.toUpperCase();
    if (!clientMatchStrings[doc.client_id]) clientMatchStrings[doc.client_id] = [];
    
    // add all matched aliases so we can search phase tasks for these words
    for (const item of ITEMS) {
      const match = item.aliases.find(alias => docName.includes(alias.toUpperCase()));
      if (match) {
        clientMatchStrings[doc.client_id].push(match);
      }
    }
  }
  
  let phasesUpdatedCount = 0;
  
  for (const clientId of Object.keys(clientMatchStrings)) {
    const { data: clientData } = await supabase
      .from('clients')
      .select('phases')
      .eq('id', clientId)
      .single();
      
    if (clientData && clientData.phases) {
      let modified = false;
      const terms = clientMatchStrings[clientId];
      
      const newPhases = clientData.phases.map(p => {
        let pModified = false;
        
        let newTasks = [];
        if (typeof p.tasks === 'string') {
          newTasks = JSON.parse(p.tasks);
        } else {
          newTasks = p.tasks || [];
        }
        
        const mappedTasks = newTasks.map(t => {
          if (!t.completed) {
            const tUpper = t.title.toUpperCase();
            if (terms.some(term => tUpper.includes(term))) {
              modified = true;
              pModified = true;
              return { ...t, completed: true };
            }
          }
          return t;
        });
        
        // Auto-complete the stage if all tasks are complete
        let newStatus = p.status;
        if (pModified && mappedTasks.length > 0 && mappedTasks.every(t => t.completed)) {
            newStatus = 'completed';
        } else if (pModified && mappedTasks.some(t => t.completed) && newStatus === 'not-started') {
            newStatus = 'in-progress';
        }
        
        return { ...p, tasks: mappedTasks, status: newStatus };
      });
      
      if (modified) {
        console.log(`Auto-ticking phases for client ${clientId}`);
        await supabase
          .from('clients')
          .update({ phases: newPhases })
          .eq('id', clientId);
        phasesUpdatedCount++;
      }
    }
  }
  console.log(`Done! Phases auto-ticked for ${phasesUpdatedCount} clients.`);
}
run();
