'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, Rocket, CheckCircle2, PauseCircle, Clock, ArrowUpRight, 
  Activity, Plus, FileText, BarChart2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { getClients, Client, getStaff, StaffMember } from '@/lib/store';
import { AlertTriangle, XCircle } from 'lucide-react';
import styles from './page.module.css';


export default function DashboardHome() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { 
    setClients(getClients()); 
    setStaff(getStaff());
    setMounted(true);
  }, []);

  const active    = clients.filter(c => c.projectStatus === 'active').length;
  const completed = clients.filter(c => c.projectStatus === 'completed').length;
  const onHold    = clients.filter(c => c.projectStatus === 'on-hold').length;
  const pending   = clients.filter(c => c.projectStatus === 'pending').length;

  const recentClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Performance calculations
  const performanceAlerts = staff.map(member => {
    const total = member.tasks.length;
    if (total === 0) return null;
    const completed = member.tasks.filter(t => t.completed).length;
    const pct = Math.round((completed / total) * 100);
    
    let status = 'on-track';
    if (pct < 30) status = 'behind';
    else if (pct < 70) status = 'attention';
    
    if (status === 'on-track') return null; // only show alerts
    
    return { member, pct, status };
  }).filter(Boolean) as { member: StaffMember, pct: number, status: string }[];

  const topAlerts = performanceAlerts
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  // Dynamic data for the chart to simulate activity over last 7 days based on clients
  const generateChartData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data: { name: string; active: number; completed: number; dateStr: string }[] = [];
    const today = new Date();
    
    // Create base data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      data.push({ name: days[d.getDay()], active: 0, completed: 0, dateStr: d.toISOString().split('T')[0] });
    }

    // Populate with real clients
    clients.forEach(c => {
      const createdDate = new Date(c.createdAt).toISOString().split('T')[0];
      const match = data.find(d => d.dateStr === createdDate);
      if (match) {
        if (c.projectStatus === 'completed') match.completed++;
        else match.active++;
      }
    });
    
    // Accumulate to show an "uptime trend"
    let accActive = Math.max(5, active - 5);
    data.forEach(d => {
      accActive += (d.active || 1); // smooth base growth
      d.active = accActive; 
    });

    return data;
  };

  const activityData = generateChartData();

  // Prevent hydration mismatch with recharts
  if (!mounted) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Real-time overview</p>
          <h1 className={styles.title}>Operations Dashboard</h1>
        </div>
        <Link href="/dashboard/clients/new" className={styles.newClientBtn}>
          <Plus size={16} strokeWidth={2.5} /> Add New Client
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Clients"    value={clients.length} Icon={Users}         />
        <StatCard label="Active Projects"  value={active}         Icon={Rocket}        accent />
        <StatCard label="Completed"        value={completed}      Icon={CheckCircle2}  />
        <StatCard label="On Hold"          value={onHold}         Icon={PauseCircle}   />
      </div>

      {/* ── Main Layout ── */}
      <div className={styles.dashboardMain}>
        
        {/* Chart Area */}
        <div className={`animate-slide-in ${styles.chartSection}`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Activity size={18} style={{ color: 'var(--accent-light)' }} />
              Project Velocity Trend
            </h2>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="active" stroke="var(--accent-light)" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel */}
        <div className={`animate-slide-in ${styles.sideSection}`} style={{ animationDelay: '0.2s' }}>
          
          <div className={styles.quickActions}>
            <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>
              <h2 className={styles.sectionTitle}>Quick Actions</h2>
            </div>
            <div className={styles.actionGrid}>
              <button className={styles.actionBtn} onClick={() => router.push('/dashboard/documents')}>
                <FileText size={16} /> Documents
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/dashboard/reports')}>
                <BarChart2 size={16} /> Reports
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/dashboard/staff/new')}>
                <Users size={16} /> Add Staff
              </button>
              <button className={styles.actionBtn} onClick={() => router.push('/dashboard/projects')}>
                <Rocket size={16} /> Projects
              </button>
            </div>
          </div>

          <div className={styles.recentClients}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Clients</h2>
              <Link href="/dashboard/clients" className={styles.viewAll}>
                See all
              </Link>
            </div>

            {recentClients.length === 0 ? (
              <div className={styles.empty}>
                <p>No activity yet.</p>
              </div>
            ) : (
              <div className={styles.clientList}>
                {recentClients.map(client => (
                  <Link key={client.id} href={`/dashboard/clients/${client.id}`} className={styles.clientRow}>
                    <div className={styles.clientAvatar}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.clientInfo}>
                      <span className={styles.clientName}>{client.name}</span>
                      <span className={styles.clientMeta}>{client.company || client.place || 'Direct'}</span>
                    </div>
                    <div className={styles.clientRight}>
                      <StatusBadge status={client.projectStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          <div className={styles.recentClients} style={{ marginTop: '1.5rem' }}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Performance Alerts</h2>
              <Link href="/dashboard/staff" className={styles.viewAll}>
                Staff
              </Link>
            </div>
            
            {topAlerts.length === 0 ? (
              <div className={styles.empty}>
                <p>All staff are on track!</p>
              </div>
            ) : (
              <div className={styles.clientList}>
                {topAlerts.map(({ member, pct, status }) => (
                  <Link key={member.id} href={`/dashboard/staff/${member.id}`} className={styles.clientRow}>
                    <div className={styles.clientAvatar} style={{ background: status === 'behind' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: status === 'behind' ? '#ef4444' : '#f59e0b', border: 'none' }}>
                      {status === 'behind' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div className={styles.clientInfo}>
                      <span className={styles.clientName}>{member.name}</span>
                      <span className={styles.clientMeta}>Task Completion: {pct}%</span>
                    </div>
                    <div className={styles.clientRight}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: status === 'behind' ? '#ef4444' : '#f59e0b' }}>
                        {status === 'behind' ? 'BEHIND' : 'ATTENTION'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// ── Components ──

function StatCard({ label, value, Icon, accent }: { label: string; value: number; Icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statCardAccent : ''}`}>
      <div className={styles.statTop}>
        <div className={styles.statIconWrap}>
          <Icon size={18} strokeWidth={2} style={{ color: accent ? '#fff' : 'var(--text)' }} />
        </div>
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Client['projectStatus'] }) {
  const map: Record<Client['projectStatus'], { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    completed: { label: 'Done',      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    'on-hold': { label: 'On Hold',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    pending:   { label: 'Pending',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  };
  const s = map[status];
  return (
    <span className={styles.badge} style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
      <span className={styles.dot} style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>
          <span style={{ color: 'var(--accent-light)', fontSize: '0.8rem', marginRight: '0.5rem' }}>●</span>
          {payload[0].value} Active Projects
        </p>
      </div>
    );
  }
  return null;
};
