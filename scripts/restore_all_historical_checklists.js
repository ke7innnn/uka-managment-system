import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teoggshqiyimbilbcvnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ'
);

const ITEMS = [
  { id: "1", aliases: ["INWARD COPY"] },
  { id: "2", aliases: ["7/12", "7-12", "SATBARA", "PROPERTY CARD"] },
  { id: "3", aliases: ["6/12", "MUTATION"] },
  { id: "4", aliases: ["PIKPANI"] },
  { id: "5", aliases: ["8A", "8-A", "8 A", "आठ-अ"] },
  { id: "6", aliases: ["TITLE REPORT", "TITLE SEARCH"] },
  { id: "7", aliases: ["NO CLAIM"] },
  { id: "8", aliases: ["PAPER NOTICE", "PAPERS NOTICE"] },
  { id: "9", aliases: ["SALE PERMISSION", "SALE PERMIT"] },
  { id: "10", aliases: ["NA ORDER", "N A ORDER"] },
  { id: "11", aliases: ["GAON NAKASHA", "GAV NAKASHA"] },
  { id: "12", aliases: ["GAVTHAN", "GAOTHAN"] },
  { id: "13", aliases: ["PHYSICAL", "LEVEL SURVEY", "PHYSICAL SURVEY"] },
  { id: "14", aliases: ["SITE PHOTOS", "GOOGLE LOCATION", "LOCATION"] },
  { id: "15", aliases: ["RR RATE"] },
  { id: "16", aliases: ["GUTBOOK", "GUT BOOK"] },
  { id: "17", aliases: ["TILR", "T I L R", "T.I.L.R"] },
  { id: "18", aliases: ["COURT CASE", "COMPLAINT", "NOTICE"] },
  { id: "19", aliases: ["SOCIETY REG", "REGISTRATION CERTIFICATE", "REGISTERATION CERTIFICATE"] },
  { id: "20", aliases: ["CONSENT"] },
  { id: "21", aliases: ["GHARPATTI"] },
  { id: "22", aliases: ["ASSESSMENT"] },
  { id: "23", aliases: ["SHARE CERT"] },
  { id: "24", aliases: ["LIGHT BILL", "ELECTRICITY"] },
  { id: "25", aliases: ["PAN CARD", "PAN", "PANCARD"] },
  { id: "26", aliases: ["AADHAR", "ADHAR"] },
  { id: "27", aliases: ["TENANT PAPER"] },
  { id: "28", aliases: ["LIST OF MEMBER", "MEMBER LIST", "LIST  OF MEMBER"] },
  { id: "29", aliases: ["79 A", "79A", "SEC 79", "SECTION 79"] },
  { id: "30", aliases: ["SUB REGISTER NOC"] },
  { id: "31", aliases: ["SOCIETY RESOLUTION", "RESOLUTION", "ANUAL GENERAL MEETING", "GENERAL MEETING"] },
  { id: "32", aliases: ["C1 NOTICE", "C 1", "DILAPIDATED"] },
  { id: "33", aliases: ["DEV. AGREEMENT", "DEVELOPMENT AGREEMENT", "DA"] },
  { id: "34", aliases: ["POWER", "P O A", "POA", "P A"] },
  { id: "35", aliases: ["PARTNERSHIP DEED"] },
  { id: "36", aliases: ["FIRM PAN"] },
  { id: "37", aliases: ["NO DUES"] },
  { id: "38", aliases: ["OLD APPROVAL"] },
  { id: "39", aliases: ["AS BUILT"] },
  { id: "40", aliases: ["JOINT SOC", "JOINT SOCIETY"] },
  { id: "41", aliases: ["ALL AFFIDAVIT"] },
  { id: "44", aliases: ["AR. APPOINTMENT", "AR APPOINTMENT"] },
  { id: "45", aliases: ["AR. ACCEPTANCE", "AR ACCEPTANCE"] },
  { id: "46", aliases: ["AR. SUPERVISION", "AR SUPERVISION"] },
  { id: "47", aliases: ["AR. LICENCE", "AR LICENCE", "LIC M F", "LIC. CLN", "LIC"] },
  { id: "48", aliases: ["STR. APPOINTMENT", "STR APPOINTMENT"] },
  { id: "49", aliases: ["STR. ACCEPTANCE", "STR ACCEPTANCE"] },
  { id: "50", aliases: ["STR. SUPERVISION", "STR SUPERVISION"] },
  { id: "51", aliases: ["STR. STABILITY", "STR STABILITY", "STRUCTURAL STABILITY"] },
  { id: "53", aliases: ["SITE. APPOINTMENT", "SITE APPOINTMENT"] },
  { id: "54", aliases: ["SITE. ACCEPTANCE", "SITE ACCEPTANCE"] },
  { id: "55", aliases: ["SITE. SUPERVISION", "SITE SUPERVISION"] },
  { id: "57", aliases: ["ADJOINING FLAT", "ADJOINING AFF"] },
  { id: "58", aliases: ["AFFIDAVIT"] },
  { id: "59", aliases: ["BALANCE AFFIDAVIT"] },
  { id: "60", aliases: ["DECLARATION AFF"] },
  { id: "61", aliases: ["INDEMNITY BOND"] },
  { id: "62", aliases: ["OP AFFIDAVIT"] },
  { id: "63", aliases: ["SELF DECLARATION"] },
  { id: "64", aliases: ["SEWAGE DISPOSAL"] },
  { id: "65", aliases: ["TENANT BAND", "TENTENT BHANDH PATR", "BANDH PATR"] },
  { id: "66", aliases: ["UNDERTAKING"] },
  { id: "67", aliases: ["PRATIDNYA PATRA", "PRATIDNYA PATR"] },
  { id: "68", aliases: ["TREE PRATIDNYA"] },
  { id: "69", aliases: ["BAND PATRA", "BANDHPATR"] },
  { id: "70", aliases: ["GREEN ZONE"] },
  { id: "71", aliases: ["EWS AFFIDAVIT", "EWS LIG"] },
  { id: "72", aliases: ["5 POINTS LETTER", "5 POINT LETTER"] },
  { id: "73", aliases: ["APPENDIX-A-1", "APPENDIX A 1", "APPENDIX  A 1", "APPENDIX A-1"] },
  { id: "74", aliases: ["NO FORM"] },
  { id: "76", aliases: ["ZONE REMARK", "ZONE DAKHALA"] },
  { id: "78", aliases: ["CLIENT KYC", "KYC"] },
  { id: "84", aliases: ["APPENDIX - A1", "APPENDIX A 1", "APPENDIX A1", "APPENDIX   A"] },
  { id: "85", aliases: ["APPENDIX - B", "APPENDIX B", "APPENDIX  B"] },
  { id: "88", aliases: ["DP", "D P", "DP NOTING"] },
  { id: "90", aliases: ["TREE NOC", "PROVISIONAL TREE"] },
  { id: "91", aliases: ["FIRE NOC", "PROVISIONAL FIRE"] },
  { id: "98", aliases: ["LAYOUT PLAN", "LAYOUT"] },
];

