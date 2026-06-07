'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getStaff, deleteStaffMember, StaffMember, updateStaffMember, StaffTask,
  staffCompletionPct, staffStatusColor,
} from '@/lib/store';
import { BarChart2, CheckCircle2, AlertTriangle, XCircle, Hourglass, User, PlusCircle, Briefcase, Calendar } from 'lucide-react';
import styles from './page.module.css';

const COLOR_MAP = {
  green:  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',  text: '#6ee7b7', dot: '#10b981', label: 'On Track'      },
  yellow: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  text: '#fcd34d', dot: '#f59e0b', label: 'Needs Attention' },
  red:    { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',   text: '#fca5a5', dot: '#ef4444', label: 'Behind'         },
};

function daysLeft(deadline?: string) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filterColor, setFilterColor] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [search, setSearch] = useState('');

  // Quick assign state
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');

  const reload = () => setStaff(getStaff());
  useEffect(() => { reload(); }, []);

  const handleQuickAssign = () => {
    if (!assignStaffId || !assignTitle.trim() || !assignDeadline) {
      alert("Please select a staff member, enter a task title, and choose a deadline.");
      return;
    }
    const member = staff.find(s => s.id === assignStaffId);
    if (!member) return;

    const task: StaffTask = {
      id: crypto.randomUUID(),
      title: assignTitle.trim(),
      completed: false,
      deadline: assignDeadline,
      createdAt: new Date().toISOString(),
    };

    updateStaffMember(member.id, { tasks: [...member.tasks, task] });
    setAssignStaffId('');
    setAssignTitle('');
    setAssignDeadline('');
    reload();
    alert(`Task assigned to ${member.name} successfully!`);
  };

  const totalDone   = staff.reduce((s, m) => s + m.tasks.filter(t => t.completed).length, 0);
  const totalTarget = staff.reduce((s, m) => s + m.tasks.length, 0);
  const greenCount  = staff.filter(m => staffStatusColor(m) === 'green').length;
  const yellowCount = staff.filter(m => staffStatusColor(m) === 'yellow').length;
  const redCount    = staff.filter(m => staffStatusColor(m) === 'red').length;

  const filtered = staff.filter(m => {
    const matchColor  = filterColor === 'all' || staffStatusColor(m) === filterColor;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                        m.role.toLowerCase().includes(search.toLowerCase()) ||
                        (m.department || '').toLowerCase().includes(search.toLowerCase());
    return matchColor && matchSearch;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from staff? This cannot be undone.`)) {
      deleteStaffMember(id);
      reload();
    }
  };

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff Monitoring</h1>
          <p className={styles.subtitle}>{staff.length} staff member{staff.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <Link href="/dashboard/staff/new" className={styles.newBtn}>+ Add Staff</Link>
      </div>

      {/* Summary stats */}
      <div className={styles.statsRow}>
        <div className={`glass-panel ${styles.statCard}`}>
          <span className={styles.statIcon} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}><BarChart2 size={18} strokeWidth={1.5} /></span>
          <div>
            <div className={styles.statVal}>{totalDone}<span className={styles.statOf}>/{totalTarget}</span></div>
            <div className={styles.statLabel}>Tasks Completed</div>
          </div>
        </div>
        <div className={`glass-panel ${styles.statCard}`} onClick={() => setFilterColor('green')} style={{ cursor: 'pointer' }}>
          <span className={styles.statIcon} style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80' }}><CheckCircle2 size={18} strokeWidth={1.5} /></span>
          <div>
            <div className={styles.statVal}>{greenCount}</div>
            <div className={styles.statLabel}>On Track</div>
          </div>
        </div>
        <div className={`glass-panel ${styles.statCard}`} onClick={() => setFilterColor('yellow')} style={{ cursor: 'pointer' }}>
          <span className={styles.statIcon} style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}><AlertTriangle size={18} strokeWidth={1.5} /></span>
          <div>
            <div className={styles.statVal}>{yellowCount}</div>
            <div className={styles.statLabel}>Needs Attention</div>
          </div>
        </div>
        <div className={`glass-panel ${styles.statCard}`} onClick={() => setFilterColor('red')} style={{ cursor: 'pointer' }}>
          <span className={styles.statIcon} style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}><XCircle size={18} strokeWidth={1.5} /></span>
          <div>
            <div className={styles.statVal}>{redCount}</div>
            <div className={styles.statLabel}>Behind</div>
          </div>
        </div>
      </div>

      {/* Quick Assign Task */}
      <div className={styles.quickAssignCard}>
        <h3 className={styles.quickAssignTitle}>
          <PlusCircle className={styles.quickAssignTitleIcon} size={18} strokeWidth={1.5} />
          Quick Assign Task
        </h3>
        
        <div className={styles.quickAssignGrid}>
          {/* Select Staff */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Select Staff</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={16} strokeWidth={1.5} />
              <select
                value={assignStaffId}
                onChange={e => setAssignStaffId(e.target.value)}
                className={styles.inputField}
                style={{ cursor: 'pointer' }}
              >
                <option value="">-- Choose Staff Member --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Task Title</label>
            <div className={styles.inputWrapper}>
              <Briefcase className={styles.inputIcon} size={16} strokeWidth={1.5} />
              <input
                type="text"
                value={assignTitle}
                onChange={e => setAssignTitle(e.target.value)}
                placeholder="e.g. Complete 3D Render"
                className={styles.inputField}
              />
            </div>
          </div>

          {/* Deadline */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Deadline</label>
            <div className={styles.inputWrapper}>
              <Calendar className={styles.inputIcon} size={16} strokeWidth={1.5} />
              <input
                type="date"
                value={assignDeadline}
                onChange={e => setAssignDeadline(e.target.value)}
                className={styles.inputField}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleQuickAssign}
            className={styles.submitBtn}
          >
            Assign Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name, role, department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
          id="staff-search"
        />
        <div className={styles.colorFilters}>
          {(['all', 'green', 'yellow', 'red'] as const).map(c => (
            <button
              key={c}
              className={`${styles.filterChip} ${filterColor === c ? styles.chipActive : ''}`}
              onClick={() => setFilterColor(c)}
              style={c !== 'all' ? {
                borderColor: filterColor === c ? COLOR_MAP[c].dot : 'transparent',
                background:  filterColor === c ? COLOR_MAP[c].bg : undefined,
                color:       filterColor === c ? COLOR_MAP[c].text : undefined,
              } : {}}
            >
              {c === 'all' ? 'All' : <><span style={{ color: COLOR_MAP[c].dot }}>●</span> {COLOR_MAP[c].label}</>}
            </button>
          ))}
        </div>
      </div>

      {/* Staff cards */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {staff.length === 0
            ? <>No staff added yet. <Link href="/dashboard/staff/new">Add your first →</Link></>
            : 'No staff match your filter.'}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filtered.map(member => {
            const color  = staffStatusColor(member);
            const c      = COLOR_MAP[color];
            const pct    = staffCompletionPct(member);
            const done   = member.tasks.filter(t => t.completed).length;
            const days   = daysLeft(member.workDeadline);

            return (
              <div
                key={member.id}
                className={`glass-panel ${styles.staffCard}`}
                style={{ borderColor: c.border }}
              >
                {/* Card top */}
                <div className={styles.cardTop}>
                  <div className={styles.cardAvatarWrap}>
                    {member.profilePicture ? (
                      <img src={member.profilePicture} alt={member.name} className={styles.cardAvatar} style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className={styles.cardAvatar} style={{ background: `linear-gradient(135deg, ${c.dot}88, ${c.dot}44)`, color: c.text }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={styles.statusDot} style={{ background: c.dot }} title={c.label} />
                  </div>
                  <div className={styles.cardInfo}>
                    <h2 className={styles.cardName} style={{ color: c.text }}>{member.name}</h2>
                    <p className={styles.cardRole}>{member.role}{member.department ? ` · ${member.department}` : ''}</p>
                  </div>
                  <span className={styles.colorBadge} style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block', marginRight: 4 }} /> {c.label}
                  </span>
                </div>

                {/* Card body */}
                <div className={styles.cardBody}>
                  {/* Task progress */}
                  <div className={styles.progressSection}>
                    <div className={styles.progressHeader}>
                      <span>Task Completion</span>
                      <span className={styles.progressFraction} style={{ color: c.text }}>
                        {done}/{member.tasks.length}
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${c.dot}, ${c.text})`,
                        }}
                      />
                    </div>
                    <span className={styles.progressPct}>{pct}%</span>
                  </div>

                  {/* Meta row */}
                  <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaIcon}><Briefcase size={13} strokeWidth={1.5} /></span>
                      <span className={styles.metaVal}>{member.tasks.length}</span>
                      <span className={styles.metaLabel}>Tasks</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaIcon}><Hourglass size={13} strokeWidth={1.5} /></span>
                      <span
                        className={styles.metaVal}
                        style={{ color: days !== null && days < 3 ? '#fca5a5' : undefined }}
                      >
                        {days === null ? '—' : days < 0 ? 'OD' : `${days}d`}
                      </span>
                      <span className={styles.metaLabel}>Deadline</span>
                    </div>
                  </div>
                  {/* Login credentials */}
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Login ID (Phone):</span>
                      <strong style={{ color: 'var(--text-main)' }}>{member.phone || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Password:</span>
                      <strong style={{ color: '#f59e0b' }}>{member.password || '—'}</strong>
                    </div>
                  </div>

                </div>

                {/* Actions */}
                <div className={styles.cardActions}>
                  <Link href={`/dashboard/staff/${member.id}`} className={styles.viewBtn}>View Details</Link>
                  <Link href={`/dashboard/staff/${member.id}/edit`} className={styles.editBtn}>Edit</Link>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(member.id, member.name)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
