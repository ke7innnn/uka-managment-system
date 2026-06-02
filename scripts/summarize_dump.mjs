import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/all_chirag_texts.json', 'utf8'));

console.log(`=== SUMMARIZING ${data.length} RECOVERED DOCUMENTS ===\n`);

let emptyCount = 0;
let textCount = 0;
let errCount = 0;

for (const doc of data) {
  if (doc.error) {
    console.log(`❌ [ERROR] ${doc.name}: ${doc.error}`);
    errCount++;
    continue;
  }

  const cleanText = (doc.text || '').replace(/\s+/g, ' ').trim();
  const pageStr = cleanText.replace(/-- \d+ of \d+ --/g, '').trim();
  
  if (pageStr.length === 0) {
    console.log(`⚪ [EMPTY/SCANNED] ${doc.name} | ${Math.round(doc.size/1024)}KB | ${doc.pages} pages`);
    emptyCount++;
  } else {
    console.log(`📝 [TEXT] ${doc.name} | ${Math.round(doc.size/1024)}KB | ${doc.pages} pages`);
    console.log(`   Cleaned text (first 300 chars): "${cleanText.substring(0, 300)}"`);
    textCount++;
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`  📝 With Text: ${textCount}`);
console.log(`  ⚪ Scanned/Empty: ${emptyCount}`);
console.log(`  ❌ Failed: ${errCount}`);
