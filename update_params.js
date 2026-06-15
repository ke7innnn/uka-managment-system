const fs = require('fs');

function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const newHandler = `
  const handleSendTaskTemplate = async (task: any) => {
    if (!task.templateName) return;
    if (!client) return;

    const uin = client.clientUin || 'N/A';
    const pName = client.projectName || 'N/A';
    let params: string[] = [];

    switch (task.templateName) {
      case 'stage1_task1':
      case 'stage1_task2':
      case 'stage2_task1':
      case 'stage3_task2':
        params = [];
        break;
      case 'stage1_task3':
        params = [uin, pName];
        break;
      case 'stage4_task1':
      case 'stage4_task2':
        const remark = window.prompt(\`Enter the manual remark for "\${task.title}":\`);
        if (remark === null) return; // User cancelled
        params = [uin, remark];
        break;
      default:
        // All others (stage3_task3, stage4_task3-7, stage5_1-2, stage6_1, etc.) take just UIN
        params = [uin];
        break;
    }

    const recs: WhatsappRecipient[] = [
      { id: 'admin', phone: '9320297059', name: 'Umesh Admin', role: 'Admin', selected: true },
      { id: 'dev', phone: '8087968560', name: 'Kevin Dev', role: 'Developer', selected: false }
    ];
    
    if (client.phone) {
      recs.push({ id: 'client_main', phone: client.phone.replace(/[^0-9]/g, ''), name: client.name || 'Main Client', role: 'Client', selected: true });
    }
    
    if (client.kyc?.otherOwners) {
      client.kyc.otherOwners.forEach((o: any, i: number) => {
        if (o.phone) recs.push({ id: \`owner_\${i}\`, phone: o.phone.replace(/[^0-9]/g, ''), name: o.name || \`Owner \${i+1}\`, role: 'Owner', selected: true });
      });
    }
    
    if (client.kyc?.references) {
      client.kyc.references.forEach((r: any, i: number) => {
        if (r.phone) recs.push({ id: \`ref_\${i}\`, phone: r.phone.replace(/[^0-9]/g, ''), name: r.name || \`Ref \${i+1}\`, role: 'Reference', selected: true });
      });
    }

    setWhatsappRecipients(recs);
    setWhatsappPreviewText(\`[Task Template: \${task.templateName}]\\n\\nSending variables:\\n\${params.map((p, i) => \`\${i+1}. \${p}\`).join('\\n')}\`);
    setPendingTaskTemplate({ templateName: task.templateName, params: params });
    setShowWhatsappModal(true);
  };
`;

  // Find the exact handleSendTaskTemplate block
  const oldHandlerRegex = /const handleSendTaskTemplate = async \([^\{]+\{[\s\S]*?setShowWhatsappModal\(true\);\s*\};/;
  if (oldHandlerRegex.test(content)) {
    content = content.replace(oldHandlerRegex, newHandler.trim());
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  } else {
    console.log('Regex failed for', filePath);
  }
}

fix('src/app/dashboard/clients/[id]/page.tsx');
fix('src/app/staff-dashboard/projects/[id]/page.tsx');
