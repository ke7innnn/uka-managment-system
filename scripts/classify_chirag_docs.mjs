// Smart folder assignment using proper PDF text extraction
import { PDFParse } from 'pdf-parse';

const SUPABASE_URL = 'https://teoggshqiyimbilbcvnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlb2dnc2hxaXlpbWJpbGJjdm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjY2NDgsImV4cCI6MjA5NDUwMjY0OH0.mGlLh1TbTp6lwdoCkw47fl3ZRQj_Uwl8-dbfAsgTnTQ';
const CLIENT_ID = 'b6cc5f05-d0c8-48fe-9d91-b94573aca3f1';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ─── Keyword-based classification rules (order matters — most specific first) ──
const RULES = [
  // Precise text matching for identified documents
  { kw: ['Rajesh D. Khobragade', 'FIVE HUNDRED RUPEES', 'MAHARASHTRA'], folder: '2', sf: '2c', name: 'AFFIDAVIT.pdf' },
  { kw: ['MUFADDAL MERCHANT', 'supervision', 'workmanship'], folder: '3', sf: '3k', name: 'SITE ENGINEER SUPERVISION.pdf' },
  { kw: ['Airbus', 'Image ©', 'Airbus Image'], folder: '8', sf: '8f', name: 'GOOGLE.pdf' },
  { kw: ['freepressjournal', 'FREE PRESS JOURNAL'], folder: '1', sf: '1e-2', name: 'PAPER NOTICE.pdf' },
  { kw: ['SHAILESH R PANDEY', 'Acceptance Letter'], folder: '3', sf: '3f', name: 'STR ACCEPTANCE.pdf' },

  // Revenue folder
  { kw: ['7/12','satbara','7 12','7-12','सातबारा','property card'], folder:'1', sf:'1a', name:'712.pdf' },
  { kw: ['6/12','mutation','फेरफार','ferfar'], folder:'1', sf:'1b', name:'FERFAR.pdf' },
  { kw: ['pikpahani','pikpani','पिकपाणी','pikpahni'], folder:'1', sf:'1c', name:'PIKPANI.pdf' },
  { kw: ['8a extract','8-a extract','8 a extract','8अ','8a ext'], folder:'1', sf:'1d', name:'8A.pdf' },
  { kw: ['inward copy','inword copy','inward letter'], folder:'1', sf:'1-ic', name:'INWARD COPY.pdf' },
  { kw: ['no claim certificate','no claims certificate','no claim cert'], folder:'1', sf:'1e-1', name:'NO CLAIM CERTIFICATE.pdf' },
  { kw: ['paper notice','newspaper notice','notice published'], folder:'1', sf:'1e-2', name:'PAPER NOTICE.pdf' },
  { kw: ['title search report','advocate title search','adv. title search','title & search','title search'], folder:'1', sf:'1e-3', name:'ADV. TITLE SEARCH REPORT.pdf' },
  { kw: ['advocate report','adv reports','adv. reports','advocate title'], folder:'1', sf:'1e-3', name:'ADVOCATE REPORT.pdf' },
  { kw: ['tilr','town investigation','land record','town land revenue'], folder:'1', sf:'1g', name:'TILR.pdf' },
  { kw: ['na order','na/plr','n.a. order','n.a order','non agricultural'], folder:'1', sf:null, name:'NA ORDER.pdf' },
  // VVCMC Bonds
  { kw: ['indemnity bond'], folder:'2', sf:'2f', name:'INDEMNITY BOND.pdf' },
  { kw: ['balance paper affidavit','balance paper'], folder:'2', sf:'2d', name:'BALANCE PAPER AFFIDAVIT.pdf' },
  { kw: ['affidavit'], folder:'2', sf:'2c', name:'AFFIDAVIT.pdf' },
  { kw: ['declaration','डिक्लेरेशन','decleration'], folder:'2', sf:'2e', name:'DECLARATION.pdf' },
  { kw: ['sewage disposal','sewage','सिवेज'], folder:'2', sf:'2i', name:'SEWAGE DISPOSAL.pdf' },
  { kw: ['tenant band','tenent band','tenet band','भाडेकरू बंधपत्र'], folder:'2', sf:'2j', name:'TENANT BANDHPATRA.pdf' },
  { kw: ['undertaking not enclosed','undertaking not enclose'], folder:'2', sf:'2k', name:'UNDERTAKING NOT ENCLOSE.pdf' },
  { kw: ['undertaking'], folder:'2', sf:'2k', name:'UNDERTAKING.pdf' },
  { kw: ['pratidnya patra','pratigya patra','pradigya','pratigya','प्रतिज्ञा पत्र','pratingyapatr'], folder:'2', sf:'2l', name:'PRATIGYA PATRA.pdf' },
  { kw: ['tree affidavit','tree aff','tree pratidnya','वृक्ष प्रतिज्ञा'], folder:'2', sf:'2m', name:'TREE AFF.pdf' },
  { kw: ['band patr','बंधपत्र','bandhpatr','bandpatr'], folder:'2', sf:'2n', name:'BANDHPATR.pdf' },
  { kw: ['op affidavit','op aff','undertaking op'], folder:'2', sf:'2g', name:'OP AFFIDAVIT.pdf' },
  // Technical Papers
  { kw: ['architect appointment','ar appointment','appointment letter of arch','ar app'], folder:'3', sf:'3a', name:'AR APPOINTMENT.pdf' },
  { kw: ['architect acceptance','ar acceptance letter'], folder:'3', sf:'3b', name:'AR ACCEPTANCE LETTER.pdf' },
  { kw: ['architect supervision','ar supervision','ar undertaking super'], folder:'3', sf:'3c', name:'AR SUPERVISION.pdf' },
  { kw: ['form m','lic m f','architect licence','architect license'], folder:'3', sf:'3d', name:'LIC M F.pdf' },
  { kw: ['structural appointment','str appointment','structure appointment','appointment letter str','appointment letter structure','st app','str app'], folder:'3', sf:'3e', name:'STR APPOINTMENT.pdf' },
  { kw: ['structural acceptance','str acceptance','acceptance for str','acceptance letter str','str acceptance letter'], folder:'3', sf:'3f', name:'STR ACCEPTANCE.pdf' },
  { kw: ['structural supervision','str supervision','structure supervision','str stability','structural stability'], folder:'3', sf:'3g', name:'STR SUPERVISION.pdf' },
  { kw: ['vp 2028','vice president 2028','structural license','str license'], folder:'3', sf:'3h', name:'VP 2028.pdf' },
  { kw: ['site engineer','regarding app site eng','site eng'], folder:'3', sf:'3i', name:'SITE ENGINEER.pdf' },
  // NOC's
  { kw: ['dp remark','dp noting','development plan remark','d.p. remark'], folder:'4', sf:'4a', name:'DP.pdf' },
  { kw: ['tree noc','tree authority','provisional tree noc'], folder:'4', sf:'4b', name:'TREE NOC.pdf' },
  { kw: ['fire noc','fire department'], folder:'4', sf:'4c', name:'FIRE NOC.pdf' },
  { kw: ['ec noc','environment noc','envorment noc','environmental clearance'], folder:'4', sf:'4d', name:'EC NOC.pdf' },
  // Drawing and Report
  { kw: ['physical survey','physical & level','physical level','level survey'], folder:'8', sf:'8e', name:'PHYSICAL SURVEY.pdf' },
  { kw: ['google','google map','google earth','site photo'], folder:'8', sf:'8f', name:'GOOGLE.pdf' },
  // Owner/Society Papers
  { kw: ['section 79','sec 79','sec.79','section79','कलम 79'], folder:'9', sf:'9a', name:'SEC 79.pdf' },
  { kw: ['resolution','रिझोल्युशन','special general body','sgbm'], folder:'9', sf:'9b', name:'RESOLUTION.pdf' },
  { kw: ['c1 notice','c-1 notice','dilapidated notice'], folder:'9', sf:'9c', name:'C1 NOTICE.pdf' },
  { kw: ['redevelopment agreement','development agreement draft','development agreement'], folder:'9', sf:'9d', name:'DEV AGREEMENT.pdf' },
  { kw: ['power of attorney','power agreement'], folder:'9', sf:'9e', name:'PA.pdf' },
  { kw: ['partnership deed','partnership d'], folder:'9', sf:'9f', name:'PARTNERSHIP DEED.pdf' },
  { kw: ['pan card','company pan','firm pan'], folder:'9', sf:'9g', name:'PAN CARD.pdf' },
  { kw: ['no dues','no dues certificate'], folder:'9', sf:'9h', name:'NO DUES.pdf' },
  { kw: ['tenants','tenat doc','tenant doc','tenant paper','भाडेकरू'], folder:'9', sf:'9i', name:'TENANT PAPERS.pdf' },
  { kw: ['society resolution','resolution of society','sec79 resolution'], folder:'9', sf:'9b', name:'SOCIETY RESOLUTION.pdf' },
  { kw: ['register certificate','society registration cert','registration cert'], folder:'9', sf:null, name:'SOCIETY REG CERT.pdf' },
  { kw: ['society','सोसायटी'], folder:'9', sf:null, name:'SOCIETY PAPERS.pdf' },
];

