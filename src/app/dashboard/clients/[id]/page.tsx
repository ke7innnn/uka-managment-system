'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientById, updateClient, Client, Phase, Document as Doc, viewDocumentSafe } from '@/lib/store';
import { Image, FileText, FileSpreadsheet, Video, Paperclip, Mail, User, List, FolderOpen, Eye, Download, Trash2, Pencil, Check, X, Upload, CheckCircle2, Clock } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'documents'>('overview');
  // Rename state: docId -> draft name
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const doc: Doc = {
      id: crypto.randomUUID(),
      name,
      url,
      uploadedAt: new Date().toISOString(),
      type: type || 'unknown',
      size,
    };
    const c = getClientById(params.id);
    if (!c) return;
    try {
      updateClient(c.id, { documents: [...c.documents, doc] });
      reload();
    } catch (err) {
      alert(`Error saving document "${name}". It is likely too large for local storage.`);
    }
  };

  const deleteDocument = (docId: string) => {
    const doc = client.documents.find(d => d.id === docId);
    if (confirm(`Are you sure you want to delete "${doc?.name || 'this document'}"? This cannot be undone.`)) {
      const updated = client.documents.filter((d) => d.id !== docId);
      updateClient(client.id, { documents: updated });
      reload();
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

  const fileIcon = (type: string) => {
    if (type.includes('image')) return <Image size={20} strokeWidth={1.5} />;
    if (type.includes('pdf')) return <FileText size={20} strokeWidth={1.5} />;
    if (type.includes('word') || type.includes('document')) return <FileText size={20} strokeWidth={1.5} />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet size={20} strokeWidth={1.5} />;
    if (type.includes('video')) return <Video size={20} strokeWidth={1.5} />;
    return <Paperclip size={20} strokeWidth={1.5} />;
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
          <div className={styles.uploadRow}>
            <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />Upload Files
            </button>
            <span className={styles.uploadHint}>Images, PDFs, Word, Excel, Video… · Click the pencil icon on a file to rename it</span>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className={styles.hiddenInput}
              onChange={handleFileUpload}
              id="file-upload-input"
            />
          </div>

          {client.documents.length === 0 ? (
            <div className={styles.emptyState}>No documents uploaded yet.</div>
          ) : (
            <div className={styles.docGrid}>
              {client.documents.map((doc) => (
                <div key={doc.id} className={`glass-panel ${styles.docCard}`}>
                  <div className={styles.docIcon}>{fileIcon(doc.type)}</div>

                  <div className={styles.docInfo}>
                    {renamingId === doc.id ? (
                      /* ── Inline rename input ── */
                      <div className={styles.renameRow}>
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') cancelRename();
                          }}
                          className={styles.renameInput}
                          id={`rename-input-${doc.id}`}
                          aria-label="Rename document"
                        />
                        <button className={styles.renameSave} onClick={commitRename} title="Save"><Check size={14} strokeWidth={2.5} /></button>
                        <button className={styles.renameCancel} onClick={cancelRename} title="Cancel"><X size={14} strokeWidth={2.5} /></button>
                      </div>
                    ) : (
                      /* ── Normal name display ── */
                      <div className={styles.docNameRow}>
                        <p className={styles.docName} title={doc.name}>{doc.name}</p>
                        <button
                          className={styles.renameBtn}
                          onClick={() => startRename(doc)}
                          title="Rename document"
                          id={`rename-btn-${doc.id}`}
                        >
                          <Pencil size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                    <p className={styles.docMeta}>
                      {formatSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  <div className={styles.docActions}>
                    <button onClick={() => viewDocumentSafe(doc.url)} className={styles.docDownload} title="View" style={{ marginRight: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}><Eye size={15} strokeWidth={1.75} /></button>
                    <a href={doc.url} download={doc.name} className={styles.docDownload} title="Download"><Download size={15} strokeWidth={1.75} /></a>
                    <button
                      className={styles.docDelete}
                      onClick={() => deleteDocument(doc.id)}
                      title="Delete"
                    ><Trash2 size={14} strokeWidth={1.75} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
