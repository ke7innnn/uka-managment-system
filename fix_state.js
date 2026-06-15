const fs = require('fs');

function insertState(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('const [sendingTaskIds')) {
    content = content.replace(
      /const \[activeTab, setActiveTab\] = useState[^;]+;/g,
      "$&" + `\n  const [sendingTaskIds, setSendingTaskIds] = useState<Record<string, boolean>>({});`
    );
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

insertState('src/app/dashboard/clients/[id]/page.tsx');
insertState('src/app/staff-dashboard/projects/[id]/page.tsx');

