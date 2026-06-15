const fs = require('fs');

function processPage(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add state for tracking sending status
  if (!content.includes('const [sendingTaskIds')) {
    content = content.replace(
      /const \[activeTab, setActiveTab\] = useState\('overview'\);/,
      `const [activeTab, setActiveTab] = useState('overview');\n  const [sendingTaskIds, setSendingTaskIds] = useState<Record<string, boolean>>({});`
    );
  }

  // Add handleSendTaskTemplate
  if (!content.includes('const handleSendTaskTemplate = async')) {
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
    // Insert before "const reload = async () =>"
    content = content.replace(
      /  const reload = async \(\) => {/g,
      handlerCode + '\n  const reload = async () => {'
    );
  }

  // Add the Send button in the task actions
  const oldTaskActions = `                                <input 
                                  list="staff-list"
                                  className={styles.assigneeSelect} 
                                  value={task.assignedTo || ''} 
                                  onChange={(e) => assignTask(phase.id, task.id, e.target.value)}
                                  placeholder="Assignee (e.g. Sadhana)"
                                />
                                <datalist id="staff-list">
                                  {staffList.map(s => (
                                    <option key={s.id} value={s.name} />
                                  ))}
                                </datalist>
                                {task.completed && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); reassignTask(phase.id, task.id); }}
                                    title="Reassign this task"
                                    className={styles.reassignBtn}
                                  >
                                    ↺ Reassign
                                  </button>
                                )}
                                <button className={styles.taskDeleteBtn} onClick={() => deleteTask(phase.id, task.id)}><X size={14} /></button>`;

  const newTaskActions = `                                <input 
                                  list="staff-list"
                                  className={styles.assigneeSelect} 
                                  value={task.assignedTo || ''} 
                                  onChange={(e) => assignTask(phase.id, task.id, e.target.value)}
                                  placeholder="Assignee (e.g. Sadhana)"
                                />
                                <datalist id="staff-list">
                                  {staffList.map(s => (
                                    <option key={s.id} value={s.name} />
                                  ))}
                                </datalist>

                                {/* WHATSAPP SEND BUTTON */}
                                {task.templateName && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSendTaskTemplate(task); }}
                                    title={\`Send WhatsApp Template: \${task.templateName}\`}
                                    disabled={sendingTaskIds[task.id]}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      background: 'rgba(37, 211, 102, 0.1)',
                                      border: '1px solid rgba(37, 211, 102, 0.3)',
                                      borderRadius: '4px',
                                      color: '#25D366',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: sendingTaskIds[task.id] ? 'not-allowed' : 'pointer',
                                      opacity: sendingTaskIds[task.id] ? 0.6 : 1
                                    }}
                                  >
                                    {sendingTaskIds[task.id] ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                                    Send
                                  </button>
                                )}

                                {task.completed && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); reassignTask(phase.id, task.id); }}
                                    title="Reassign this task"
                                    className={styles.reassignBtn}
                                  >
                                    ↺ Reassign
                                  </button>
                                )}
                                <button className={styles.taskDeleteBtn} onClick={() => deleteTask(phase.id, task.id)}><X size={14} /></button>`;

  content = content.replace(oldTaskActions, newTaskActions);

  fs.writeFileSync(filePath, content);
  console.log('Successfully updated', filePath);
}

processPage('src/app/dashboard/clients/[id]/page.tsx');
processPage('src/app/staff-dashboard/projects/[id]/page.tsx');

