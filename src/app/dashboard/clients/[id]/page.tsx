'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientById, updateClient, Client, Phase, Document as Doc, viewDocumentSafe } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Image, FileText, FileSpreadsheet, Video, Paperclip, Mail, User, List, FolderOpen, Eye, Download, Trash2, Pencil, Check, X, Upload, CheckCircle2, Clock, ChevronDown, Folder, Plus, CloudUpload } from 'lucide-react';
import styles from './page.module.css';

const FOLDERS = [
  { id: '1', name: "Revenue", code: "REV", subfolders: [
    { id: "1a", code: "1.A", name: "7/12 Extract / Property Card" },
    { id: "1b", code: "1.B", name: "6/12 Extracts" },
    { id: "1c", code: "1.C", name: "Pikpahani Extracts" },
    { id: "1d", code: "1.D", name: "8A Extract" },
    { id: "1e", code: "1.E", name: "Advocate Reports" },
    { id: "1f", code: "1.F", name: "Others" }
  ]},
  { id: '2', name: "VVCMC Bonds & Forms", code: "VBF", subfolders: [] },
  { id: '3', name: "Technical Papers", code: "TEC", subfolders: [
    { id: "3a", code: "3.A", name: "Architect Papers" },
    { id: "3b", code: "3.B", name: "Structural Engineer Papers" },
    { id: "3c", code: "3.C", name: "Site Supervisor Papers" }
  ]},
  { id: '4', name: "VVMC NOC's", code: "NOC", subfolders: [] },
  { id: '5', name: "VVCMC Previous Approvals", code: "VPA", subfolders: [] },
  { id: '6', name: "Courts Cases / Complaints / Notices", code: "CCN", subfolders: [] },
  { id: '7', name: "Others", code: "OTH", subfolders: [] }
];

