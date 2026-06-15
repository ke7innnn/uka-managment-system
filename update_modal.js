const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Add pendingTaskTemplate state
  if (!content.includes('const [pendingTaskTemplate')) {
    content = content.replace(
      /const \[whatsappMessageType, setWhatsappMessageType\] = useState<'progress' \| 'oc'>\('progress'\);/,
      `const [whatsappMessageType, setWhatsappMessageType] = useState<'progress' | 'oc'>('progress');\n  const [pendingTaskTemplate, setPendingTaskTemplate] = useState<{templateName: string, params: string[]} | null>(null);`
    );
  }

  // 2. Rewrite handleSendTaskTemplate
  const newHandler = `
  const handleSendTaskTemplate = async (task: any) => {
    if (!task.templateName) return;
    if (!client) return;

    let params: string[] = [
      client.clientUin || 'N/A',
      client.name || 'N/A',
      client.projectName || 'N/A'
    ];

    if (task.requiresManualRemark) {
      const remark = window.prompt(\`Enter the manual remark for "\${task.title}":\`);
      if (remark === null) return; // User cancelled
      params = [client.clientUin || 'N/A', remark];
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

  content = content.replace(/const handleSendTaskTemplate = async \([^\{]+\{([\s\S]*?)\} finally \{\s*setSendingTaskIds[^\}]+\}\s*\};\s*}/, newHandler.trim());
  // fallback if the regex fails because of slight mismatch
  if (content.includes('fetch(\'/api/whatsapp\'')) {
     const regex = /const handleSendTaskTemplate = async \([^\{]+\{([\s\S]*?)finally \{\s*setSendingTaskIds\([^)]+\);\s*\}\s*\};/;
     content = content.replace(regex, newHandler.trim());
  }

  // 3. Update handleConfirmSendWhatsapp
  const confirmStart = `const handleConfirmSendWhatsapp = async () => {
    if (!client) return;
    setWhatsappSending(true);
    try {
      const selected = whatsappRecipients.filter(r => r.selected);

      if (pendingTaskTemplate) {
        for (const rec of selected) {
          if (!rec.phone || rec.phone.trim() === '') continue;
          await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: rec.phone,
              userName: client.name || "Client",
              senderName: 'UKA Admin (Sent via Task)',
              params: pendingTaskTemplate.params,
              templateName: pendingTaskTemplate.templateName
            })
          });
        }
        setShowWhatsappModal(false);
        setPendingTaskTemplate(null);
        alert(\`Successfully sent WhatsApp template: \${pendingTaskTemplate.templateName}\`);
        return;
      }`;
      
  if (!content.includes('if (pendingTaskTemplate) {')) {
    content = content.replace(
      /const handleConfirmSendWhatsapp = async \(\) => \{\s*if \(!client\) return;\s*setWhatsappSending\(true\);\s*try \{/,
      confirmStart
    );
  }

  // 4. Also handle close modal to clear pendingTaskTemplate
  content = content.replace(
    /<button onClick=\{\(\) => setShowWhatsappModal\(false\)\} style=\{\{[^\}]+\}\}>Cancel<\/button>/g,
    `<button onClick={() => { setShowWhatsappModal(false); setPendingTaskTemplate(null); }} style={{ padding: '10px 20px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>`
  );

  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
}

processFile('src/app/dashboard/clients/[id]/page.tsx');
processFile('src/app/staff-dashboard/projects/[id]/page.tsx');
