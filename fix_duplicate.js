const fs = require('fs');

function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let parts = content.split('const selected = whatsappRecipients.filter(r => r.selected);');
  
  if (parts.length > 2) {
    // Keep only the first occurrence
    content = parts[0] + 'const selected = whatsappRecipients.filter(r => r.selected);' + parts.slice(1).join('');
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  } else {
    console.log('Not enough duplicates in', filePath);
  }
}

fix('src/app/dashboard/clients/[id]/page.tsx');
fix('src/app/staff-dashboard/projects/[id]/page.tsx');