async function run() {
  console.log('Fetching ALL documents to fully restore ALL checklist ticks...');
  
  const { data: docs } = await supabase
    .from('documents')
    .select('*');
    
  if (!docs || docs.length === 0) return;
  
  const clientTicks = {}; 
  
  for (const doc of docs) {
    const docName = doc.name.toUpperCase();
    for (const item of ITEMS) {
      if (item.aliases.some(alias => docName.includes(alias.toUpperCase()))) {
        if (!clientTicks[doc.client_id]) clientTicks[doc.client_id] = new Set();
        clientTicks[doc.client_id].add(item.id);
      }
    }
  }
  
  for (const clientId of Object.keys(clientTicks)) {
    const { data: clientData } = await supabase
      .from('clients')
      .select('progress_checklist')
      .eq('id', clientId)
      .single();
      
    if (clientData) {
      const currentList = clientData.progress_checklist || [];
      const newIds = Array.from(clientTicks[clientId]);
      const merged = [...new Set([...currentList, ...newIds])];
      
      if (merged.length > currentList.length) {
        console.log(`Updating client ${clientId} - restored ${merged.length - currentList.length} historical ticks.`);
        await supabase
          .from('clients')
          .update({ progress_checklist: merged })
          .eq('id', clientId);
      }
    }
  }
  
  console.log('Finished restoring ALL checklist ticks!');
}

run();
