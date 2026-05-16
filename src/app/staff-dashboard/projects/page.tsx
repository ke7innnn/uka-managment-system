'use client';

import { useEffect, useState, useRef } from 'react';
import { getClients, updateClient, Client, Document as Doc, isStaffAuthenticated, viewDocumentSafe } from '@/lib/store';
import { ImageIcon, FileText, FileSpreadsheet, Video, Paperclip, Eye, Download, Upload, Pencil, Check, X } from 'lucide-react';
import styles from '@/app/dashboard/clients/page.module.css';
import detailStyles from '@/app/dashboard/clients/[id]/page.module.css';

export default function StaffProjectsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);

  // Renaming state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setClients(getClients());
  };

  useEffect(() => { 
    reload(); 
    setCurrentStaffId(isStaffAuthenticated());
  }, []);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleSelect = (id: string) => {
    setSelectedClient(clients.find(c => c.id === id) || null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedClient || !currentStaffId) return;
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new globalThis.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
              if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            saveDocument(file.name, dataUrl, 'image/jpeg', Math.round((dataUrl.length * 3) / 4));
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          saveDocument(file.name, ev.target?.result as string, file.type, file.size);
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  const saveDocument = (name: string, url: string, type: string, size: number) => {
    if (!selectedClient || !currentStaffId) return;
    const doc: Doc = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      url,
      uploadedAt: new Date().toISOString(),
      type: type || 'unknown',
      size,
      uploadedBy: currentStaffId
    };
    const c = getClients().find(cl => cl.id === selectedClient.id);
    if (!c) return;
    const updatedDocs = [...c.documents, doc];
    try {
      updateClient(c.id, { documents: updatedDocs });
      reload();
      setSelectedClient({ ...c, documents: updatedDocs });
    } catch (err) {
      alert(`Error saving document "${name}". It is likely too large for local storage.`);
    }
  };

  const startRename = (doc: Doc) => {
    setRenamingId(doc.id);
    setRenameDraft(doc.name);
  };

  const commitRename = () => {
    if (!renamingId || !selectedClient) return;
    const trimmed = renameDraft.trim();
    if (trimmed) {
      const updatedDocs = selectedClient.documents.map((d) =>
        d.id === renamingId ? { ...d, name: trimmed } : d
      );
      updateClient(selectedClient.id, { documents: updatedDocs });
      reload();
      setSelectedClient({ ...selectedClient, documents: updatedDocs });
    }
    setRenamingId(null);
    setRenameDraft('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameDraft('');
  };

  const fileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={20} strokeWidth={1.5} />;
    if (type.includes('pdf')) return <FileText size={20} strokeWidth={1.5} />;
    if (type.includes('word') || type.includes('document')) return <FileText size={20} strokeWidth={1.5} />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet size={20} strokeWidth={1.5} />;
    if (type.includes('video')) return <Video size={20} strokeWidth={1.5} />;
    return <Paperclip size={20} strokeWidth={1.5} />;
  };

  if (selectedClient) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 500 }}>
          ← Back to Projects
        </button>
        
        <div className={`glass-panel ${detailStyles.hero}`}>
          <div>
            <h1 className={detailStyles.heroName}>{selectedClient.projectName || selectedClient.name}</h1>
            <p className={detailStyles.heroCompany}>Client: {selectedClient.name}</p>
          </div>
          <div>
            <button className={detailStyles.uploadBtn} onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--primary)', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Upload size={15} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />Upload Document
            </button>
            <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>
        </div>

        <h3 style={{ marginBottom: '1rem', marginTop: '2rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Project Documents</h3>
        
        {selectedClient.documents.length === 0 ? (
          <div className={detailStyles.emptyState}>No documents uploaded yet.</div>
        ) : (
          <div className={detailStyles.docGrid}>
            {selectedClient.documents.map((doc) => (
              <div key={doc.id} className={`glass-panel ${detailStyles.docCard}`}>
                <div className={detailStyles.docIcon}>{fileIcon(doc.type)}</div>
                <div className={detailStyles.docInfo}>
                  {renamingId === doc.id ? (
                    <div className={detailStyles.renameRow}>
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        className={detailStyles.renameInput}
                      />
                      <button className={detailStyles.renameSave} onClick={commitRename}><Check size={14} strokeWidth={2.5} /></button>
                      <button className={detailStyles.renameCancel} onClick={cancelRename}><X size={14} strokeWidth={2.5} /></button>
                    </div>
                  ) : (
                    <div className={detailStyles.docNameRow}>
                      <p className={detailStyles.docName} title={doc.name}>{doc.name}</p>
                      {doc.uploadedBy === currentStaffId && (
                        <button className={detailStyles.renameBtn} onClick={() => startRename(doc)} title="Rename document">
                          <Pencil size={13} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  )}
                  <p className={detailStyles.docMeta}>
                    {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className={detailStyles.docActions}>
                  <button onClick={() => viewDocumentSafe(doc.url)} className={detailStyles.docDownload} title="View" style={{ marginRight: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}><Eye size={15} strokeWidth={1.75} /></button>
                  <a href={doc.url} download={doc.name} className={detailStyles.docDownload} title="Download"><Download size={15} strokeWidth={1.75} /></a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Client Projects</h1>
        <p className={styles.subtitle}>Select a project to view or upload documents.</p>
      </div>

      <div className={styles.grid}>
        {clients.map((client) => (
          <div key={client.id} className={`glass-panel ${styles.clientCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>{client.name.charAt(0).toUpperCase()}</div>
              <div className={styles.info}>
                <h2 className={styles.name}>{client.projectName || 'General Project'}</h2>
                <p className={styles.company}>{client.name}</p>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <button 
                onClick={() => handleSelect(client.id)}
                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', padding: '0.5rem 1rem', borderRadius: '8px', width: '100%', cursor: 'pointer', fontWeight: 600 }}
              >
                View Documents
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
            No clients or projects available.
          </div>
        )}
      </div>
    </div>
  );
}
