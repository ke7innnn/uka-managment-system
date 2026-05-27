'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  getStaff, getClients, StaffMember, Client, totalHoursWorked 
} from '@/lib/store';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Building2, Clock, Trophy, AlertTriangle, MinusCircle, Flame, CheckCircle2, Bot, FolderKanban, Rocket, BarChart2
} from 'lucide-react';
import styles from './page.module.css';


export default function ReportsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    import('@/lib/supabaseSync').then(({ pullFromSupabase }) => {
      pullFromSupabase().then(() => {
        setStaff(getStaff());
        setClients(getClients());
        setMounted(true);
      });
    });
  }, []);

  // --- Staff Analytics ---
  const staffWithStats = staff.map(s => {
    let done = 0;
    let total = 0;
    let overdue = 0;
    
    const now = new Date().toISOString();

    // Personal tasks
    s.tasks.forEach(t => {
      total++;
      if (t.completed) {
        done++;
      } else if (t.deadline && t.deadline < now) {
        overdue++;
      }
    });
    
    // Client project tasks assigned to this staff member
    const firstName = s.name.split(' ')[0].toLowerCase();
    clients.forEach(c => {
      c.phases.forEach(p => {
        (p.tasks || []).forEach(t => {
          if (t.assignedTo && t.assignedTo.toLowerCase().includes(firstName)) {
            total++;
            if (t.completed) {
              done++;
            } else if (p.timeBound && p.timeBound < now) {
              overdue++;
            }
          }
        });
      });
    });

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const hrs = totalHoursWorked(s);
    const velocity = hrs > 0 ? (done / hrs) : 0;
    return { ...s, done, total, overdue, pct, hrs, velocity };
  });

  // --- Performance Data for Chart ---
  // Calculates total tasks (target) and completed tasks (actual) per staff member.
  const performanceData = staffWithStats.map(s => ({
    name: s.name.split(' ')[0], // First name
    target: s.totalTasksTarget !== undefined ? s.totalTasksTarget : s.total,
    actual: s.done
  })).slice(0, 7); // Show max 7 on chart
  
  if (performanceData.length === 0) {
    performanceData.push({ name: 'No Data', target: 0, actual: 0 });
  }

  const topPerformers = [...staffWithStats]
    .filter(s => s.done > 0)
    .sort((a, b) => b.done - a.done || b.pct - a.pct)
    .slice(0, 5);
  const needsAttention = [...staffWithStats].filter(s => s.overdue > 0).sort((a, b) => b.overdue - a.overdue);

  // --- Client/Project Analytics ---
  const projectsWithStats = clients.map(c => {
    const allTasks = c.phases.flatMap(p => p.tasks || []);
    const doneTasks = allTasks.filter(t => t.completed).length;
    const totalTasks = allTasks.length;
    const pct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    
    const donePhases = c.phases.filter(p => p.status === 'completed' || p.completed).length;
    const totalPhases = c.phases.length;
    
    return { ...c, donePhases, totalPhases, pct, doneTasks, totalTasks };
  });

  const highPriority = projectsWithStats.filter(c => c.projectStatus === 'active' && c.pct < 50 && c.totalPhases > 0).sort((a, b) => a.pct - b.pct);
  const almostDone = projectsWithStats.filter(c => c.projectStatus === 'active' && c.pct >= 80 && c.pct < 100);

  // --- Global Totals ---
  const globalTasksAssigned = staffWithStats.reduce((sum, s) => sum + s.total, 0);
  const globalTasksDone = staffWithStats.reduce((sum, s) => sum + s.done, 0);
  const globalCompletion = globalTasksAssigned > 0 ? Math.round((globalTasksDone / globalTasksAssigned) * 100) : 0;

  if (!mounted) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><BarChart2 size={28} style={{ color: 'var(--accent-light)' }} /> Analytics & Reports</h1>
          <p className={styles.subtitle}>Deep insights into team performance and project velocity.</p>
        </div>
      </div>

      {/* ── Global Overview Cards ── */}
      <div className={styles.grid3}>
        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.cardTitle}><TrendingUp size={14} strokeWidth={1.75} style={{ marginRight: 6 }} />Overall Productivity</div>
          <div className={styles.metricValue}>{globalCompletion}%</div>
          <div className={styles.metricLabel}>{globalTasksDone} out of {globalTasksAssigned} Tasks Completed</div>
        </div>
        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.cardTitle}><Building2 size={14} strokeWidth={1.75} style={{ marginRight: 6 }} />Active Projects</div>
          <div className={styles.metricValue}>{clients.filter(c => c.projectStatus === 'active').length}</div>
          <div className={styles.metricLabel}>Total active out of {clients.length}</div>
        </div>
        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.cardTitle}><Clock size={14} strokeWidth={1.75} style={{ marginRight: 6 }} />Total Staff Hours</div>
          <div className={styles.metricValue}>{staffWithStats.reduce((sum, s) => sum + s.hrs, 0).toFixed(1)}h</div>
          <div className={styles.metricLabel}>Tracked via GPS Attendance</div>
        </div>
      </div>

      {/* ── Main Analytics Grid ── */}
      <div className={styles.analyticsGrid}>
        
        {/* Main Chart */}
        <div className={`animate-slide-in ${styles.chartCard}`} style={{ animationDelay: '0.1s' }}>
          <h2 className={styles.sectionTitle}>
            <Trophy size={18} style={{ color: 'var(--accent-light)', marginRight: 8 }} />
            Team Performance Trend
          </h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="target" fill="rgba(124,58,237,0.3)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="actual" fill="var(--cyan)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Projects */}
        <div className={`animate-slide-in ${styles.listCard}`} style={{ animationDelay: '0.2s' }}>
          <h2 className={styles.sectionTitle}><Flame size={15} strokeWidth={1.75} style={{ marginRight: 6 }} />High Priority Projects</h2>
          <div className={styles.list}>
            {highPriority.length > 0 ? highPriority.map(c => (
              <div key={c.id} className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.avatar} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}><FolderKanban size={16} strokeWidth={1.5} /></div>
                  <div className={styles.itemInfo}>
                    <Link href={`/dashboard/clients/${c.id}`} className={styles.itemName}>{c.projectName || c.name}</Link>
                    <span className={styles.itemSub}>{c.company || 'Direct'}</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemStat} style={{ color: '#f59e0b' }}>{c.pct}% Complete</span>
                  <span className={`${styles.badge} ${styles.bgYellow}`}>Critical</span>
                </div>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No critical backlogs.</p>}
          </div>

          <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}><CheckCircle2 size={15} strokeWidth={1.75} style={{ marginRight: 6 }} />Nearing Completion</h2>
          <div className={styles.list}>
            {almostDone.length > 0 ? almostDone.map(c => (
              <div key={c.id} className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.avatar} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><Rocket size={16} strokeWidth={1.5} /></div>
                  <div className={styles.itemInfo}>
                    <Link href={`/dashboard/clients/${c.id}`} className={styles.itemName}>{c.projectName || c.name}</Link>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemStat} style={{ color: '#10b981' }}>{c.pct}%</span>
                  <span className={`${styles.badge} ${styles.bgGreen}`}>{c.totalPhases - c.donePhases} left</span>
                </div>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>None pending completion.</p>}
          </div>
        </div>
      </div>

      {/* ── Split Staff Lists ── */}
      <div className={styles.splitLists}>
        <div className={`glass-panel ${styles.listCard}`}>
          <h2 className={styles.sectionTitle}><Trophy size={15} strokeWidth={1.75} style={{ marginRight: 6 }} />Top Performers</h2>
          <div className={styles.list}>
            {topPerformers.length > 0 ? topPerformers.map(s => (
              <div key={s.id} className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.avatar} style={{ background: 'var(--grad-green)', color: 'white' }}>{s.name.charAt(0)}</div>
                  <div className={styles.itemInfo}>
                    <Link href={`/dashboard/staff/${s.id}`} className={styles.itemName}>{s.name}</Link>
                    <span className={styles.itemSub}>{s.role}</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemStat} style={{ color: '#10b981' }}>{s.pct}% Done</span>
                  <span className={`${styles.badge} ${styles.bgGreen}`}>{s.velocity.toFixed(1)} /hr</span>
                </div>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No staff currently on track.</p>}
          </div>
        </div>

        <div className={`glass-panel ${styles.listCard}`}>
          <h2 className={styles.sectionTitle}><AlertTriangle size={15} strokeWidth={1.75} style={{ marginRight: 6 }} />Needs Attention</h2>
          <div className={styles.list}>
            {needsAttention.length > 0 ? needsAttention.map(s => (
              <div key={s.id} className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.avatar} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>{s.name.charAt(0)}</div>
                  <div className={styles.itemInfo}>
                    <Link href={`/dashboard/staff/${s.id}`} className={styles.itemName}>{s.name}</Link>
                    <span className={styles.itemSub}>{s.role}</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemStat} style={{ color: '#ef4444' }}>{s.pct}% Done</span>
                  <span className={`${styles.badge} ${styles.bgRed}`}>{s.overdue} OVERDUE</span>
                </div>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No staff falling behind.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>
          <span style={{ color: 'rgba(124,58,237,0.7)', fontSize: '0.8rem' }}>●</span> Target: {payload[0].value}
        </p>
        <p className={styles.tooltipValue}>
          <span style={{ color: 'var(--cyan)', fontSize: '0.8rem' }}>●</span> Actual: {payload[1].value}
        </p>
      </div>
    );
  }
  return null;
};
