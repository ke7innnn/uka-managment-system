const fs = require('fs');

function insertHandler(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const handlerCode = `
  const handleSendTaskTemplate = async (task: any) => {
    if (!task.templateName) return;
    if (!client?.phone) {
      alert("Client has no phone number set!");
      return;
    }

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

    setSendingTaskIds(prev => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: client.phone,
          templateName: task.templateName,
          params: params,
          senderName: "UKA Admin (Sent via Task)"
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.error?.message || JSON.stringify(data.error) || 'Failed to send template');
      }
      alert(\`Successfully sent WhatsApp template: \${task.templateName}\`);
    } catch (err: any) {
      console.error(err);
      alert(\`Error sending template: \${err.message}\`);
    } finally {
      setSendingTaskIds(prev => ({ ...prev, [task.id]: false }));
    }
  };
`;

  if (!content.includes('const handleSendTaskTemplate = async')) {
    content = content.replace(
      /  const reload = \(\) => {/,
      handlerCode + '\n  const reload = () => {'
    );
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

insertHandler('src/app/dashboard/clients/[id]/page.tsx');
insertHandler('src/app/staff-dashboard/projects/[id]/page.tsx');

