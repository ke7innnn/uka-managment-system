'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientById, updateClient, Client, Phase, Document as Doc, viewDocumentSafe, getStaff, StaffMember } from '@/lib/store';
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
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({});
  const [editingTimeBound, setEditingTimeBound] = useState<string | null>(null);
  const [timeBoundDraft, setTimeBoundDraft] = useState('');
  const [newTaskDraft, setNewTaskDraft] = useState<Record<string, string>>({});
  // Rename state: docId -> draft name
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ folderId?: string; subfolderId?: string } | null>(null);

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const triggerFolderUpload = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setUploadTarget({ folderId });
    fileInputRef.current?.click();
  };

  const triggerSubfolderUpload = (e: React.MouseEvent, folderId: string, subfolderId: string) => {
    e.stopPropagation();
    setUploadTarget({ folderId, subfolderId });
    fileInputRef.current?.click();
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
    setStaffList(getStaff());
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
  const addStage = () => {
    const name = newPhaseName.trim();
    if (!name) return;
    const stage: Phase = {
      id: crypto.randomUUID(),
      name,
      status: 'not-started',
      order: client.phases.length,
      tasks: [],
    };
    updateClient(client.id, { phases: [...client.phases, stage] });
    setNewPhaseName('');
    reload();
  };

  const deleteStage = (phaseId: string) => {
    const updated = client.phases.filter((p) => p.id !== phaseId);
    updateClient(client.id, { phases: updated });
    reload();
  };

  const startStage = (phaseId: string) => {
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, status: 'in-progress' as const, startedAt: new Date().toISOString() } : p
    );
    updateClient(client.id, { phases: updated });
    reload();
  };

  const markStageComplete = (phaseId: string) => {
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, status: 'completed' as const } : p
    );
    updateClient(client.id, { phases: updated });
    reload();
  };

  const saveTimeBound = (phaseId: string) => {
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, timeBound: timeBoundDraft } : p
    );
    updateClient(client.id, { phases: updated });
    setEditingTimeBound(null);
    reload();
  };

  const addTask = (phaseId: string) => {
    const title = (newTaskDraft[phaseId] || '').trim();
    if (!title) return;
    const updated = client.phases.map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: [...p.tasks, { id: crypto.randomUUID(), title, completed: false, assignedTo: '' }]
        };
      }
      return p;
    });
    updateClient(client.id, { phases: updated });
    setNewTaskDraft(prev => ({ ...prev, [phaseId]: '' }));
    reload();
  };

  const toggleTask = (phaseId: string, taskId: string) => {
    const updated = client.phases.map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return p;
    });
    updateClient(client.id, { phases: updated });
    reload();
  };

  const assignTask = (phaseId: string, taskId: string, staffName: string) => {
    const updated = client.phases.map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, assignedTo: staffName } : t)
        };
      }
      return p;
    });
    updateClient(client.id, { phases: updated });
    reload();
  };
  
  const deleteTask = (phaseId: string, taskId: string) => {
    const updated = client.phases.map((p) => {
      if (p.id === phaseId) {
        return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
      }
      return p;
    });
    updateClient(client.id, { phases: updated });
    reload();
  };

  const toggleStageAccordion = (phaseId: string) => {
    setOpenStages(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
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
    if (files.length > 0) {
      processFiles(files, uploadTarget?.folderId, uploadTarget?.subfolderId);
    }
    setUploadTarget(null);
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
              placeholder="Stage name (e.g. Stage 5 - Final Review)"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStage()}
              className={styles.phaseInput}
            />
            <button className={styles.addPhaseBtn} onClick={addStage}>+ Add Stage</button>
          </div>

          {client.phases.length === 0 ? (
            <div className={styles.emptyState}>No stages added yet. Add one above or use a template.</div>
          ) : (
            <div className={styles.stageList}>
              {client.phases.map((phase) => {
                const isOpen = openStages[phase.id];
                const totalTasks = phase.tasks?.length || 0;
                const doneTasks = phase.tasks?.filter(t => t.completed).length || 0;
                const isCompleted = phase.status === 'completed';

                return (
                  <div key={phase.id} className={`${styles.stageSection} ${isOpen ? styles.open : ''} ${isCompleted ? styles.completed : ''}`}>
                    <div className={styles.stageHeader} onClick={() => toggleStageAccordion(phase.id)}>
                      <div className={styles.stageHeaderLeft}>
                        <div className={styles.stageHeaderTitle}>
                          <span className={styles.stageTitleText}>{phase.name}</span>
                          {isCompleted ? (
                            <span className={styles.stageDoneBadge}><Check size={12} style={{ marginRight: 4 }} /> Done</span>
                          ) : (
                            <span className={styles.stageProgressBadge}>{doneTasks}/{totalTasks} Tasks</span>
                          )}
                        </div>
                        <div className={styles.stageMeta}>
                          {phase.status === 'in-progress' && <span className={styles.statusBadgeActive}>In Progress</span>}
                          {phase.status === 'not-started' && <span className={styles.statusBadgePending}>Not Started</span>}
                          <span className={styles.timeBoundContainer} onClick={e => e.stopPropagation()}>
                            {editingTimeBound === phase.id ? (
                              <div className={styles.timeBoundEdit}>
                                <input 
                                  autoFocus
                                  value={timeBoundDraft} 
                                  onChange={e => setTimeBoundDraft(e.target.value)}
                                  placeholder="e.g. 5 working days"
                                  className={styles.timeBoundInput}
                                  onKeyDown={e => { if (e.key === 'Enter') saveTimeBound(phase.id); if (e.key === 'Escape') setEditingTimeBound(null); }}
                                />
                                <button onClick={() => saveTimeBound(phase.id)} className={styles.tbSave}><Check size={12} /></button>
                                <button onClick={() => setEditingTimeBound(null)} className={styles.tbCancel}><X size={12} /></button>
                              </div>
                            ) : (
                              <div className={styles.timeBoundDisplay}>
                                <Clock size={12} /> 
                                <span>{phase.timeBound || 'No deadline set'}</span>
                                <button onClick={() => { setEditingTimeBound(phase.id); setTimeBoundDraft(phase.timeBound || ''); }} className={styles.tbEditBtn}>
                                  <Pencil size={10} />
                                </button>
                              </div>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className={styles.stageHeaderRight}>
                        <button className={styles.stageDeleteBtn} onClick={(e) => { e.stopPropagation(); deleteStage(phase.id); }} title="Delete Stage"><Trash2 size={14} /></button>
                        <ChevronDown size={18} className={styles.stageChevron} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className={styles.stageBody}>
                        <div className={styles.stageControls}>
                          {phase.status === 'not-started' && (
                            <button className={styles.startStageBtn} onClick={() => startStage(phase.id)}>Start Stage</button>
                          )}
                          {phase.status === 'in-progress' && (
                            <button className={styles.completeStageBtn} onClick={() => markStageComplete(phase.id)}><CheckCircle2 size={14} /> Mark Stage Complete</button>
                          )}
                          {phase.startedAt && (
                            <span className={styles.startedAtText}>Started: {new Date(phase.startedAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        <div className={styles.taskList}>
                          {phase.tasks?.map(task => (
                            <div key={task.id} className={`${styles.taskItem} ${task.completed ? styles.taskDone : ''}`}>
                              <button className={styles.taskCheck} onClick={() => toggleTask(phase.id, task.id)}>
                                {task.completed && <Check size={12} strokeWidth={3} />}
                              </button>
                              <span className={styles.taskTitle}>{task.title}</span>
                              <div className={styles.taskActions}>
                                <select 
                                  className={styles.assigneeSelect} 
                                  value={task.assignedTo || ''} 
                                  onChange={(e) => assignTask(phase.id, task.id, e.target.value)}
                                >
                                  <option value="">Unassigned</option>
                                  {staffList.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                  ))}
                                </select>
                                <button className={styles.taskDeleteBtn} onClick={() => deleteTask(phase.id, task.id)}><X size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className={styles.addTaskRow}>
                          <input 
                            type="text" 
                            placeholder="Add new sub-task..."
                            value={newTaskDraft[phase.id] || ''}
                            onChange={e => setNewTaskDraft(prev => ({ ...prev, [phase.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addTask(phase.id)}
                            className={styles.addTaskInput}
                          />
                          <button className={styles.addTaskBtn} onClick={() => addTask(phase.id)}>Add Task</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            onClick={() => {
              setUploadTarget(null);
              fileInputRef.current?.click();
            }}
          >
            <div className={styles.dropZoneContent}>
              <div className={styles.dropZoneIconContainer}>
                <CloudUpload className={styles.dropZoneIcon} size={28} strokeWidth={1.5} />
              </div>
              <div className={styles.dropZoneTitle}>Drag &amp; drop files here, or <span className={styles.highlight}>click to select</span></div>
              <div className={styles.dropZoneSub}>Assign documents to their corresponding folders below</div>
            </div>
          </div>

          {/* Staged / Unassigned files */}
          {client.documents.filter(d => !d.folder && !d.subfolder).length > 0 && (
            <div className={styles.stagedSection}>
              <h4 className={styles.stagedSectionTitle}>Staged Files (Drag these into folders below)</h4>
              <div className={styles.stagedFilesGrid}>
                {client.documents.filter(d => !d.folder && !d.subfolder).map(doc => (
                  <div key={doc.id} onClick={(e) => e.stopPropagation()}>
                    {renamingId === doc.id ? (
                      <div className={styles.renameRow} style={{ maxWidth: 220, padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '20px' }}>
                        <input
                          type="text"
                          ref={renameInputRef}
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') cancelRename();
                          }}
                          className={styles.renameInput}
                          style={{ height: 26, fontSize: 11, borderRadius: 14 }}
                        />
                        <button className={styles.renameSave} onClick={commitRename} style={{ width: 22, height: 22, borderRadius: 11 }} title="Save">
                          <Check size={12} />
                        </button>
                        <button className={styles.renameCancel} onClick={cancelRename} style={{ width: 22, height: 22, borderRadius: 11 }} title="Cancel">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={styles.fileChip}
                        draggable
                        onDragStart={(e) => onDragStart(e, doc.id)}
                      >
                        <span className={styles.fileChipIcon}>{fileIcon(doc.type, 14)}</span>
                        <span className={styles.fileChipName} title={doc.name}>{doc.name}</span>
                        <Pencil className={styles.fileChipDownload} size={14} onClick={() => startRename(doc)} />
                        <Eye className={styles.fileChipDownload} size={14} onClick={() => viewDocumentSafe(doc.url)} />
                        <a href={doc.url} download={doc.name} onClick={(e) => e.stopPropagation()} title="Download">
                          <Download className={styles.fileChipDownload} size={14} />
                        </a>
                        <Trash2 className={styles.fileChipRemove} size={14} onClick={() => deleteDocument(doc.id)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                    <div className={styles.folderHeaderActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.folderActionBtn}
                        onClick={(e) => triggerFolderUpload(e, folder.id)}
                        title={`Upload file directly to ${folder.name}`}
                      >
                        <Upload size={13} />
                      </button>
                      <ChevronDown className={styles.folderToggle} size={16} strokeWidth={2} onClick={() => toggleFolder(folder.id)} />
                    </div>
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
                            
                            <div className={styles.subfolderActions} onClick={(e) => e.stopPropagation()}>
                              <span className={styles.subfolderCode}>{sub.code}</span>
                              <button
                                className={styles.subfolderActionBtn}
                                onClick={(e) => triggerSubfolderUpload(e, folder.id, sub.id)}
                                title={`Upload file directly to ${sub.name}`}
                              >
                                <Upload size={11} />
                              </button>
                            </div>
                          </div>
                          {subDocs.length > 0 && (
                            <div className={styles.subfolderFiles}>
                              {subDocs.map(doc => (
                                <div
                                  key={doc.id}
                                  className={styles.fileRow}
                                  draggable={renamingId !== doc.id}
                                  onDragStart={(e) => onDragStart(e, doc.id)}
                                >
                                  {renamingId === doc.id ? (
                                    <div className={styles.renameRow} onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        ref={renameInputRef}
                                        value={renameDraft}
                                        onChange={(e) => setRenameDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') commitRename();
                                          if (e.key === 'Escape') cancelRename();
                                        }}
                                        className={styles.renameInput}
                                      />
                                      <button className={styles.renameSave} onClick={commitRename} title="Save">
                                        <Check size={14} />
                                      </button>
                                      <button className={styles.renameCancel} onClick={cancelRename} title="Cancel">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className={styles.fileRowLeft}>
                                        <span className={styles.fileRowIcon}>{fileIcon(doc.type, 14)}</span>
                                        <span className={styles.fileRowName} title={doc.name}>{doc.name}</span>
                                        <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                                      </div>
                                      <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                                        <button className={styles.actionBtn} onClick={() => startRename(doc)} title="Rename">
                                          <Pencil size={13} />
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                          <Eye size={13} />
                                        </button>
                                        <a href={doc.url} download={doc.name} className={styles.actionBtn} title="Download">
                                          <Download size={13} />
                                        </a>
                                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => deleteDocument(doc.id)} title="Delete">
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </>
                                  )}
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
                          className={styles.fileRow}
                          draggable={renamingId !== doc.id}
                          onDragStart={(e) => onDragStart(e, doc.id)}
                        >
                          {renamingId === doc.id ? (
                            <div className={styles.renameRow} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                ref={renameInputRef}
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRename();
                                  if (e.key === 'Escape') cancelRename();
                                }}
                                className={styles.renameInput}
                              />
                              <button className={styles.renameSave} onClick={commitRename} title="Save">
                                <Check size={14} />
                              </button>
                              <button className={styles.renameCancel} onClick={cancelRename} title="Cancel">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className={styles.fileRowLeft}>
                                <span className={styles.fileRowIcon}>{fileIcon(doc.type, 14)}</span>
                                <span className={styles.fileRowName} title={doc.name}>{doc.name}</span>
                                <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                              </div>
                              <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                                <button className={styles.actionBtn} onClick={() => startRename(doc)} title="Rename">
                                  <Pencil size={13} />
                                </button>
                                <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                  <Eye size={13} />
                                </button>
                                <a href={doc.url} download={doc.name} className={styles.actionBtn} title="Download">
                                  <Download size={13} />
                                </a>
                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => deleteDocument(doc.id)} title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
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
