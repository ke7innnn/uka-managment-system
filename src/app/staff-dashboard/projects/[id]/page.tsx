'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientById, updateClient, Client, Phase, Document as Doc, viewDocumentSafe, getStaff, StaffMember, getClients, isStaffAuthenticated, PROGRESS_CHECKLIST_ITEMS, OC_CHECKLIST_ITEMS, DOCUMENT_FOLDERS as FOLDERS, getStageDefaultWorkingDays, calculateDefaultDeadline } from '@/lib/store';
import { initStageReminders, clearStageReminders, processReminders, updateStageReminderSchedule } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { Image, FileText, FileSpreadsheet, Video, Paperclip, Mail, User, List, FolderOpen, Eye, Download, Trash2, Pencil, Check, X, Upload, CheckCircle2, Clock, ChevronDown, Folder, Plus, CloudUpload, Loader2, ClipboardCheck, Search, MessageSquare } from 'lucide-react';
import styles from '@/app/dashboard/clients/[id]/page.module.css';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'documents' | 'progress' | 'oc'>('overview');
  
  // Client progress checklist search/filters & success state
  const [progressSearch, setProgressSearch] = useState('');
  const [progressFilter, setProgressFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [showSendSuccess, setShowSendSuccess] = useState(false);

  const handleSendProgress = () => {
    setShowSendSuccess(true);
    setTimeout(() => setShowSendSuccess(false), 4000);
  };

  const handleToggleChecklist = (itemId: string) => {
    if (!client) return;
    const current = client.progressChecklist || [];
    const updated = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId];
    
    updateClient(client.id, { progressChecklist: updated });
    reload();
  };

  // OC checklist search/filters & success state
  const [ocSearch, setOcSearch] = useState('');
  const [ocFilter, setOcFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [showOcSendSuccess, setShowOcSendSuccess] = useState(false);

  const handleSendOc = () => {
    setShowOcSendSuccess(true);
    setTimeout(() => setShowOcSendSuccess(false), 4000);
  };

  const handleToggleOcChecklist = (itemId: string) => {
    if (!client) return;
    const current = client.ocChecklist || [];
    const updated = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId];
    
    updateClient(client.id, { ocChecklist: updated });
    reload();
  };
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
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
  const [uploadingFolders, setUploadingFolders] = useState<Record<string, boolean>>({});
  const [uploadingSubfolders, setUploadingSubfolders] = useState<Record<string, boolean>>({});
  const [isUploadingGeneral, setIsUploadingGeneral] = useState(false);

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
    if (!c) { router.replace('/staff-dashboard/projects'); return; }
    setClient(c);
    setStaffList(getStaff());
    setCurrentStaffId(isStaffAuthenticated());
    // Process any due reminders on each reload
    processReminders(getClients());
  };

  useEffect(() => { reload(); }, [params.id]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Safety navigation block when uploading files
  useEffect(() => {
    const isUploading = isUploadingGeneral || 
                        Object.values(uploadingFolders).some(v => v) || 
                        Object.values(uploadingSubfolders).some(v => v);

    if (!isUploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'A file is currently uploading. If you leave now, the upload will be cancelled.';
      return e.returnValue;
    };

    const handleAnchorClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const confirmLeave = window.confirm(
            "A file is currently uploading. If you leave now, the upload will be cancelled.\n\nDo you still want to leave?"
          );
          if (!confirmLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleAnchorClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, [isUploadingGeneral, uploadingFolders, uploadingSubfolders]);

  if (!client) return null;

  const allTasks = client.phases.flatMap(p => p.tasks || []);
  const doneTasks = allTasks.filter(t => t.completed).length;
  const totalTasks = allTasks.length;
  const donePhases = client.phases.filter(p => p.status === 'completed').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

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
    const phase = client.phases.find(p => p.id === phaseId);
    if (!phase) return;

    let finalTimeBound = phase.timeBound;
    if (!finalTimeBound) {
      const days = getStageDefaultWorkingDays(phase.name);
      if (days > 0) {
        finalTimeBound = calculateDefaultDeadline(days);
      }
    }

    const startedAt = new Date().toISOString();
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, status: 'in-progress' as const, startedAt, timeBound: finalTimeBound } : p
    );
    updateClient(client.id, { phases: updated });
    
    // Fire reminders & workspace message
    const updatedPhase = { ...phase, status: 'in-progress' as const, startedAt, timeBound: finalTimeBound };
    initStageReminders(client, updatedPhase);
    reload();
  };

  const markStageComplete = (phaseId: string) => {
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, status: 'completed' as const } : p
    );
    updateClient(client.id, { phases: updated });
    clearStageReminders(phaseId, client.id);
    reload();
  };

  const saveTimeBound = (phaseId: string) => {
    const updated = client.phases.map((p) =>
      p.id === phaseId ? { ...p, timeBound: timeBoundDraft } : p
    );
    
    // Update reminder schedule if stage is in-progress
    const phase = client.phases.find((p) => p.id === phaseId);
    if (phase && phase.status === 'in-progress') {
      const updatedPhase = { ...phase, timeBound: timeBoundDraft };
      updateStageReminderSchedule(client, updatedPhase);
    }
    
    updateClient(client.id, { phases: updated });
    setEditingTimeBound(null);
    reload();
    
    // Process reminders immediately
    processReminders(getClients());
  };

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return 'No deadline set';
    // Handle ISO date strings from date input (YYYY-MM-DD)
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return `Before ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
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
  const processFiles = async (files: File[], folderId?: string, subfolderId?: string) => {
    if (subfolderId) {
      setUploadingSubfolders(prev => ({ ...prev, [subfolderId]: true }));
    } else if (folderId) {
      setUploadingFolders(prev => ({ ...prev, [folderId]: true }));
    } else {
      setIsUploadingGeneral(true);
    }

    try {
      const uploadPromises = files.map(async (file) => {
        return new Promise<void>((resolve) => {
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
                canvas.toBlob(async (blob) => {
                  if (!blob) { resolve(); return; }
                  try {
                    const ext = 'jpg';
                    const path = `documents/${params.id}/${crypto.randomUUID()}.${ext}`;
                    const { error } = await supabase.storage.from('uka-storage').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
                    if (error) { alert('Upload failed: ' + error.message); resolve(); return; }
                    const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
                    saveDocument(file.name, publicUrl, 'image/jpeg', blob.size, folderId, subfolderId);
                    resolve();
                  } catch (err) {
                    console.error(err);
                    resolve();
                  }
                }, 'image/jpeg', 0.75);
              };
              img.onerror = () => resolve();
              img.src = event.target?.result as string;
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          } else {
            (async () => {
              try {
                const ext = file.name.split('.').pop() || 'bin';
                const path = `documents/${params.id}/${crypto.randomUUID()}.${ext}`;
                const { error } = await supabase.storage.from('uka-storage').upload(path, file, { contentType: file.type, upsert: true });
                if (error) { alert('Upload failed: ' + error.message); resolve(); return; }
                const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
                saveDocument(file.name, publicUrl, file.type, file.size, folderId, subfolderId);
                resolve();
              } catch (err) {
                console.error(err);
                resolve();
              }
            })();
          }
        });
      });
      await Promise.all(uploadPromises);
    } catch (err) {
      console.error(err);
    } finally {
      if (subfolderId) {
        setUploadingSubfolders(prev => ({ ...prev, [subfolderId]: false }));
      } else if (folderId) {
        setUploadingFolders(prev => ({ ...prev, [folderId]: false }));
      } else {
        setIsUploadingGeneral(false);
      }
    }
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
      uploadedBy: currentStaffId || undefined,
    };
    const c = getClientById(params.id);
    if (!c) return;
    updateClient(c.id, { documents: [...c.documents, doc] });
    reload();
  };

  const deleteDocument = async (docId: string) => {
    const doc = client.documents.find(d => d.id === docId);
    if (!doc) return;
    if (doc.uploadedBy !== currentStaffId) {
      alert("You can only delete documents that you have uploaded.");
      return;
    }
    if (confirm(`Are you sure you want to delete "${doc.name}"? This cannot be undone.`)) {
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
    if (doc.uploadedBy !== currentStaffId) {
      alert("You can only rename documents that you have uploaded.");
      return;
    }
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
      <Link href="/staff-dashboard/projects" className={styles.back}>← Back to Projects</Link>

      {/* Hero header */}
      <div className={`glass-panel ${styles.hero}`}>
        <div className={styles.heroLeft}>
          <div className={styles.heroAvatar}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.heroInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 className={styles.heroName}>{client.name}</h1>
              {client.clientId && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {client.clientId}
                </span>
              )}
            </div>
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
          <p className={styles.progressSub}>{doneTasks} of {totalTasks} tasks completed across {client.phases.length} stages ({donePhases} stage{donePhases !== 1 ? 's' : ''} fully done)</p>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['overview', 'phases', 'documents', 'progress', 'oc'] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && <User size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'phases' && <List size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'documents' && <FolderOpen size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'progress' && <ClipboardCheck size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'oc' && <ClipboardCheck size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'progress' ? 'Client Progress' : tab === 'oc' ? 'OC List' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'documents' && client.documents.length > 0 && (
              <span className={styles.tabCount}>{client.documents.length}</span>
            )}
            {tab === 'progress' && (client.progressChecklist || []).length > 0 && (
              <span className={styles.tabCount} style={{ background: '#25d366', color: '#fff', border: 'none' }}>
                {(client.progressChecklist || []).length}
              </span>
            )}
            {tab === 'oc' && (client.ocChecklist || []).length > 0 && (
              <span className={styles.tabCount} style={{ background: '#25d366', color: '#fff', border: 'none' }}>
                {(client.ocChecklist || []).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.infoGrid}>
            <InfoItem label="Full Name" value={client.name} />
            {client.clientId && <InfoItem label="Client ID" value={client.clientId} />}
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
          {client.kyc && (
            <div className={styles.notesBox} style={{ marginTop: '2rem' }}>
              <h3 className={styles.notesTitle}>KYC Details</h3>
              {client.kyc.proposedSub && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  marginTop: '0.75rem',
                  fontWeight: 600
                }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Subject Line (SUB)</span>
                  {client.kyc.proposedSub}
                </div>
              )}
              <div className={styles.infoGrid} style={{ marginTop: '1rem' }}>
                {client.clientPassword && <InfoItem label="Client Password" value={client.clientPassword} />}
                <InfoItem label="Proposed Development" value={client.kyc.proposedDevelopment} />
                <InfoItem label="Land S.No / Plot No" value={`${client.kyc.landBearingSno || '—'} / ${client.kyc.landBearingPlotNo || '—'}`} />
                <InfoItem label="Village / Taluka / Dist" value={`${client.kyc.landBearingVillage || '—'}, ${client.kyc.landBearingTal || '—'}, ${client.kyc.landBearingDist || '—'}`} />
                <InfoItem label="Scheme Type" value={client.kyc.scheme} />
                <InfoItem label="Permission Type" value={client.kyc.permissionType} />
                <InfoItem label="Owner Type" value={client.kyc.ownerType} />
                <InfoItem label="Applicant Name" value={client.kyc.applicantName} />
                <InfoItem label="Company Reg. Type" value={client.kyc.companyOwnerType} />
                <InfoItem label="Company PAN Card" value={client.kyc.companyPanCard} />
                <InfoItem label="GST Certificate" value={client.kyc.gstNoCertificate} />
                <InfoItem label="Member Aadhar Card" value={client.kyc.memberAadharCard} />
                <InfoItem label="Member PAN Card" value={client.kyc.memberPanCard} />
                <InfoItem label="Member Mobile No." value={client.kyc.memberMobileNo} />
                <InfoItem label="DSC Authorized Person" value={client.kyc.authorisedPersonEmail} />
                <InfoItem label="DSC Required (Pen Drive)" value={client.kyc.requiredDigitalSignature} />
                <InfoItem label="Office Address" value={client.kyc.officeAdd} />
                <InfoItem label="Site Address" value={client.kyc.siteAdd} />
                <InfoItem label="Site Secondary Address" value={client.kyc.siteAddSecondary} />
                <InfoItem label="Project RERA Name" value={client.kyc.projectNameSecondary} />
                <InfoItem label="Geo-Coordinates" value={client.kyc.geoCoordinates} />
                <InfoItem label="Project Email ID" value={client.kyc.emailIdSecondary} />
                <InfoItem label="Whether Open Plot" value={client.kyc.whetherOpenPlot} />
                <InfoItem label="Site Engineer" value={client.kyc.siteEng} />
                <InfoItem label="Site Supervisor" value={client.kyc.siteSupervisor} />
                <InfoItem label="Regulations" value={client.kyc.regulations} />
                <InfoItem label="S.No / H/PLOT.NO" value={`${client.kyc.sNo || '—'} / ${client.kyc.hNo || '—'}`} />
                <InfoItem label="Village / Taluka" value={`${client.kyc.village || '—'}, ${client.kyc.tal || '—'}`} />
                <InfoItem label="Use / Bldgs / Floor" value={`${client.kyc.use || '—'} / ${client.kyc.noOfBldgs || '—'} / ${client.kyc.floor || '—'}`} />
                <InfoItem label="Subject / P-Line" value={`${client.kyc.subSecondary || '—'} / ${client.kyc.pLine || '—'}`} />
                <InfoItem label="Architect" value={client.kyc.architect} />
                <InfoItem label="Structural Engineer" value={client.kyc.structuralEngName} />
                <InfoItem label="Digital Signature Available" value={client.kyc.isDigitalSignature} />
                <InfoItem label="Client Aadhaar No." value={client.kyc.clientAadharNo} />
                <InfoItem label="Client PAN No." value={client.kyc.clientPanNo} />
                <InfoItem label="Contact / Other" value={`${client.kyc.contactNo || '—'} / ${client.kyc.anyOther || '—'}`} />
              </div>

              {/* Site Photos Gallery */}
              {(client.kyc.northPhoto || client.kyc.northDetails || client.kyc.southPhoto || client.kyc.southDetails || client.kyc.eastPhoto || client.kyc.eastDetails || client.kyc.westPhoto || client.kyc.westDetails || client.kyc.road || client.kyc.roadDetails || client.kyc.side || client.kyc.sideDetails || client.kyc.digitalSignaturePhoto || client.kyc.clientAadharPhoto || client.kyc.clientPanPhoto) && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>Client Documents & Site Photos</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {client.kyc.clientAadharPhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Client Aadhaar Photo</span>
                        <img src={client.kyc.clientAadharPhoto} alt="Client Aadhaar" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.clientAadharPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.clientPanPhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Client PAN Photo</span>
                        <img src={client.kyc.clientPanPhoto} alt="Client PAN" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.clientPanPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.northPhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>North Side Photo</span>
                        <img src={client.kyc.northPhoto} alt="North Side" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.northPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.northDetails && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>North Direction Details</span>
                        <img src={client.kyc.northDetails} alt="North Details" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.northDetails || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.southPhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>South Side Photo</span>
                        <img src={client.kyc.southPhoto} alt="South Side" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.southPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.southDetails && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>South Direction Details</span>
                        <img src={client.kyc.southDetails} alt="South Details" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.southDetails || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.eastPhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>East Side Photo</span>
                        <img src={client.kyc.eastPhoto} alt="East Side" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.eastPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.eastDetails && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>East Direction Details</span>
                        <img src={client.kyc.eastDetails} alt="East Details" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.eastDetails || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.westPhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>West Side Photo</span>
                        <img src={client.kyc.westPhoto} alt="West Side" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.westPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.westDetails && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>West Direction Details</span>
                        <img src={client.kyc.westDetails} alt="West Details" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.westDetails || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.road && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Road Photo</span>
                        <img src={client.kyc.road} alt="Road Photo" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.road || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.roadDetails && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Road Details</span>
                        <img src={client.kyc.roadDetails} alt="Road Details" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.roadDetails || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.side && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Side Photo</span>
                        <img src={client.kyc.side} alt="Side Photo" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.side || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.sideDetails && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Side Details</span>
                        <img src={client.kyc.sideDetails} alt="Side Details" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.sideDetails || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                    {client.kyc.digitalSignaturePhoto && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Digital Signature Photo</span>
                        <img src={client.kyc.digitalSignaturePhoto} alt="Digital Signature" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${client.kyc?.digitalSignaturePhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '110px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Owners Details Section */}
              {client.kyc.otherOwners && client.kyc.otherOwners.length > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>Other Owners / Multiple Owners</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {client.kyc.otherOwners.map((owner: any, idx: number) => (
                      <div key={owner.id || idx} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                          Owner #{idx + 1}: {owner.name || '—'}
                        </div>
                        <div className={styles.infoGrid} style={{ marginBottom: '1rem' }}>
                          <InfoItem label="Phone Number" value={owner.phone} />
                          <InfoItem label="Address" value={owner.address} />
                          <InfoItem label="Aadhaar Card No" value={owner.aadharNo} />
                          <InfoItem label="PAN Card No" value={owner.panNo} />
                        </div>
                        {(owner.aadharPhoto || owner.panPhoto) && (
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                            {owner.aadharPhoto && (
                              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', background: 'rgba(255, 255, 255, 0.02)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '130px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Aadhaar Photo</span>
                                <img src={owner.aadharPhoto} alt="Aadhaar Photo" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${owner.aadharPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '70px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                              </div>
                            )}
                            {owner.panPhoto && (
                              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', background: 'rgba(255, 255, 255, 0.02)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '130px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>PAN Photo</span>
                                <img src={owner.panPhoto} alt="PAN Photo" onClick={() => { try { const w = window.open(); w?.document.write(`<img src="${owner.panPhoto || ''}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`); } catch {} }} style={{ width: '100%', height: '70px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* ── Client Progress Tab ────────────────────────────────────────────────── */}
      {activeTab === 'progress' && (
        <div className={`animate-fade-in ${styles.progressContainer}`}>
          
          {/* Summary Card */}
          <div className={`glass-panel ${styles.progressCard}`}>
            <div className={styles.progressFlex}>
              <div>
                <h2 className={styles.progressTitle}>Client Progress Checklist</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Track receipt and filing of core property mutations, NOCs, and structural approvals.
                </p>
              </div>
              <button className={styles.sendBtn} onClick={handleSendProgress}>
                <MessageSquare size={16} /> Send Progress (WhatsApp)
              </button>
            </div>

            {showSendSuccess && (
              <div style={{
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                color: '#25d366',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <span>✅</span>
                <span>Progress update message generated! WhatsApp Interakt API transmission triggered for <strong>{client.name}</strong> ({client.phone || 'No phone set'}).</span>
              </div>
            )}

            {/* Checklist Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span>Document Gathering & Verification Progress</span>
                <span>
                  {Math.round(((client.progressChecklist || []).length / PROGRESS_CHECKLIST_ITEMS.length) * 100)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #25d366, #128c7e)',
                  width: `${Math.round(((client.progressChecklist || []).length / PROGRESS_CHECKLIST_ITEMS.length) * 100)}%`,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {(client.progressChecklist || []).length} of {PROGRESS_CHECKLIST_ITEMS.length} documents collected and verified.
              </p>
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className={styles.progressFilterRow}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search documents..."
                value={progressSearch}
                onChange={e => setProgressSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterBtns}>
              {(['all', 'completed', 'pending'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setProgressFilter(f)}
                  className={`${styles.filterBtn} ${progressFilter === f ? styles.filterBtnActive : ''}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Items Grouped */}
          {(() => {
            // Group items based on 64 items exactly
            const groups = [
              {
                title: "General Land & Personal Documents (1-31)",
                items: PROGRESS_CHECKLIST_ITEMS.filter(item => {
                  const num = parseInt(item.id, 10);
                  return num <= 31;
                })
              },
              {
                title: "₹500 Stamp Paper Affidavits (32)",
                items: PROGRESS_CHECKLIST_ITEMS.filter(item => {
                  const num = parseInt(item.id, 10);
                  return num === 32;
                })
              },
              {
                title: "CC/RDP Approvals & NOCs (33-64)",
                items: PROGRESS_CHECKLIST_ITEMS.filter(item => {
                  const num = parseInt(item.id, 10);
                  return num >= 33;
                })
              }
            ];

            return groups.map((grp, grpIdx) => {
              // Apply search & filter
              const filteredItems = grp.items.filter(item => {
                const matchesSearch = item.label.toLowerCase().includes(progressSearch.toLowerCase()) || item.id === progressSearch;
                const isChecked = (client.progressChecklist || []).includes(item.id);
                if (progressFilter === 'completed') return matchesSearch && isChecked;
                if (progressFilter === 'pending') return matchesSearch && !isChecked;
                return matchesSearch;
              });

              if (filteredItems.length === 0) return null;

              const completedInGroup = filteredItems.filter(item => (client.progressChecklist || []).includes(item.id)).length;

              return (
                <div key={grpIdx} className={styles.checklistGroup}>
                  <div className={styles.groupHeader}>
                    <span>{grp.title}</span>
                    <span className={styles.groupCountBadge}>
                      {completedInGroup} / {filteredItems.length} Done
                    </span>
                  </div>

                  <div className={styles.checklistGrid}>
                    {filteredItems.map(item => {
                      const isChecked = (client.progressChecklist || []).includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklist(item.id)}
                          className={`${styles.checkItem} ${isChecked ? styles.checkItemActive : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.85rem 1.25rem',
                            background: isChecked ? 'rgba(37, 211, 102, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border)',
                            borderColor: isChecked ? 'rgba(37, 211, 102, 0.2)' : 'var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '2px solid',
                            borderColor: isChecked ? '#25d366' : 'var(--text-tertiary)',
                            background: isChecked ? '#25d366' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </div>

                          <div style={{
                            fontSize: '0.9rem',
                            color: isChecked ? 'var(--text-main)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            lineHeight: 1.4
                          }}>
                            <span style={{ fontWeight: 700, marginRight: '0.75rem', color: isChecked ? '#25d366' : 'var(--text-muted)' }}>
                              {item.id}.
                            </span>
                            {item.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── OC List Tab ────────────────────────────────────────────────── */}
      {activeTab === 'oc' && (
        <div className={`animate-fade-in ${styles.progressContainer}`}>
          
          {/* Summary Card */}
          <div className={`glass-panel ${styles.progressCard}`}>
            <div className={styles.progressFlex}>
              <div>
                <h2 className={styles.progressTitle}>Occupancy Certificate (OC) Checklist</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Track receipt and filing of mandatory and optional documents required for Occupancy Certificate.
                </p>
              </div>
              <button className={styles.sendBtn} onClick={handleSendOc}>
                <MessageSquare size={16} /> Send OC Progress (WhatsApp)
              </button>
            </div>

            {showOcSendSuccess && (
              <div style={{
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                color: '#25d366',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <span>✅</span>
                <span>OC Progress update message generated! WhatsApp Interakt API transmission triggered for <strong>{client.name}</strong> ({client.phone || 'No phone set'}).</span>
              </div>
            )}

            {/* Checklist Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span>OC Document Gathering & Verification Progress</span>
                <span>
                  {Math.round(((client.ocChecklist || []).length / OC_CHECKLIST_ITEMS.length) * 100)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #25d366, #128c7e)',
                  width: `${Math.round(((client.ocChecklist || []).length / OC_CHECKLIST_ITEMS.length) * 100)}%`,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {(client.ocChecklist || []).length} of {OC_CHECKLIST_ITEMS.length} documents collected and verified.
              </p>
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className={styles.progressFilterRow}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search OC documents..."
                value={ocSearch}
                onChange={e => setOcSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterBtns}>
              {(['all', 'completed', 'pending'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOcFilter(f)}
                  className={`${styles.filterBtn} ${ocFilter === f ? styles.filterBtnActive : ''}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Items Grouped */}
          {(() => {
            const groups = [
              {
                title: "MANDATORY DOCUMENTS",
                items: OC_CHECKLIST_ITEMS.filter(item => item.type === 'mandatory')
              },
              {
                title: "OPTIONAL DOCUMENTS",
                items: OC_CHECKLIST_ITEMS.filter(item => item.type === 'optional')
              }
            ];

            return groups.map((grp, grpIdx) => {
              // Apply search & filter
              const filteredItems = grp.items.filter(item => {
                const matchesSearch = item.label.toLowerCase().includes(ocSearch.toLowerCase()) || item.id === ocSearch;
                const isChecked = (client.ocChecklist || []).includes(item.id);
                if (ocFilter === 'completed') return matchesSearch && isChecked;
                if (ocFilter === 'pending') return matchesSearch && !isChecked;
                return matchesSearch;
              });

              if (filteredItems.length === 0) return null;

              const completedInGroup = filteredItems.filter(item => (client.ocChecklist || []).includes(item.id)).length;

              return (
                <div key={grpIdx} className={styles.checklistGroup}>
                  <div className={styles.groupHeader}>
                    <span>{grp.title}</span>
                    <span className={styles.groupCountBadge}>
                      {completedInGroup} / {filteredItems.length} Done
                    </span>
                  </div>

                  <div className={styles.checklistGrid}>
                    {filteredItems.map(item => {
                      const isChecked = (client.ocChecklist || []).includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleOcChecklist(item.id)}
                          className={`${styles.checkItem} ${isChecked ? styles.checkItemActive : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.85rem 1.25rem',
                            background: isChecked ? 'rgba(37, 211, 102, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border)',
                            borderColor: isChecked ? 'rgba(37, 211, 102, 0.2)' : 'var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '2px solid',
                            borderColor: isChecked ? '#25d366' : 'var(--text-tertiary)',
                            background: isChecked ? '#25d366' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </div>

                          <div style={{
                            fontSize: '0.9rem',
                            color: isChecked ? 'var(--text-main)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            lineHeight: 1.4
                          }}>
                            <span style={{ fontWeight: 700, marginRight: '0.75rem', color: isChecked ? '#25d366' : 'var(--text-muted)' }}>
                              {item.id}.
                            </span>
                            {item.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── Phases Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'phases' && (
        <div className={styles.tabContent}>

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
                            <div className={styles.timeBoundDisplay}>
                              <Clock size={12} /> 
                              <span>{formatDeadline(phase.timeBound)}</span>
                            </div>
                          </span>
                        </div>
                      </div>
                      <div className={styles.stageHeaderRight}>
                        <ChevronDown size={18} className={styles.stageChevron} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className={styles.stageBody}>
                        <div className={styles.stageControls}>
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
                                {task.assignedTo ? (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '12px' }}>
                                    {task.assignedTo}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unassigned</span>
                                )}
                              </div>
                            </div>
                          ))}
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
                {isUploadingGeneral ? (
                  <Loader2 className={`${styles.dropZoneIcon} animate-spin`} size={28} strokeWidth={1.5} />
                ) : (
                  <CloudUpload className={styles.dropZoneIcon} size={28} strokeWidth={1.5} />
                )}
              </div>
              <div className={styles.dropZoneTitle}>
                {isUploadingGeneral ? (
                  <span>Compressing &amp; uploading staged files...</span>
                ) : (
                  <>Drag &amp; drop files here, or <span className={styles.highlight}>click to select</span></>
                )}
              </div>
              <div className={styles.dropZoneSub}>
                {isUploadingGeneral ? "Please wait, syncing with Supabase" : "Assign documents to their corresponding folders below"}
              </div>
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
                      <div className={styles.folderMeta}>
                        {folder.code} &nbsp;&middot;&nbsp; <span>{totalDocs}</span> files
                        {uploadingFolders[folder.id] && (
                          <span style={{ marginLeft: '10px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <Loader2 size={12} className="animate-spin" /> Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.folderHeaderActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.folderActionBtn}
                        onClick={(e) => triggerFolderUpload(e, folder.id)}
                        title={`Upload file directly to ${folder.name}`}
                        disabled={uploadingFolders[folder.id]}
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
                              {uploadingSubfolders[sub.id] ? (
                                <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600, marginRight: '8px' }}>
                                  <Loader2 size={11} className="animate-spin" /> Uploading...
                                </span>
                              ) : (
                                <span className={styles.subfolderCode}>{sub.code}</span>
                              )}
                              <button
                                className={styles.subfolderActionBtn}
                                onClick={(e) => triggerSubfolderUpload(e, folder.id, sub.id)}
                                title={`Upload file directly to ${sub.name}`}
                                disabled={uploadingSubfolders[sub.id]}
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