function classify(text) {
  const t = text.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.kw) {
      if (t.includes(kw.toLowerCase())) return rule;
    }
  }
  return null;
}

async function extractText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array.length === 0) return '';

    // Check if it's a PDF
    if (uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
      return '';
    }
    
    const parser = new PDFParse({ data: uint8Array });
    const result = await parser.getText({ first: 3 });
    return result.text || '';
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('=== SMART FOLDER ASSIGNMENT (with PDF text extraction) ===\n');

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?client_id=eq.${CLIENT_ID}&select=*&name=like.RECOVERED%25&order=uploaded_at.asc`,
    { headers }
  );
  const docs = await res.json();
  console.log(`Found ${docs.length} RECOVERED documents to classify\n`);

  let classified = 0, unclassified = 0, failed = 0;
  const nameCount = {};
  const unclassifiedList = [];

  for (const doc of docs) {
    if (!doc.url) { unclassified++; continue; }

    process.stdout.write(`  Reading ${doc.name}... `);
    let rule = null;

    // Direct classification based on UUID / Name / File Characteristics
    if (doc.name.includes('019F9BFA')) {
      rule = { folder: '7', sf: null, name: 'STAGES FOR PROJECTS.docx' };
    } else if (doc.name.includes('913F05A0')) {
      rule = { folder: '8', sf: '8g', name: 'ENGINEER REPORT.docx' };
    } else if (doc.name.includes('24752D14')) {
      rule = { folder: '9', sf: '9d', name: 'DEV AGREEMENT.pdf' };
    } else if (doc.name.includes('A19A38BF')) {
      rule = { folder: '9', sf: '9e', name: 'PA.pdf' };
    } else if (doc.name.includes('9EC96E95')) {
      rule = { folder: '9', sf: '9d', name: 'DEV AGREEMENT 2.pdf' };
    } else if (doc.name.includes('C6DDB84C')) {
      rule = { folder: '2', sf: '2c', name: 'AFFIDAVIT.pdf' };
    } else if (doc.name.includes('D467230D') || doc.name.includes('DAE60BB3') || doc.name.includes('2AB4C158')) {
      rule = { folder: '9', sf: '9f', name: 'PARTNERSHIP DEED.pdf' };
    } else {
      const text = await extractText(doc.url);
      if (text) {
        rule = classify(text);
      }
    }

    if (!rule) {
      process.stdout.write('❓ unclassified\n');
      unclassified++;
      unclassifiedList.push({ ...doc, text: '' });
      continue;
    }

    // Handle duplicate names
    const key = `${rule.folder}-${rule.sf}-${rule.name}`;
    nameCount[key] = (nameCount[key] || 0) + 1;
    let finalName = rule.name;
    if (nameCount[key] > 1) {
      const ext = finalName.split('.').pop();
      finalName = `${finalName.replace('.' + ext, '')} ${nameCount[key]}.${ext}`;
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${doc.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: finalName, folder: rule.folder, subfolder: rule.sf })
    });

    if (patchRes.ok || patchRes.status === 204) {
      classified++;
      process.stdout.write(`✅ → ${finalName} [${rule.folder}/${rule.sf}]\n`);
    } else {
      failed++;
      process.stdout.write(`❌ update failed\n`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`  ✅ Classified: ${classified}`);
  console.log(`  ❓ Unclassified: ${unclassified}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (unclassifiedList.length > 0) {
    console.log(`\nFiles that couldn't be auto-identified (need manual rename):`);
    for (const d of unclassifiedList) {
      console.log(`  - ${d.name} | ${Math.round((d.size||0)/1024)}KB | ${d.url?.split('/').pop()}`);
      if (d.text) console.log(`    text preview: "${d.text.substring(0,100)}"`);
    }
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