const STATUS_COLORS: Record<Client['projectStatus'], string> = {
  active: '#10b981',
  completed: '#3b82f6',
  'on-hold': '#f59e0b',
  pending: '#9ca3af',
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [newPhaseName, setNewPhaseName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'documents'>('overview');
  // Rename state: docId -> draft name
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const onDragStart = (e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.setData('text/plain', docId);
  };

  const onDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverTarget !== targetId) setDragOverTarget(targetId);
  };

  const onDragLeave = (e: React.DragEvent) => {
    setDragOverTarget(null);
  };

  const onDrop = (e: React.DragEvent, folderId?: string, subfolderId?: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (draggedDocId) {
      const doc = client?.documents.find(d => d.id === draggedDocId);
      if (client && doc && (doc.folder !== folderId || doc.subfolder !== subfolderId)) {
        const updated = client.documents.map(d => 
          d.id === doc.id ? { ...d, folder: folderId, subfolder: subfolderId } : d
        );
        updateClient(client.id, { documents: updated });
        reload();
      }
      setDraggedDocId(null);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), folderId, subfolderId);
    }
  };

  const reload = () => {
    const c = getClientById(params.id);
    if (!c) { router.replace('/dashboard/clients'); return; }
    setClient(c);
  };

  useEffect(() => { reload(); }, [params.id]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  if (!client) return null;

  const donePhases = client.phases.filter((p) => p.completed).length;
  const progress = client.phases.length > 0 ? Math.round((donePhases / client.phases.length) * 100) : 0;

  // ── Phase actions ──────────────────────────────────────────────────────────
  const addPhase = () => {
    const name = newPhaseName.trim();
    if (!name) return;
    const phase: Phase = {
      id: crypto.randomUUID(),
      name,
      completed: false,
      order: client.phases.length,
    };
    updateClient(client.id, { phases: [...client.phases, phase] });
    setNewPhaseName('');
    reload();
  };

  const togglePhase = (phaseId: string) => {
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, completed: !p.completed } : p
    );
    updateClient(client.id, { phases: updated });
    reload();
  };

  const deletePhase = (phaseId: string) => {
    const updated = client.phases.filter((p) => p.id !== phaseId);
    updateClient(client.id, { phases: updated });
    reload();
  };

  // ── Document actions ───────────────────────────────────────────────────────
  const processFiles = (files: File[], folderId?: string, subfolderId?: string) => {
    files.forEach(async (file) => {
      if (file.type.startsWith('image/')) {
        // Compress image first, then upload
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new globalThis.Image();
          img.onload = async () => {
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
            canvas.toBlob(async (blob) => {
              if (!blob) return;
              const ext = 'jpg';
              const path = `documents/${params.id}/${crypto.randomUUID()}.${ext}`;
              const { error } = await supabase.storage.from('uka-storage').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
              if (error) { alert('Upload failed: ' + error.message); return; }
              const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
              saveDocument(file.name, publicUrl, 'image/jpeg', blob.size, folderId, subfolderId);
            }, 'image/jpeg', 0.75);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        // Upload raw file directly to Supabase Storage
        const ext = file.name.split('.').pop() || 'bin';
        const path = `documents/${params.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('uka-storage').upload(path, file, { contentType: file.type, upsert: true });
        if (error) { alert('Upload failed: ' + error.message); return; }
        const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
        saveDocument(file.name, publicUrl, file.type, file.size, folderId, subfolderId);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const saveDocument = (name: string, url: string, type: string, size: number, folder?: string, subfolder?: string) => {
    const doc: Doc = {
      id: crypto.randomUUID(),
      name,
      url,
      uploadedAt: new Date().toISOString(),
      type: type || 'unknown',
      size,
      folder,
      subfolder,
    };
    const c = getClientById(params.id);
    if (!c) return;
    updateClient(c.id, { documents: [...c.documents, doc] });
    reload();
  };

  const deleteDocument = async (docId: string) => {
    const doc = client.documents.find(d => d.id === docId);
    if (confirm(`Are you sure you want to delete "${doc?.name || 'this document'}"? This cannot be undone.`)) {
      // 1. Delete from local JSON state to update UI immediately
      const updated = client.documents.filter((d) => d.id !== docId);
      updateClient(client.id, { documents: updated });
      reload();

      // 2. Permanently delete from Supabase Storage Bucket to free up data
      if (doc?.url && doc.url.includes('uka-storage/')) {
        try {
          const filePath = doc.url.split('uka-storage/')[1];
          if (filePath) {
            const { error } = await supabase.storage.from('uka-storage').remove([filePath]);
            if (error) console.error("Failed to delete file from Supabase Bucket:", error);
          }
        } catch (err) {
          console.error("Error extracting file path:", err);
        }
      }
    }
  };

  // ── Rename actions ─────────────────────────────────────────────────────────
  const startRename = (doc: Doc) => {
    setRenamingId(doc.id);
    setRenameDraft(doc.name);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) {
      const updated = client.documents.map((d) =>
        d.id === renamingId ? { ...d, name: trimmed } : d
      );
      updateClient(client.id, { documents: updated });
      reload();
    }
    setRenamingId(null);
    setRenameDraft('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameDraft('');
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fileIcon = (type: string, size = 20) => {
    if (type.includes('image')) return <Image size={size} strokeWidth={1.5} />;
    if (type.includes('pdf')) return <FileText size={size} strokeWidth={1.5} />;
    if (type.includes('word') || type.includes('document')) return <FileText size={size} strokeWidth={1.5} />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet size={size} strokeWidth={1.5} />;
    if (type.includes('video')) return <Video size={size} strokeWidth={1.5} />;
    return <Paperclip size={size} strokeWidth={1.5} />;
  };

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      {/* Back */}
      <Link href="/dashboard/clients" className={styles.back}>← Back to Clients</Link>

      {/* Hero header */}
      <div className={`glass-panel ${styles.hero}`}>
        <div className={styles.heroLeft}>
          <div className={styles.heroAvatar}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{client.name}</h1>
            {client.company && <p className={styles.heroCompany}>{client.company}</p>}
            <div className={styles.heroMeta}>
              {client.place && <span>📍 {client.place}</span>}
              {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Mail size={14} strokeWidth={1.5} />{client.email}</span>}
              {client.phone && <span>📞 {client.phone}</span>}
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <span
            className={styles.statusBadge}
            style={{
              background: `${STATUS_COLORS[client.projectStatus]}22`,
              color: STATUS_COLORS[client.projectStatus],
              border: `1px solid ${STATUS_COLORS[client.projectStatus]}44`,
            }}
          >
            {client.projectStatus.charAt(0).toUpperCase() + client.projectStatus.slice(1).replace('-', ' ')}
          </span>
          <Link href={`/dashboard/clients/${client.id}/edit`} className={styles.editBtn}>
            Edit Client
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      {client.phases.length > 0 && (
        <div className={`glass-panel ${styles.progressSection}`}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>
              {client.projectName ? `${client.projectName} — ` : ''}Project Progress
            </span>
            <span className={styles.progressPct}>{progress}%</span>
          </div>
          <div className={styles.progressBarOuter}>
            <div className={styles.progressBarInner} style={{ width: `${progress}%` }} />
          </div>
          <p className={styles.progressSub}>{donePhases} of {client.phases.length} phases completed</p>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['overview', 'phases', 'documents'] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && <User size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}{tab === 'phases' && <List size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}{tab === 'documents' && <FolderOpen size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'documents' && client.documents.length > 0 && (
              <span className={styles.tabCount}>{client.documents.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.infoGrid}>
            <InfoItem label="Full Name" value={client.name} />
            <InfoItem label="Company" value={client.company} />
            <InfoItem label="Email" value={client.email} />
            <InfoItem label="Phone" value={client.phone} />
            <InfoItem label="Location" value={client.place} />
            <InfoItem label="Address" value={client.address} />
            <InfoItem label="Project Name" value={client.projectName} />
            <InfoItem label="Project Status" value={client.projectStatus.replace('-', ' ')} />
            <InfoItem label="Client Since" value={new Date(client.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
          </div>
          {client.notes && (
            <div className={styles.notesBox}>
              <h3 className={styles.notesTitle}>Notes</h3>
              <p className={styles.notesText}>{client.notes}</p>
            </div>
          )}
          {client.tags && client.tags.length > 0 && (
            <div className={styles.tagsRow}>
              {client.tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Phases Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'phases' && (
        <div className={styles.tabContent}>
          <div className={styles.addPhaseRow}>
            <input
              type="text"
              placeholder="Phase name (e.g. 3D Render, Colour Graded…)"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPhase()}
              className={styles.phaseInput}
              id="new-phase-input"
            />
            <button className={styles.addPhaseBtn} onClick={addPhase}>+ Add Phase</button>
          </div>

          {client.phases.length === 0 ? (
            <div className={styles.emptyState}>No phases added yet. Add one above to track progress.</div>
          ) : (
            <div className={styles.phaseList}>
              {client.phases.map((phase, idx) => (
                <div
                  key={phase.id}
                  className={`${styles.phaseItem} ${phase.completed ? styles.phaseCompleted : ''}`}
                >
                  <div className={styles.phaseLeft}>
                    <span className={styles.phaseNumber}>{idx + 1}</span>
                    <button
                      className={`${styles.phaseCheck} ${phase.completed ? styles.checked : ''}`}
                      onClick={() => togglePhase(phase.id)}
                      id={`phase-check-${phase.id}`}
                      title={phase.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {phase.completed && <Check size={12} strokeWidth={2.5} />}
                    </button>
                    <span className={styles.phaseName}>{phase.name}</span>
                  </div>
                  <div className={styles.phaseRight}>
                    <span className={styles.phaseStatus}>
                      {phase.completed ? <><CheckCircle2 size={13} strokeWidth={2} style={{ marginRight: 4, verticalAlign: 'middle' }} />Done</> : <><Clock size={13} strokeWidth={2} style={{ marginRight: 4, verticalAlign: 'middle' }} />Pending</>}
                    </span>
                    <button
                      className={styles.phaseDelete}
                      onClick={() => deletePhase(phase.id)}
                      title="Remove phase"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Documents Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className={styles.tabContent}>
          <div
            className={`${styles.dropZone} ${dragOverTarget === 'main' ? styles.dragOver : ''}`}
            onDragOver={(e) => onDragOver(e, 'main')}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, undefined, undefined)}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className={styles.dropZoneIcon} size={26} strokeWidth={1.5} style={{ margin: '0 auto' }} />
            Drag &amp; drop files here, or <strong style={{ color: 'var(--primary)' }}>click to select</strong> — then assign to a folder below
            
            <div className={styles.stagedFiles}>
              {client.documents.filter(d => !d.folder && !d.subfolder).map(doc => (
                <div
                  key={doc.id}
                  className={styles.fileChip}
                  draggable
                  onDragStart={(e) => onDragStart(e, doc.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={styles.fileChipIcon}>{fileIcon(doc.type, 14)}</span>
                  <span className={styles.fileChipName} title={doc.name}>{doc.name}</span>
                  <Eye className={styles.fileChipDownload} size={14} onClick={() => viewDocumentSafe(doc.url)} title="View" />
                  <a href={doc.url} download={doc.name} onClick={(e) => e.stopPropagation()} title="Download">
                    <Download className={styles.fileChipDownload} size={14} />
                  </a>
                  <Trash2 className={styles.fileChipRemove} size={14} onClick={() => deleteDocument(doc.id)} title="Delete" />
                </div>
              ))}
            </div>
          </div>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className={styles.hiddenInput}
            onChange={handleFileUpload}
            id="file-upload-input"
          />

          <div className={styles.foldersGrid}>
            {FOLDERS.map((folder) => {
              const folderDocs = client.documents.filter(d => d.folder === folder.id);
              const totalDocs = folderDocs.length;
              const isOpen = openFolders[folder.id];

              return (
                <div key={folder.id} className={`${styles.folderCard} ${isOpen ? styles.folderCardOpen : ''} ${dragOverTarget === folder.id ? styles.dropTarget : ''}`}
                  onDragOver={(e) => onDragOver(e, folder.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, folder.id, undefined)}
                >
                  <div className={styles.folderHeader} onClick={() => toggleFolder(folder.id)}>
                    <div className={styles.folderIcon}><Folder size={18} strokeWidth={2} /></div>
                    <div className={styles.folderInfo}>
                      <div className={styles.folderName}>{folder.name}</div>
                      <div className={styles.folderMeta}>{folder.code} &nbsp;&middot;&nbsp; <span>{totalDocs}</span> files</div>
                    </div>
                    <ChevronDown className={styles.folderToggle} size={16} strokeWidth={2} />
                  </div>
                  
                  <div className={styles.folderBody}>
                    {folder.subfolders.map(sub => {
                      const subDocs = folderDocs.filter(d => d.subfolder === sub.id);
                      return (
                        <div key={sub.id}>
                          <div
                            className={`${styles.subfolder} ${dragOverTarget === sub.id ? styles.dropTarget : ''}`}
                            onDragOver={(e) => { e.stopPropagation(); onDragOver(e, sub.id); }}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => { e.stopPropagation(); onDrop(e, folder.id, sub.id); }}
                          >
                            <FolderOpen className={styles.subfolderIcon} size={14} strokeWidth={1.5} />
                            <span className={styles.subfolderName}>{sub.name}</span>
                            <span className={styles.subfolderCode}>{sub.code}</span>
                          </div>
                          {subDocs.length > 0 && (
                            <div className={styles.subfolderFiles}>
                              {subDocs.map(doc => (
                                <div
                                  key={doc.id}
                                  className={styles.fileChip}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, doc.id)}
                                >
                                  <span className={styles.fileChipIcon}>{fileIcon(doc.type, 14)}</span>
                                  <span className={styles.fileChipName} title={doc.name}>{doc.name}</span>
                                  <Eye className={styles.fileChipDownload} size={14} onClick={() => viewDocumentSafe(doc.url)} title="View" />
                                  <a href={doc.url} download={doc.name} onClick={(e) => e.stopPropagation()} title="Download">
                                    <Download className={styles.fileChipDownload} size={14} />
                                  </a>
                                  <Trash2 className={styles.fileChipRemove} size={14} onClick={() => deleteDocument(doc.id)} title="Delete" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div
                      className={`${styles.folderDropArea} ${dragOverTarget === `${folder.id}-root` ? styles.dragOver : ''}`}
                      onDragOver={(e) => { e.stopPropagation(); onDragOver(e, `${folder.id}-root`); }}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => { e.stopPropagation(); onDrop(e, folder.id, undefined); }}
                    >
                      <Plus size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Drop files here — root of {folder.name}
                    </div>

                    <div className={styles.rootFiles}>
                      {folderDocs.filter(d => !d.subfolder).map(doc => (
                        <div
                          key={doc.id}
                          className={styles.fileChip}
                          draggable
                          onDragStart={(e) => onDragStart(e, doc.id)}
                        >
                          <span className={styles.fileChipIcon}>{fileIcon(doc.type, 14)}</span>
                          <span className={styles.fileChipName} title={doc.name}>{doc.name}</span>
                          <Eye className={styles.fileChipDownload} size={14} onClick={() => viewDocumentSafe(doc.url)} title="View" />
                          <a href={doc.url} download={doc.name} onClick={(e) => e.stopPropagation()} title="Download">
                            <Download className={styles.fileChipDownload} size={14} />
                          </a>
                          <Trash2 className={styles.fileChipRemove} size={14} onClick={() => deleteDocument(doc.id)} title="Delete" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value || <span style={{ opacity: 0.4 }}>—</span>}</span>
    </div>
  );
}
