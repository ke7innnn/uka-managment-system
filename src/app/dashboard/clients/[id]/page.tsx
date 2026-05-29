'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientById, updateClient, Client, Phase, Document as Doc, viewDocumentSafe, downloadDocumentSafe, getStaff, StaffMember, getClients, PROGRESS_CHECKLIST_ITEMS, OC_CHECKLIST_ITEMS, DOCUMENT_FOLDERS as FOLDERS, CC_RDP_FOLDERS, OC_DOCUMENT_FOLDERS, getStageDefaultWorkingDays, calculateDefaultDeadline } from '@/lib/store';
import { initStageReminders, clearStageReminders, processReminders, updateStageReminderSchedule } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { Image, FileText, FileSpreadsheet, Video, Paperclip, Mail, User, List, FolderOpen, Eye, Download, Trash2, Pencil, Check, X, Upload, CheckCircle2, Clock, ChevronDown, Folder, Plus, CloudUpload, Loader2, ClipboardCheck, Search, MessageSquare, AlertCircle } from 'lucide-react';
import styles from './page.module.css';

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
  const ccrdpFileInputRef = useRef<HTMLInputElement>(null);
  const ocDocFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'documents' | 'progress' | 'oc' | 'oc_docs' | 'ccrdp'>('overview');
  
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
    let updated = [...current];
    
    if (updated.includes(`${itemId}-NA`)) {
      // If it was NA, remove NA
      updated = updated.filter(id => id !== `${itemId}-NA`);
    }

    if (updated.includes(itemId)) {
      updated = updated.filter(id => id !== itemId);
    } else {
      updated.push(itemId);
    }
    
    updateClient(client.id, { progressChecklist: updated });
    reload();
  };

  const handleToggleNA = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!client) return;
    const current = client.progressChecklist || [];
    let updated = [...current];
    
    if (updated.includes(`${itemId}-NA`)) {
      // Remove NA
      updated = updated.filter(id => id !== `${itemId}-NA`);
    } else {
      // Set to NA (remove completed if it was)
      updated = updated.filter(id => id !== itemId);
      updated.push(`${itemId}-NA`);
    }
    
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

  // CC/RDP/OC/PCC WhatsApp send state
  const [showCcrdpSendSuccess, setShowCcrdpSendSuccess] = useState(false);
  const handleSendCcrdp = () => {
    setShowCcrdpSendSuccess(true);
    setTimeout(() => setShowCcrdpSendSuccess(false), 4000);
  };

  const handleToggleOcChecklist = (itemId: string) => {
    if (!client) return;
    const current = client.ocChecklist || [];
    let updated = [...current];

    if (updated.includes(`${itemId}-NA`)) {
      updated = updated.filter(id => id !== `${itemId}-NA`);
    }

    if (updated.includes(itemId)) {
      updated = updated.filter(id => id !== itemId);
    } else {
      updated.push(itemId);
    }
    
    updateClient(client.id, { ocChecklist: updated });
    reload();
  };

  const handleToggleOcNA = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!client) return;
    const current = client.ocChecklist || [];
    let updated = [...current];

    if (updated.includes(`${itemId}-NA`)) {
      updated = updated.filter(id => id !== `${itemId}-NA`);
    } else {
      updated = updated.filter(id => id !== itemId);
      updated.push(`${itemId}-NA`);
    }
    
    updateClient(client.id, { ocChecklist: updated });
    reload();
  };

  // ── Document Folder NA toggle ─────────────────────────────────────────────
  const handleToggleFolderNA = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (!client) return;
    const current = client.naFolders || [];
    let updated = [...current];

    if (updated.includes(folderId)) {
      // Remove NA
      updated = updated.filter(id => id !== folderId);
    } else {
      updated.push(folderId);
    }

    updateClient(client.id, { naFolders: updated });
    reload();
  };

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
  // CC/RDP/OC/PCC separate upload state
  const [ccrdpUploadFolderId, setCcrdpUploadFolderId] = useState<string | null>(null);
  const [uploadingCcrdpFolders, setUploadingCcrdpFolders] = useState<Record<string, boolean>>({});

  // OC Documents upload state
  const [ocDocUploadFolderId, setOcDocUploadFolderId] = useState<string | null>(null);
  const [uploadingOcDocFolders, setUploadingOcDocFolders] = useState<Record<string, boolean>>({});
  const [showOcDocsSendSuccess, setShowOcDocsSendSuccess] = useState(false);

  const handleSendOcDocs = () => {
    setShowOcDocsSendSuccess(true);
    setTimeout(() => setShowOcDocsSendSuccess(false), 4000);
  };

  const checkedDocsRef = useRef<Set<string>>(new Set());
  const [documentHealth, setDocumentHealth] = useState<Record<string, 'loading' | 'healthy' | 'broken'>>({});

  useEffect(() => {
    if (!client) return;
    const timeout = setTimeout(() => {
      client.documents.forEach(doc => {
        if (!doc.url || checkedDocsRef.current.has(doc.id)) return;
        checkedDocsRef.current.add(doc.id);
        setDocumentHealth(prev => ({ ...prev, [doc.id]: 'loading' }));
        fetch(doc.url, { method: 'HEAD' })
          .then(res => {
            setDocumentHealth(prev => ({ ...prev, [doc.id]: res.ok ? 'healthy' : 'broken' }));
          })
          .catch(() => {
            setDocumentHealth(prev => ({ ...prev, [doc.id]: 'broken' }));
          });
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [client?.documents]);

  const renderHealthStatus = (docId: string) => {
    const status = documentHealth[docId];
    if (status === 'loading') return <span title="Checking file status..."><Loader2 size={12} className="animate-spin text-muted" style={{ marginRight: 6, opacity: 0.5, display: 'inline-block', verticalAlign: 'middle' }} /></span>;
    if (status === 'healthy') return <span title="File is properly uploaded and available"><CheckCircle2 size={12} style={{ color: '#10b981', marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} /></span>;
    if (status === 'broken') return <span title="File is missing from server! You may need to re-upload."><AlertCircle size={12} style={{ color: '#ef4444', marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} /></span>;
    return null;
  };

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

    // Fetch full un-stripped details (with raw Base64 images) dynamically from Supabase in the background
    supabase
      .from('clients')
      .select('*, phases(*), documents(*)')
      .eq('id', params.id)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (!error && data) {
            // Always prefer local checklist state — Supabase data may be stale
            // if the user just toggled a checkbox (async push hasn't completed yet)
            const localClient = getClientById(params.id);
            const fullClient: Client = {
              id: data.id,
              clientId: data.client_id || '',
              clientUin: data.kyc?.clientUin || '',
              name: data.name,
              company: data.company || '',
              email: data.email || '',
              phone: data.phone || '',
              place: data.place || '',
              address: data.address || '',
              notes: data.notes || '',
              projectName: data.project_name || '',
              projectStatus: data.project_status || 'pending',
              createdAt: data.created_at,
              tags: data.tags || [],
              // Use local state for checklists AND phases to avoid overwriting fresh toggles
              // (the async push to Supabase may not have completed yet)
              progressChecklist: (localClient?.syncStatus === 'pending' && localClient?.progressChecklist) ? localClient.progressChecklist : (data.progress_checklist || []),
              ocChecklist: (localClient?.syncStatus === 'pending' && localClient?.ocChecklist) ? localClient.ocChecklist : (data.oc_checklist || []),
              clientPassword: data.client_password || '',
              kyc: data.kyc || {},
              syncStatus: 'synced',
              phases: (localClient?.syncStatus === 'pending' && localClient?.phases) ? localClient.phases : (data.phases || []).map((p: any) => ({
                id: p.id, name: p.name, completed: p.completed, order: p.order,
                status: p.status || (p.completed ? 'completed' : 'not-started'),
                timeBound: p.time_bound || undefined,
                startedAt: p.started_at || undefined,
                tasks: typeof p.tasks === 'string' ? JSON.parse(p.tasks) : (p.tasks || [])
              })).sort((a: any, b: any) => a.order - b.order),
              documents: (localClient?.syncStatus === 'pending' && localClient?.documents) ? localClient.documents : (data.documents || []).map((d: any) => ({
                id: d.id, name: d.name, url: d.url, uploadedAt: d.uploaded_at,
                type: d.type || 'unknown', size: d.size || 0, uploadedBy: d.uploaded_by || '',
                folder: d.folder || undefined, subfolder: d.subfolder || undefined
              }))
            };
            setClient(fullClient);
          }
        },
        (err) => console.error('Error fetching un-stripped client details:', err)
      );

    // Supabase fetch above handles data refresh
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
        const newTasks = p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
        const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed);
        let newStatus = p.status;
        if (!allCompleted && p.status === 'completed') {
          newStatus = 'in-progress';
        }
        return {
          ...p,
          status: newStatus,
          tasks: newTasks
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

  // ── CC/RDP/OC/PCC document actions ─────────────────────────────────────────
  const triggerCcrdpFolderUpload = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setCcrdpUploadFolderId(folderId);
    ccrdpFileInputRef.current?.click();
  };

  const handleCcrdpFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const folderId = ccrdpUploadFolderId;
    setCcrdpUploadFolderId(null);
    e.target.value = '';
    if (!files.length || !folderId) return;
    setUploadingCcrdpFolders(prev => ({ ...prev, [folderId]: true }));
    try {
      await Promise.all(files.map(file => new Promise<void>(resolve => {
        const upload = async (blob: Blob, ext: string, mime: string) => {
          const path = `documents/${params.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from('uka-storage').upload(path, blob, { contentType: mime, upsert: true });
          if (error) { alert('Upload failed: ' + error.message); resolve(); return; }
          const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
          const doc: Doc = { id: crypto.randomUUID(), name: file.name, url: publicUrl, uploadedAt: new Date().toISOString(), type: mime, size: blob.size, folder: folderId };
          const c = getClientById(params.id);
          if (c) { updateClient(c.id, { documents: [...c.documents, doc] }); reload(); }
          resolve();
        };
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = ev => {
            const img = new globalThis.Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const max = 800; let w = img.width, h = img.height;
              if (w > h) { if (w > max) { h *= max / w; w = max; } } else { if (h > max) { w *= max / h; h = max; } }
              canvas.width = w; canvas.height = h;
              ctx?.drawImage(img, 0, 0, w, h);
              canvas.toBlob(blob => { if (blob) upload(blob, 'jpg', 'image/jpeg'); else resolve(); }, 'image/jpeg', 0.75);
            };
            img.onerror = () => resolve();
            img.src = ev.target?.result as string;
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        } else {
          upload(file, file.name.split('.').pop() || 'bin', file.type).catch(() => resolve());
        }
      })));
    } finally {
      setUploadingCcrdpFolders(prev => ({ ...prev, [folderId]: false }));
    }
  };

  const deleteCcrdpDocument = async (docId: string) => {
    const doc = client.documents.find(d => d.id === docId);
    if (confirm(`Delete "${doc?.name || 'this document'}"? This cannot be undone.`)) {
      updateClient(client.id, { documents: client.documents.filter(d => d.id !== docId) });
      reload();
      if (doc?.url?.includes('uka-storage/')) {
        try {
          const path = doc.url.split('uka-storage/')[1];
          if (path) await supabase.storage.from('uka-storage').remove([path]);
        } catch {}
      }
    }
  };

  // ── OC Documents actions ─────────────────────────────────────────────────
  const triggerOcDocFolderUpload = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setOcDocUploadFolderId(folderId);
    ocDocFileInputRef.current?.click();
  };

  const handleOcDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const folderId = ocDocUploadFolderId;
    setOcDocUploadFolderId(null);
    e.target.value = '';
    if (!files.length || !folderId) return;
    setUploadingOcDocFolders(prev => ({ ...prev, [folderId]: true }));
    try {
      await Promise.all(files.map(file => new Promise<void>(resolve => {
        const upload = async (blob: Blob, ext: string, mime: string) => {
          const path = `documents/${params.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from('uka-storage').upload(path, blob, { contentType: mime, upsert: true });
          if (error) { alert('Upload failed: ' + error.message); resolve(); return; }
          const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
          const doc: Doc = { id: crypto.randomUUID(), name: file.name, url: publicUrl, uploadedAt: new Date().toISOString(), type: mime, size: blob.size, folder: folderId };
          const c = getClientById(params.id);
          if (c) { updateClient(c.id, { documents: [...c.documents, doc] }); reload(); }
          resolve();
        };
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = ev => {
            const img = new globalThis.Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const max = 800; let w = img.width, h = img.height;
              if (w > h) { if (w > max) { h *= max / w; w = max; } } else { if (h > max) { w *= max / h; h = max; } }
              canvas.width = w; canvas.height = h;
              ctx?.drawImage(img, 0, 0, w, h);
              canvas.toBlob(blob => { if (blob) upload(blob, 'jpg', 'image/jpeg'); else resolve(); }, 'image/jpeg', 0.75);
            };
            img.onerror = () => resolve();
            img.src = ev.target?.result as string;
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        } else {
          upload(file, file.name.split('.').pop() || 'bin', file.type).catch(() => resolve());
        }
      })));
    } finally {
      setUploadingOcDocFolders(prev => ({ ...prev, [folderId]: false }));
    }
  };

  const deleteOcDocDocument = async (docId: string) => {
    const doc = client.documents.find(d => d.id === docId);
    if (confirm(`Delete "${doc?.name || 'this document'}"? This cannot be undone.`)) {
      updateClient(client.id, { documents: client.documents.filter(d => d.id !== docId) });
      reload();
      if (doc?.url?.includes('uka-storage/')) {
        try {
          const path = doc.url.split('uka-storage/')[1];
          if (path) await supabase.storage.from('uka-storage').remove([path]);
        } catch {}
      }
    }
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
                  ID: {client.clientId}
                </span>
              )}
              {client.clientUin && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(200, 169, 110, 0.1)',
                    border: '1px solid rgba(200, 169, 110, 0.2)',
                    color: 'var(--accent)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  UIN: {client.clientUin}
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
        <div className={styles.heroRight} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          <span
            className={styles.statusBadge}
            style={{
              background: client.priority === 'high' ? 'rgba(192, 96, 96, 0.1)' : client.priority === 'low' ? 'rgba(106, 170, 132, 0.1)' : 'rgba(200, 169, 110, 0.1)',
              color: client.priority === 'high' ? '#c06060' : client.priority === 'low' ? '#6aaa84' : '#c8a96e',
              border: client.priority === 'high' ? '1px solid rgba(192, 96, 96, 0.25)' : client.priority === 'low' ? '1px solid rgba(106, 170, 132, 0.25)' : '1px solid rgba(200, 169, 110, 0.25)',
            }}
          >
            {(client.priority || 'medium').charAt(0).toUpperCase() + (client.priority || 'medium').slice(1)} Priority
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
          <p className={styles.progressSub}>{doneTasks} of {totalTasks} tasks completed across {client.phases.length} stages ({donePhases} stage{donePhases !== 1 ? 's' : ''} fully done)</p>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['overview', 'phases', 'documents', 'progress', 'oc', 'oc_docs', 'ccrdp'] as const).map((tab) => (
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
            {tab === 'oc_docs' && <FolderOpen size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'ccrdp' && <FolderOpen size={14} strokeWidth={1.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
            {tab === 'progress' ? 'Client Progress' : tab === 'oc' ? 'OC List' : tab === 'oc_docs' ? 'OC Documents' : tab === 'ccrdp' ? 'CC/RDP/OC/PCC' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'documents' && client.documents.filter(d => !d.folder?.startsWith('ccrdp-') && !d.folder?.startsWith('oc_doc-')).length > 0 && (
              <span className={styles.tabCount}>{client.documents.filter(d => !d.folder?.startsWith('ccrdp-') && !d.folder?.startsWith('oc_doc-')).length}</span>
            )}
            {tab === 'oc_docs' && client.documents.filter(d => d.folder?.startsWith('oc_doc-')).length > 0 && (
              <span className={styles.tabCount}>{client.documents.filter(d => d.folder?.startsWith('oc_doc-')).length}</span>
            )}
            {tab === 'ccrdp' && client.documents.filter(d => d.folder?.startsWith('ccrdp-')).length > 0 && (
              <span className={styles.tabCount}>{client.documents.filter(d => d.folder?.startsWith('ccrdp-')).length}</span>
            )}
            {tab === 'progress' && (client.progressChecklist || []).filter(id => !id.endsWith('-NA')).length > 0 && (
              <span className={styles.tabCount} style={{ background: '#25d366', color: '#fff', border: 'none' }}>
                {(client.progressChecklist || []).filter(id => !id.endsWith('-NA')).length}
              </span>
            )}
            {tab === 'oc' && (client.ocChecklist || []).filter(id => !id.endsWith('-NA')).length > 0 && (
              <span className={styles.tabCount} style={{ background: '#25d366', color: '#fff', border: 'none' }}>
                {(client.ocChecklist || []).filter(id => !id.endsWith('-NA')).length}
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
            {client.clientUin && <InfoItem label="Client UIN" value={client.clientUin} />}
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
                <InfoItem label="P-Line" value={client.kyc.pLine} />
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
                      <FilePreviewCard src={client.kyc.clientAadharPhoto} label="Client Aadhaar Photo" />
                    )}
                    {client.kyc.clientPanPhoto && (
                      <FilePreviewCard src={client.kyc.clientPanPhoto} label="Client PAN Photo" />
                    )}
                    {client.kyc.northPhoto && (
                      <FilePreviewCard src={client.kyc.northPhoto} label="North Side Photo" />
                    )}
                    {client.kyc.northDetails && (
                      <FilePreviewCard src={client.kyc.northDetails} label="North Direction Details" />
                    )}
                    {client.kyc.southPhoto && (
                      <FilePreviewCard src={client.kyc.southPhoto} label="South Side Photo" />
                    )}
                    {client.kyc.southDetails && (
                      <FilePreviewCard src={client.kyc.southDetails} label="South Direction Details" />
                    )}
                    {client.kyc.eastPhoto && (
                      <FilePreviewCard src={client.kyc.eastPhoto} label="East Side Photo" />
                    )}
                    {client.kyc.eastDetails && (
                      <FilePreviewCard src={client.kyc.eastDetails} label="East Direction Details" />
                    )}
                    {client.kyc.westPhoto && (
                      <FilePreviewCard src={client.kyc.westPhoto} label="West Side Photo" />
                    )}
                    {client.kyc.westDetails && (
                      <FilePreviewCard src={client.kyc.westDetails} label="West Direction Details" />
                    )}
                    {client.kyc.road && (
                      <FilePreviewCard src={client.kyc.road} label="Road Photo" />
                    )}
                    {client.kyc.roadDetails && (
                      <FilePreviewCard src={client.kyc.roadDetails} label="Road Details" />
                    )}
                    {client.kyc.side && (
                      <FilePreviewCard src={client.kyc.side} label="Side Photo" />
                    )}
                    {client.kyc.sideDetails && (
                      <FilePreviewCard src={client.kyc.sideDetails} label="Side Details" />
                    )}
                    {client.kyc.digitalSignaturePhoto && (
                      <FilePreviewCard src={client.kyc.digitalSignaturePhoto} label="Digital Signature Photo" />
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
                              <FilePreviewCard src={owner.aadharPhoto} label="Aadhaar Photo" height={70} />
                            )}
                            {owner.panPhoto && (
                              <FilePreviewCard src={owner.panPhoto} label="PAN Photo" height={70} />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Client References Section */}
              {client.kyc.references && client.kyc.references.length > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>Client References</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {client.kyc.references.map((ref: any, idx: number) => (
                      <div key={ref.id || idx} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                          Reference #{idx + 1}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ref.name || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ref.phone || '—'}</span>
                          </div>
                        </div>
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
            {(() => {
              const progressItems = client.progressChecklist || [];
              const naCount = progressItems.filter(id => id.endsWith('-NA')).length;
              const completedCount = progressItems.filter(id => !id.endsWith('-NA') && id !== 'MIGRATED_V2').length;
              const totalApplicable = PROGRESS_CHECKLIST_ITEMS.length - naCount;
              const progressPct = totalApplicable > 0 ? Math.round((completedCount / totalApplicable) * 100) : 0;
              
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <span>Document Gathering & Verification Progress</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #25d366, #128c7e)',
                      width: `${progressPct}%`,
                      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {completedCount} of {totalApplicable} applicable documents collected and verified ({naCount} NA).
                  </p>
                </div>
              );
            })()}
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
            // Group items based on 71 items
            const groups = [
              {
                title: "General Land & Personal Documents (1-41)",
                items: PROGRESS_CHECKLIST_ITEMS.filter(item => {
                  const num = parseInt(item.id, 10);
                  return num <= 41;
                })
              },
              {
                title: "₹500 Stamp Paper Affidavits (42)",
                items: PROGRESS_CHECKLIST_ITEMS.filter(item => {
                  const num = parseInt(item.id, 10);
                  return num === 42;
                })
              },
              {
                title: "CC/RDP Approvals & NOCs (43-74)",
                items: PROGRESS_CHECKLIST_ITEMS.filter(item => {
                  const num = parseInt(item.id, 10);
                  return num >= 43;
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
              const applicableInGroup = filteredItems.filter(item => !(client.progressChecklist || []).includes(`${item.id}-NA`)).length;

              return (
                <div key={grpIdx} className={styles.checklistGroup}>
                  <div className={styles.groupHeader}>
                    <span>{grp.title}</span>
                    <span className={styles.groupCountBadge}>
                      {completedInGroup} / {applicableInGroup} Done
                    </span>
                  </div>

                  <div className={styles.checklistGrid}>
                    {filteredItems.map(item => {
                      const isChecked = (client.progressChecklist || []).includes(item.id);
                      const isNA = (client.progressChecklist || []).includes(`${item.id}-NA`);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklist(item.id)}
                          className={`${styles.checkItem} ${isChecked ? styles.checkItemActive : ''} ${isNA ? styles.checkItemNA : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.85rem 1.25rem',
                            background: isChecked ? 'rgba(37, 211, 102, 0.04)' : isNA ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border)',
                            borderColor: isChecked ? 'rgba(37, 211, 102, 0.2)' : isNA ? 'transparent' : 'var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            opacity: isNA ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: '2px solid',
                              borderColor: isChecked ? '#25d366' : isNA ? 'var(--text-muted)' : 'var(--text-tertiary)',
                              background: isChecked ? '#25d366' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              flexShrink: 0
                            }}>
                              {isChecked && <Check size={14} strokeWidth={3} />}
                              {isNA && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>-</span>}
                            </div>

                            <div style={{
                              fontSize: '0.9rem',
                              color: isChecked ? 'var(--text-main)' : isNA ? 'var(--text-muted)' : 'var(--text-secondary)',
                              fontWeight: 500,
                              lineHeight: 1.4,
                              textDecoration: isNA ? 'line-through' : 'none'
                            }}>
                              <span style={{ fontWeight: 700, marginRight: '0.75rem', color: isChecked ? '#25d366' : 'var(--text-muted)' }}>
                                {item.id}.
                              </span>
                              {item.label}
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleToggleNA(e, item.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              background: isNA ? 'var(--text-main)' : 'rgba(255, 255, 255, 0.05)',
                              color: isNA ? 'var(--bg-main)' : 'var(--text-muted)',
                              border: '1px solid',
                              borderColor: isNA ? 'var(--text-main)' : 'var(--border)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            NA
                          </button>
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
            {(() => {
              const ocItems = client.ocChecklist || [];
              const naCount = ocItems.filter(id => id.endsWith('-NA')).length;
              const completedCount = ocItems.filter(id => !id.endsWith('-NA')).length;
              const totalApplicable = OC_CHECKLIST_ITEMS.length - naCount;
              const progressPct = totalApplicable > 0 ? Math.round((completedCount / totalApplicable) * 100) : 0;
              
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <span>OC Document Gathering & Verification Progress</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #25d366, #128c7e)',
                      width: `${progressPct}%`,
                      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {completedCount} of {totalApplicable} applicable documents collected and verified ({naCount} NA).
                  </p>
                </div>
              );
            })()}
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

          {/* Checklist Items */}
          {(() => {
            // Apply search & filter
            const filteredItems = OC_CHECKLIST_ITEMS.filter(item => {
              const matchesSearch = item.label.toLowerCase().includes(ocSearch.toLowerCase()) || item.id === ocSearch;
              const isChecked = (client.ocChecklist || []).includes(item.id);
              if (ocFilter === 'completed') return matchesSearch && isChecked;
              if (ocFilter === 'pending') return matchesSearch && !isChecked;
              return matchesSearch;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div className={styles.checklistGrid}>
                {filteredItems.map(item => {
                  const isChecked = (client.ocChecklist || []).includes(item.id);
                  const isNA = (client.ocChecklist || []).includes(`${item.id}-NA`);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleOcChecklist(item.id)}
                      className={`${styles.checkItem} ${isChecked ? styles.checkItemActive : ''} ${isNA ? styles.checkItemNA : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.25rem',
                        background: isChecked ? 'rgba(37, 211, 102, 0.04)' : isNA ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border)',
                        borderColor: isChecked ? 'rgba(37, 211, 102, 0.2)' : isNA ? 'transparent' : 'var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        opacity: isNA ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: '2px solid',
                          borderColor: isChecked ? '#25d366' : isNA ? 'var(--text-muted)' : 'var(--text-tertiary)',
                          background: isChecked ? '#25d366' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          flexShrink: 0
                        }}>
                          {isChecked && <Check size={14} strokeWidth={3} />}
                          {isNA && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>-</span>}
                        </div>

                        <div style={{
                          fontSize: '0.9rem',
                          color: isChecked ? 'var(--text-main)' : isNA ? 'var(--text-muted)' : 'var(--text-secondary)',
                          fontWeight: 500,
                          lineHeight: 1.4,
                          textDecoration: isNA ? 'line-through' : 'none'
                        }}>
                          <span style={{ fontWeight: 700, marginRight: '0.75rem', color: isChecked ? '#25d366' : 'var(--text-muted)' }}>
                            {item.id}.
                          </span>
                          {item.label}
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => handleToggleOcNA(e, item.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          background: isNA ? 'var(--text-main)' : 'rgba(255, 255, 255, 0.05)',
                          color: isNA ? 'var(--bg-main)' : 'var(--text-muted)',
                          border: '1px solid',
                          borderColor: isNA ? 'var(--text-main)' : 'var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        NA
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
                const needsAdminReview = allTasksDone && !isCompleted;

                return (
                  <div key={phase.id} className={`${styles.stageSection} ${isOpen ? styles.open : ''} ${isCompleted ? styles.completed : ''} ${needsAdminReview ? styles.blinkingPhase : ''}`}>
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
                          {phase.status === 'in-progress' && (() => {
                            const isOverdue = phase.timeBound && new Date(phase.timeBound + 'T00:00:00').setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                            return isOverdue ? (
                              <span className={styles.statusBadgeActive} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Overdue</span>
                            ) : (
                              <span className={styles.statusBadgeActive}>In Progress</span>
                            );
                          })()}
                          {phase.status === 'not-started' && <span className={styles.statusBadgePending}>Not Started</span>}
                          <span className={styles.timeBoundContainer} onClick={e => e.stopPropagation()}>
                            {editingTimeBound === phase.id ? (
                              <div className={styles.timeBoundEdit}>
                                <input 
                                  autoFocus
                                  type="date"
                                  value={timeBoundDraft} 
                                  onChange={e => setTimeBoundDraft(e.target.value)}
                                  className={styles.timeBoundInput}
                                  onKeyDown={e => { if (e.key === 'Enter') saveTimeBound(phase.id); if (e.key === 'Escape') setEditingTimeBound(null); }}
                                />
                                <button onClick={() => saveTimeBound(phase.id)} className={styles.tbSave}><Check size={12} /></button>
                                <button onClick={() => setEditingTimeBound(null)} className={styles.tbCancel}><X size={12} /></button>
                              </div>
                            ) : (
                              <div className={styles.timeBoundDisplay}>
                                <Clock size={12} /> 
                                <span>{formatDeadline(phase.timeBound)}</span>
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
                                <input 
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
                        <span className={styles.fileChipName} title={doc.name}>{renderHealthStatus(doc.id)}{doc.name}</span>
                        <Pencil className={styles.fileChipDownload} size={14} onClick={() => startRename(doc)} />
                        <Eye className={styles.fileChipDownload} size={14} onClick={() => viewDocumentSafe(doc.url)} />
                        <button onClick={(e) => { e.stopPropagation(); downloadDocumentSafe(doc.url, doc.name); }} title="Download" className={styles.iconBtn}>
                          <Download className={styles.fileChipDownload} size={14} />
                        </button>
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
                      const isFolderNA = (client.naFolders || []).includes(sub.id);
                      return (
                        <div key={sub.id}>
                          <div
                            className={`${styles.subfolder} ${dragOverTarget === sub.id ? styles.dropTarget : ''}`}
                            onDragOver={(e) => { e.stopPropagation(); onDragOver(e, sub.id); }}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => { e.stopPropagation(); onDrop(e, folder.id, sub.id); }}
                            style={{ opacity: isFolderNA ? 0.5 : 1, transition: 'opacity 0.15s ease' }}
                          >
                            <FolderOpen className={styles.subfolderIcon} size={14} strokeWidth={1.5} />
                            <span className={styles.subfolderName} style={{ textDecoration: isFolderNA ? 'line-through' : 'none', color: isFolderNA ? 'var(--text-muted)' : undefined }}>{sub.name}</span>
                            
                            <div className={styles.subfolderActions} onClick={(e) => e.stopPropagation()}>
                              {uploadingSubfolders[sub.id] ? (
                                <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600, marginRight: '8px' }}>
                                  <Loader2 size={11} className="animate-spin" /> Uploading...
                                </span>
                              ) : (
                                <span className={styles.subfolderCode}>{sub.code}</span>
                              )}
                              <button
                                onClick={(e) => handleToggleFolderNA(e, sub.id)}
                                title={isFolderNA ? 'Remove N/A' : 'Mark as Not Applicable'}
                                style={{
                                  padding: '0.2rem 0.45rem',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  background: isFolderNA ? 'var(--text-main)' : 'rgba(255, 255, 255, 0.05)',
                                  color: isFolderNA ? 'var(--bg-main)' : 'var(--text-muted)',
                                  border: '1px solid',
                                  borderColor: isFolderNA ? 'var(--text-main)' : 'var(--border)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  lineHeight: 1,
                                  marginRight: '4px'
                                }}
                              >
                                NA
                              </button>
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
                                        <span className={styles.fileRowName} title={doc.name}>{renderHealthStatus(doc.id)}{doc.name}</span>
                                        <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                                      </div>
                                      <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                                        <button className={styles.actionBtn} onClick={() => startRename(doc)} title="Rename">
                                          <Pencil size={13} />
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                          <Eye size={13} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); downloadDocumentSafe(doc.url, doc.name); }} className={styles.actionBtn} title="Download">
                                          <Download size={13} />
                                        </button>
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
                          
                          {/* Render sub-subfolders if any exist inside this subfolder */}
                          {(sub as any).subfolders && ((sub as any).subfolders.length > 0) && (
                            <div className={styles.subsubfoldersContainer} style={{ paddingLeft: '1.5rem', marginTop: '0.25rem', borderLeft: '2px solid rgba(var(--accent-rgb), 0.1)' }}>
                              {(sub as any).subfolders.map((subsub: any) => {
                                const subsubDocs = folderDocs.filter(d => d.subfolder === subsub.id);
                                const isSubsubNA = (client.naFolders || []).includes(subsub.id);
                                return (
                                  <div key={subsub.id} style={{ marginTop: '0.25rem' }}>
                                    <div
                                      className={`${styles.subfolder} ${dragOverTarget === subsub.id ? styles.dropTarget : ''}`}
                                      onDragOver={(e) => { e.stopPropagation(); onDragOver(e, subsub.id); }}
                                      onDragLeave={onDragLeave}
                                      onDrop={(e) => { e.stopPropagation(); onDrop(e, folder.id, subsub.id); }}
                                      style={{ opacity: isSubsubNA ? 0.5 : 1, transition: 'opacity 0.15s ease' }}
                                    >
                                      <FolderOpen className={styles.subfolderIcon} size={13} strokeWidth={1.5} />
                                      <span className={styles.subfolderName} style={{ fontSize: '0.8rem', textDecoration: isSubsubNA ? 'line-through' : 'none', color: isSubsubNA ? 'var(--text-muted)' : undefined }}>{subsub.name}</span>
                                      
                                      <div className={styles.subfolderActions} onClick={(e) => e.stopPropagation()}>
                                        {uploadingSubfolders[subsub.id] ? (
                                          <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 600, marginRight: '8px' }}>
                                            <Loader2 size={10} className="animate-spin" /> Uploading...
                                          </span>
                                        ) : (
                                          <span className={styles.subfolderCode} style={{ fontSize: '0.65rem' }}>{subsub.code}</span>
                                        )}
                                        <button
                                          onClick={(e) => handleToggleFolderNA(e, subsub.id)}
                                          title={isSubsubNA ? 'Remove N/A' : 'Mark as Not Applicable'}
                                          style={{
                                            padding: '0.15rem 0.4rem',
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            borderRadius: '4px',
                                            background: isSubsubNA ? 'var(--text-main)' : 'rgba(255, 255, 255, 0.05)',
                                            color: isSubsubNA ? 'var(--bg-main)' : 'var(--text-muted)',
                                            border: '1px solid',
                                            borderColor: isSubsubNA ? 'var(--text-main)' : 'var(--border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            lineHeight: 1,
                                            marginRight: '4px'
                                          }}
                                        >
                                          NA
                                        </button>
                                        <button
                                          className={styles.subfolderActionBtn}
                                          onClick={(e) => triggerSubfolderUpload(e, folder.id, subsub.id)}
                                          title={`Upload file directly to ${subsub.name}`}
                                          disabled={uploadingSubfolders[subsub.id]}
                                        >
                                          <Upload size={10} />
                                        </button>
                                      </div>
                                    </div>
                                    {subsubDocs.length > 0 && (
                                      <div className={styles.subfolderFiles}>
                                        {subsubDocs.map((doc: any) => (
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
                                                  <span className={styles.fileRowName} title={doc.name}>{renderHealthStatus(doc.id)}{doc.name}</span>
                                                  <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                                                </div>
                                                <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                                                  <button className={styles.actionBtn} onClick={() => startRename(doc)} title="Rename">
                                                    <Pencil size={13} />
                                                  </button>
                                                  <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                                    <Eye size={13} />
                                                  </button>
                                                  <button onClick={(e) => { e.stopPropagation(); downloadDocumentSafe(doc.url, doc.name); }} className={styles.actionBtn} title="Download">
                                                    <Download size={13} />
                                                  </button>
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
                                <span className={styles.fileRowName} title={doc.name}>{renderHealthStatus(doc.id)}{doc.name}</span>
                                <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                              </div>
                              <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                                <button className={styles.actionBtn} onClick={() => startRename(doc)} title="Rename">
                                  <Pencil size={13} />
                                </button>
                                <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                  <Eye size={13} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); downloadDocumentSafe(doc.url, doc.name); }} className={styles.actionBtn} title="Download">
                                  <Download size={13} />
                                </button>
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

      {/* ── OC Documents Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'oc_docs' && (
        <div className={styles.tabContent}>
          {/* Header Card / WhatsApp Send */}
          <div className={`glass-panel ${styles.progressCard}`} style={{ marginBottom: '2rem' }}>
            <div className={styles.progressFlex}>
              <div>
                <h2 className={styles.progressTitle}>OC Documents</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Manage and share OC Documents aligned with the Occupancy Certificate checklist.
                </p>
              </div>
              <button className={styles.sendBtn} onClick={handleSendOcDocs}>
                <MessageSquare size={16} /> Send OC Documents (WhatsApp)
              </button>
            </div>

            {showOcDocsSendSuccess && (
              <div style={{
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                color: '#25d366',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <span>✅</span>
                <span>OC Documents update message generated! WhatsApp Interakt API transmission triggered for <strong>{client.name}</strong> ({client.phone || 'No phone set'}).</span>
              </div>
            )}
          </div>

          <input
            type="file"
            multiple
            ref={ocDocFileInputRef}
            className={styles.hiddenInput}
            onChange={handleOcDocFileUpload}
            id="oc-doc-file-upload-input"
          />

          {/* OC Document Folders */}
          <div className={styles.foldersGrid}>
            {OC_DOCUMENT_FOLDERS.map((folder) => {
              const folderDocs = client.documents.filter(d => d.folder === folder.id);
              const totalDocs = folderDocs.length;
              const isOpen = openFolders[folder.id] ?? true;

              return (
                <div key={folder.id} className={`${styles.folderCard} ${isOpen ? styles.folderCardOpen : ''}`}>
                  <div className={styles.folderHeader} onClick={() => toggleFolder(folder.id)}>
                    <div className={styles.folderIcon}><Folder size={18} strokeWidth={2} /></div>
                    <div className={styles.folderInfo}>
                      <div className={styles.folderName}>{folder.name} ({folder.code})</div>
                      <div className={styles.folderMeta}>
                        <span>{totalDocs}</span> files
                        {uploadingOcDocFolders[folder.id] && (
                          <span style={{ marginLeft: '10px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <Loader2 size={12} className="animate-spin" /> Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.folderHeaderActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.folderActionBtn}
                        onClick={(e) => triggerOcDocFolderUpload(e, folder.id)}
                        title={`Upload file directly to ${folder.name}`}
                        disabled={uploadingOcDocFolders[folder.id]}
                      >
                        <Upload size={13} />
                      </button>
                      <ChevronDown className={styles.folderToggle} size={16} strokeWidth={2} onClick={() => toggleFolder(folder.id)} />
                    </div>
                  </div>
                  
                  <div className={styles.folderBody}>
                    <div className={styles.rootFiles}>
                      {folderDocs.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No documents uploaded yet. Click the upload icon above to add files.
                        </div>
                      ) : (
                        folderDocs.map(doc => (
                          <div key={doc.id} className={styles.fileRow}>
                            <div className={styles.fileRowLeft}>
                              <span className={styles.fileRowIcon}>{fileIcon(doc.type, 14)}</span>
                              <span className={styles.fileRowName} title={doc.name}>{renderHealthStatus(doc.id)}{doc.name}</span>
                              <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                            </div>
                            <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                              <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                <Eye size={13} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); downloadDocumentSafe(doc.url, doc.name); }} className={styles.actionBtn} title="Download">
                                <Download size={13} />
                              </button>
                              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => deleteOcDocDocument(doc.id)} title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CC/RDP/OC/PCC Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'ccrdp' && (
        <div className={styles.tabContent}>
          {/* Header Card / WhatsApp Send */}
          <div className={`glass-panel ${styles.progressCard}`} style={{ marginBottom: '2rem' }}>
            <div className={styles.progressFlex}>
              <div>
                <h2 className={styles.progressTitle}>CC/RDP/OC/PCC Document Section</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Manage and share CC, RDP, OC, and PCC certificates and documents.
                </p>
              </div>
              <button className={styles.sendBtn} onClick={handleSendCcrdp}>
                <MessageSquare size={16} /> Send CC/RDP/OC/PCC (WhatsApp)
              </button>
            </div>

            {showCcrdpSendSuccess && (
              <div style={{
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                color: '#25d366',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <span>✅</span>
                <span>CC/RDP/OC/PCC update message generated! WhatsApp Interakt API transmission triggered for <strong>{client.name}</strong> ({client.phone || 'No phone set'}).</span>
              </div>
            )}
          </div>

          <input
            type="file"
            multiple
            ref={ccrdpFileInputRef}
            className={styles.hiddenInput}
            onChange={handleCcrdpFileUpload}
            id="ccrdp-file-upload-input"
          />

          {/* 4 Folders */}
          <div className={styles.foldersGrid}>
            {CC_RDP_FOLDERS.map((folder) => {
              const folderDocs = client.documents.filter(d => d.folder === folder.id);
              const totalDocs = folderDocs.length;
              const isOpen = openFolders[folder.id] ?? true;

              return (
                <div key={folder.id} className={`${styles.folderCard} ${isOpen ? styles.folderCardOpen : ''}`}>
                  <div className={styles.folderHeader} onClick={() => toggleFolder(folder.id)}>
                    <div className={styles.folderIcon}><Folder size={18} strokeWidth={2} /></div>
                    <div className={styles.folderInfo}>
                      <div className={styles.folderName}>{folder.name} ({folder.code})</div>
                      <div className={styles.folderMeta}>
                        <span>{totalDocs}</span> files
                        {uploadingCcrdpFolders[folder.id] && (
                          <span style={{ marginLeft: '10px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <Loader2 size={12} className="animate-spin" /> Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.folderHeaderActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.folderActionBtn}
                        onClick={(e) => triggerCcrdpFolderUpload(e, folder.id)}
                        title={`Upload file directly to ${folder.name}`}
                        disabled={uploadingCcrdpFolders[folder.id]}
                      >
                        <Upload size={13} />
                      </button>
                      <ChevronDown className={styles.folderToggle} size={16} strokeWidth={2} onClick={() => toggleFolder(folder.id)} />
                    </div>
                  </div>
                  
                  <div className={styles.folderBody}>
                    <div className={styles.rootFiles}>
                      {folderDocs.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No documents uploaded yet. Click the upload icon above to add files.
                        </div>
                      ) : (
                        folderDocs.map(doc => (
                          <div key={doc.id} className={styles.fileRow}>
                            <div className={styles.fileRowLeft}>
                              <span className={styles.fileRowIcon}>{fileIcon(doc.type, 14)}</span>
                              <span className={styles.fileRowName} title={doc.name}>{renderHealthStatus(doc.id)}{doc.name}</span>
                              <span className={styles.fileRowSize}>{formatSize(doc.size)}</span>
                            </div>
                            <div className={styles.fileRowActions} onClick={(e) => e.stopPropagation()}>
                              <button className={styles.actionBtn} onClick={() => viewDocumentSafe(doc.url)} title="View">
                                <Eye size={13} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); downloadDocumentSafe(doc.url, doc.name); }} className={styles.actionBtn} title="Download">
                                <Download size={13} />
                              </button>
                              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => deleteCcrdpDocument(doc.id)} title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
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

function FilePreviewCard({ src, label, height = 110 }: { src: string; label: string; height?: number }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Detect real MIME from data URL (most reliable method) ─────────────────
  const getMime = (): string => {
    if (src.startsWith('data:')) {
      const m = src.match(/^data:([^;,]+)/);
      return m ? m[1] : 'application/octet-stream';
    }
    // Remote URL — infer from extension
    const ext = src.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const extMap: Record<string, string> = {
      pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
      jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      heic: 'image/heic', heif: 'image/heif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return extMap[ext] || 'application/octet-stream';
  };

  const mime = getMime();
  const isPdf  = mime === 'application/pdf';
  const isDocx = mime === 'application/msword' || mime.includes('wordprocessingml');
  const isHeic = mime === 'image/heic' || mime === 'image/heif';
  const isOctet = mime === 'application/octet-stream'; // iOS HEIC / unknown
  const isImage = mime.startsWith('image/') && !isHeic; // standard web image

  // Extension from MIME — always correct
  const getExt = (): string => {
    const m: Record<string, string> = {
      'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg',
      'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    return m[mime] || 'bin';
  };

  // Convert base64 data URL → Blob URL (avoids HTML download, works everywhere)
  const toBlobUrl = (forceMime?: string): string => {
    if (src.startsWith('data:')) {
      try {
        const comma = src.indexOf(',');
        const b64 = src.slice(comma + 1);
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: forceMime || mime }));
      } catch { return src; }
    }
    return src; // already a remote URL
  };

  const handleDownload = () => {
    const filename = `${label.replace(/\s+/g, '_')}.${getExt()}`;
    if (src.startsWith('data:')) {
      const url = toBlobUrl();
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      // Remote URL — fetch as blob to force download (not navigate)
      fetch(src).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }).catch(() => window.open(src, '_blank'));
    }
  };

  const handleView = () => {
    if (isDocx) { handleDownload(); return; } // browsers can't render DOCX
    if (src.startsWith('data:')) {
      const viewMime = isHeic || isOctet ? 'image/jpeg' : mime; // try as jpeg for HEIC
      const url = toBlobUrl(viewMime);
      window.open(url, '_blank');
      // revoke after delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      window.open(src, '_blank');
    }
  };

  // Stripped placeholder
  if (src === '[BASE64_STRIPPED]' || !src) {
    return (
      <div style={{ border: '1px dashed var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{label}</span>
        <div style={{ width: '100%', height: `${height}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', gap: '4px' }}>
          <FileText size={28} color="var(--text-muted)" />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>Please re-upload</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{label}</span>

      {/* Preview area */}
      {isPdf ? (
        <div style={{ width: '100%', height: `${height}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }} onClick={isMobile ? handleDownload : handleView}>
          <FileText size={36} color="#ef4444" />
          <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>PDF Document</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{isMobile ? 'Tap to download' : 'Click to view'}</span>
        </div>
      ) : isDocx ? (
        <div style={{ width: '100%', height: `${height}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.08)', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer' }} onClick={handleDownload}>
          <FileText size={36} color="#3b82f6" />
          <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600, marginTop: '4px' }}>Word Document</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tap to download</span>
        </div>
      ) : isHeic || isOctet ? (
        <div style={{ width: '100%', height: `${height}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.08)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }} onClick={handleDownload}>
          <Image size={36} color="#10b981" />
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>HEIC/HEIF Image</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tap to download</span>
        </div>
      ) : (
        <img src={src} alt={label} onClick={isMobile ? handleDownload : handleView} style={{ width: '100%', height: `${height}px`, borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} />
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {!isMobile && !isDocx && (
          <button onClick={handleView} style={{ flex: 1, padding: '4px 6px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <Eye size={10} /> View
          </button>
        )}
        <button onClick={handleDownload} style={{ flex: 1, padding: '4px 6px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
          <Download size={10} /> Download
        </button>
      </div>
    </div>
  );
}
