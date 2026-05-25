'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClients, Client, Document as Doc, viewDocumentSafe, DOCUMENT_FOLDERS as FOLDERS } from '@/lib/store';
import { ImageIcon, FileText, FileSpreadsheet, Video, Paperclip, User, Eye, Download } from 'lucide-react';
import styles from './page.module.css';

const getFolderAndSubfolderName = (folderId?: string, subfolderId?: string) => {
  if (!folderId) return null;
  const f = FOLDERS.find(x => x.id === folderId);
  if (!f) return null;
  if (subfolderId) {
    const sub = f.subfolders.find(x => x.id === subfolderId);
    return { folderName: f.name, subfolderName: sub ? sub.name : null };
  }
  return { folderName: f.name, subfolderName: null };
};

type DocWithClient = Doc & { 
  clientName: string; 
  clientId: string;
  projectName?: string;
};

export default function DocumentsPage() {
  const [allDocs, setAllDocs] = useState<DocWithClient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const clients = getClients();
    const docs: DocWithClient[] = [];
    clients.forEach((c: Client) => {
      c.documents.forEach((d) => {
        docs.push({ ...d, clientName: c.name, clientId: c.id, projectName: c.projectName });
      });
    });
    docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    setAllDocs(docs);
  }, []);

  const filtered = allDocs.filter((d) => {
    const s = search.toLowerCase();
    const folderInfo = getFolderAndSubfolderName(d.folder, d.subfolder);
    const folderMatch = folderInfo 
      ? folderInfo.folderName.toLowerCase().includes(s) || (folderInfo.subfolderName && folderInfo.subfolderName.toLowerCase().includes(s))
      : false;
    const projectMatch = d.projectName ? d.projectName.toLowerCase().includes(s) : false;
    
    return (
      d.name.toLowerCase().includes(s) ||
      d.clientName.toLowerCase().includes(s) ||
      folderMatch ||
      projectMatch
    );
  });

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={18} strokeWidth={1.5} />;
    if (type.includes('pdf')) return <FileText size={18} strokeWidth={1.5} />;
    if (type.includes('word') || type.includes('document')) return <FileText size={18} strokeWidth={1.5} />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet size={18} strokeWidth={1.5} />;
    if (type.includes('video')) return <Video size={18} strokeWidth={1.5} />;
    return <Paperclip size={18} strokeWidth={1.5} />;
  };

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.subtitle}>{allDocs.length} file{allDocs.length !== 1 ? 's' : ''} across all clients</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search documents, clients, projects, or folders…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.searchInput}
        id="doc-search"
      />

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {allDocs.length === 0
            ? <>No documents yet. Upload files from a <Link href="/dashboard/clients">client page →</Link></>
            : 'No documents match your search.'}
        </div>
      ) : (
        <div className={styles.docList}>
          {filtered.map((doc) => {
            const folderInfo = getFolderAndSubfolderName(doc.folder, doc.subfolder);
            return (
              <div key={doc.id} className={`glass-panel ${styles.docRow}`}>
                <div className={styles.docTopInfo}>
                  <div className={styles.docIcon}>{fileIcon(doc.type)}</div>
                  <div className={styles.docMain}>
                    <p className={styles.docName}>{doc.name}</p>
                    
                    {/* Folder and Project Metadata Tags */}
                    {(doc.projectName || folderInfo) && (
                      <div className={styles.docTags}>
                        {doc.projectName && (
                          <span className={styles.docProjectTag}>
                            💼 Project: {doc.projectName}
                          </span>
                        )}
                        {folderInfo && (
                          <span className={styles.docFolderTag}>
                            📁 {folderInfo.folderName} 
                            {folderInfo.subfolderName && ` / ${folderInfo.subfolderName}`}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={styles.docMeta}>
                      <Link href={`/dashboard/clients/${doc.clientId}`} className={styles.docClient} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <User size={12} strokeWidth={1.5} /> {doc.clientName}
                      </Link>
                      <span>·</span>
                      <span>{formatSize(doc.size)}</span>
                      <span>·</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.actionsContainer}>
                  <button onClick={() => viewDocumentSafe(doc.url)} className={`${styles.downloadBtn} ${styles.actionBtnSecondary}`} title="View file">
                    <Eye size={14} strokeWidth={1.75} /> View
                  </button>
                  <a href={doc.url} download={doc.name} className={styles.downloadBtn} title="Download file">
                    <Download size={14} strokeWidth={1.75} /> Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
