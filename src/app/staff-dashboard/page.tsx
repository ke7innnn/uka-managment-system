'use client';

import { useEffect, useState } from 'react';
import { 
  getStaffById, isStaffAuthenticated, updateStaffMember, 
  StaffMember, AttendanceLog, staffCompletionPct, getClients, Client,
  getClientById, updateClient
} from '@/lib/store';
import { processReminders, clearStageReminders } from '@/lib/reminders';
import Link from 'next/link';
import { MapPin, CheckCircle2, Clock, Check, ArrowRightCircle, ArrowLeftCircle, FolderOpen } from 'lucide-react';
import styles from '@/app/dashboard/staff/[id]/page.module.css';

interface AssignedStage {
  clientId: string;
  clientName: string;
  projectName?: string;
  phaseId: string;
  phaseName: string;
  status: 'not-started' | 'in-progress';
  assignedTasks: { id: string; title: string; completed: boolean }[];
}

export default function StaffDashboardHome() {
  const [member, setMember] = useState<StaffMember | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>('granted');
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [assignedStages, setAssignedStages] = useState<AssignedStage[]>([]);

  const reload = () => {
    const id = isStaffAuthenticated();
    if (id) {
      const m = getStaffById(id);
      if (m) {
        setMember(m);
        // Load active stage tasks assigned to this staff member
        const allClients = getClients();
        processReminders(allClients);
        
        const stagesList: AssignedStage[] = [];
        allClients.forEach(client => {
          client.phases.forEach(phase => {
            if (phase.status !== 'completed') {
              const assigned = (phase.tasks || [])
                .filter(task => task.assignedTo && task.assignedTo.toLowerCase().includes(m.name.toLowerCase()))
                .map(task => ({
                  id: task.id,
                  title: task.title,
                  completed: task.completed
                }));

              if (assigned.length > 0) {
                stagesList.push({
                  clientId: client.id,
                  clientName: client.name,
                  projectName: client.projectName,
                  phaseId: phase.id,
                  phaseName: phase.name,
                  status: phase.status,
                  assignedTasks: assigned
                });
              }
            }
          });
        });

        setAssignedStages(stagesList);
      }
    }
  };

  useEffect(() => { 
    reload(); 
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (isIOS && !isStandalone) {
        setShowIOSBanner(true);
      }
      
      if ('Notification' in window) {
        setNotifPerm(Notification.permission);
      } else {
        setNotifPerm('unsupported');
      }
    }
  }, []);

  if (!member) return null;

  const requestNotificationPermission = async () => {
    if (notifPerm === 'denied') {
      alert("You have previously denied notifications. Please enable them manually in your device or browser Settings for this app.");
      return;
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === 'granted') {
        alert("Notifications enabled! You will now see badges on your app icon.");
      } else {
        alert("Notification permissions were denied. You won't see badges on your app icon unless you change this in settings.");
      }
    }
  };

  // ── Task Actions ──
  const toggleGeneralTask = (taskId: string) => {
    if (!member) return;
    const updated = member.tasks.map(t => {
      if (t.id === taskId) return { ...t, completed: !t.completed };
      return t;
    });
    updateStaffMember(member.id, { tasks: updated });
    reload();
  };

  // ── Attendance Actions ──
  const handleClockIn = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const existing = member.attendance.find(a => a.date === dateStr);
    if (existing && !existing.checkOut) {
      alert("You are already checked in for today!");
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const coordsStr = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        let placeName = coordsStr;

        try {
          // Use OpenStreetMap Nominatim for highly precise street-level data
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name) {
            // Take the first 3 segments of the highly detailed display name
            // e.g., "Main Street, Vasai West, Palghar"
            const segments = data.display_name.split(',');
            placeName = segments.slice(0, 4).join(',').trim();
          } else if (data && data.address) {
             const { road, suburb, city, town, village } = data.address;
             const locality = suburb || city || town || village || '';
             placeName = [road, locality].filter(Boolean).join(', ');
          }
        } catch (e) {
          console.error("Geocoding failed", e);
        }

        const log: AttendanceLog = {
          id: crypto.randomUUID(),
          date: dateStr,
          checkIn: timeStr,
          location: coordsStr,
          locationLabel: placeName,
        };
        updateStaffMember(member.id, { attendance: [...member.attendance, log] });
        setLocLoading(false);
        reload();
      },
      (err) => {
        console.error(err);
        alert('Unable to get your location. Please enable location permissions to clock in.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleClockOut = (logId: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    
    const updated = member.attendance.map(a => {
      if (a.id === logId) {
        // calculate hours
        const [ih, im] = a.checkIn.split(':').map(Number);
        const [oh, om] = timeStr.split(':').map(Number);
        const hoursWorked = Math.max(0, (oh * 60 + om - (ih * 60 + im)) / 60);
        return { ...a, checkOut: timeStr, hoursWorked };
      }
      return a;
    });
    updateStaffMember(member.id, { attendance: updated });
    reload();
  };

  let totalAssignedTasksCount = 0;
  let completedAssignedTasksCount = 0;
  
  assignedStages.forEach(stage => {
    totalAssignedTasksCount += stage.assignedTasks.length;
    completedAssignedTasksCount += stage.assignedTasks.filter(t => t.completed).length;
  });

  if (member && member.tasks) {
    totalAssignedTasksCount += member.tasks.length;
    completedAssignedTasksCount += member.tasks.filter(t => t.completed).length;
  }
  
  const overallPct = totalAssignedTasksCount > 0 
    ? Math.round((completedAssignedTasksCount / totalAssignedTasksCount) * 100) 
    : 0;
  
  // Today's log
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaysLog = member.attendance.find(a => a.date === todayDateStr && !a.checkOut);

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.hero} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className={styles.heroLeft}>
            {member.profilePicture ? (
              <img src={member.profilePicture} alt={member.name} className={styles.heroAvatar} style={{ objectFit: 'cover' }} />
            ) : (
              <div className={styles.heroAvatar} style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.heroInfo}>
              <h1 className={styles.heroName}>Welcome back, {member.name}</h1>
              <p className={styles.heroRole}>{member.role}</p>
            </div>
          </div>
          
          {(notifPerm === 'default' || notifPerm === 'denied') && (
            <button 
              onClick={requestNotificationPermission}
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', color: '#a5b4fc', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
            >
              🔔 Enable Notifications
            </button>
          )}
        </div>

        {showIOSBanner && (
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px dashed rgba(59,130,246,0.4)', borderRadius: '12px', padding: '1rem', marginTop: '1rem', color: '#93c5fd', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              <strong>To enable notification badges on iOS:</strong> Tap the Safari <strong>Share</strong> button, select <strong>"Add to Home Screen"</strong>, then launch UKA from your Home Screen!
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Tasks Hub */}
        <div className={`glass-panel`} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Work Progress</h3>
            <div className={styles.pbHeader} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>{completedAssignedTasksCount} / {totalAssignedTasksCount} Tasks Completed</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800 }}>{overallPct}%</span>
            </div>
            <div className={styles.pbTrack} style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div className={styles.pbFill} style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg, var(--primary), #a5b4fc)', height: '100%', borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>My Active Stages</h3>
            {assignedStages.length === 0 ? (
              <div className={styles.empty} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                You have no active project stages assigned.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignedStages.map(stage => {
                  const stageTotal = stage.assignedTasks.length;
                  const stageDone = stage.assignedTasks.filter(t => t.completed).length;
                  const stagePct = Math.round((stageDone / stageTotal) * 100);

                  return (
                    <div 
                      key={stage.phaseId} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.25rem', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            {stage.clientName}
                          </h4>
                          {stage.projectName && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                              📁 {stage.projectName}
                            </p>
                          )}
                          <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, margin: 0, marginTop: '8px' }}>
                            {stage.phaseName}
                          </p>
                        </div>
                        <span 
                          style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '12px',
                            background: stage.status === 'in-progress' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: stage.status === 'in-progress' ? '#10b981' : '#f59e0b',
                            border: stage.status === 'in-progress' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {stage.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>

                      {/* Stage internal progress */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <span>Your Tasks: {stageDone} / {stageTotal} completed</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stagePct}%</span>
                        </div>
                        <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${stagePct}%`, background: 'var(--accent)', height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>

                      {/* Redirect Button */}
                      <Link 
                        href={`/staff-dashboard/projects/${stage.clientId}?tab=phases`}
                        style={{ textDecoration: 'none' }}
                      >
                        <button 
                          style={{ 
                            width: '100%',
                            background: 'var(--border)',
                            color: 'var(--text-main)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            padding: '0.65rem',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(200, 169, 110, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(200, 169, 110, 0.3)';
                            e.currentTarget.style.color = 'var(--accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--border)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = 'var(--text-main)';
                          }}
                        >
                          <FolderOpen size={15} />
                          Open Stage & Upload Documents
                        </button>
                      </Link>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {member && member.tasks && member.tasks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>My General Tasks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {member.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '1rem', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      opacity: task.completed ? 0.6 : 1,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <div 
                      onClick={() => toggleGeneralTask(task.id)}
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '6px', 
                        border: task.completed ? 'none' : '2px solid var(--border)',
                        background: task.completed ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {task.completed && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                        {task.title || (task as any).text}
                      </p>
                      {task.deadline && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                          Due: {task.deadline}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Attendance Hub */}
        <div className={`glass-panel`} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Today's Attendance</h3>
            {todaysLog ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                <p style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} strokeWidth={2.5} /> Checked in at {todaysLog.checkIn}
                </p>
                <button 
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.85rem', width: '100%', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', transition: 'transform 0.2s' }}
                  onClick={() => handleClockOut(todaysLog.id)}
                >
                  Clock Out
                </button>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center' }}>
                <button 
                  style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.85rem', width: '100%', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: locLoading ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)', transition: 'all 0.2s', opacity: locLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                  onClick={handleClockIn}
                  disabled={locLoading}
                >
                  <MapPin size={18} strokeWidth={2} /> {locLoading ? 'Capturing GPS...' : 'Clock In Now'}
                </button>
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Location access is strictly required.
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Recent Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...member.attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, marginBottom: '0.25rem' }}>{new Date(log.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ArrowRightCircle size={12} color="#4ade80" /> {log.checkIn}</span>
                      {log.checkOut && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ArrowLeftCircle size={12} color="#f87171" /> {log.checkOut}</span>}
                    </p>
                  </div>
                  {log.hoursWorked !== undefined && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{log.hoursWorked.toFixed(1)}h</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logged</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
