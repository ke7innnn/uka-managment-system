'use client';

import { useEffect, useState } from 'react';
import { 
  getStaffById, isStaffAuthenticated, updateStaffMember, 
  StaffMember, AttendanceLog, staffCompletionPct 
} from '@/lib/store';
import { MapPin, CheckCircle2, Clock, Check, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react';
import styles from '@/app/dashboard/staff/[id]/page.module.css';

export default function StaffDashboardHome() {
  const [member, setMember] = useState<StaffMember | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const reload = () => {
    const id = isStaffAuthenticated();
    if (id) {
      const m = getStaffById(id);
      if (m) setMember(m);
    }
  };

  useEffect(() => { reload(); }, []);

  if (!member) return null;

  // ── Task Actions ──
  const toggleTask = (taskId: string) => {
    const updated = member.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined };
      }
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
          id: Math.random().toString(36).substring(2, 9),
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

  const pct = staffCompletionPct(member);
  const pendingTasks = member.tasks.filter(t => !t.completed);
  const doneTasks = member.tasks.filter(t => t.completed);
  
  // Today's log
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaysLog = member.attendance.find(a => a.date === todayDateStr && !a.checkOut);

  return (
    <div className={`animate-fade-in ${styles.page}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.hero} style={{ marginBottom: '2rem' }}>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Tasks */}
        <div>
          <div className={`glass-panel ${styles.progressBar}`} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.pbHeader}>
              <span className={styles.pbLabel}>My Task Progress</span>
              <span className={styles.pbPct}>{pct}%</span>
            </div>
            <div className={styles.pbTrack}>
              <div className={styles.pbFill} style={{ width: `${pct}%`, background: 'var(--primary)' }} />
            </div>
            <p className={styles.pbSub}>{doneTasks.length} completed · {pendingTasks.length} pending</p>
          </div>

          <h3 className={styles.taskGroupTitle} style={{ marginBottom: '1rem', marginTop: '1rem' }}>My Tasks</h3>
          {member.tasks.length === 0 ? (
            <div className={styles.empty}>You have no tasks assigned.</div>
          ) : (
            <div className={styles.taskSections}>
              {pendingTasks.map(task => (
                <div key={task.id} className={styles.taskItem}>
                  <button className={`${styles.taskCheck}`} onClick={() => toggleTask(task.id)}></button>
                  <div className={styles.taskBody}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskDeadline}>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {doneTasks.map(task => (
                <div key={task.id} className={`${styles.taskItem} ${styles.taskDimmed}`}>
                  <button className={`${styles.taskCheck} ${styles.taskChecked}`} onClick={() => toggleTask(task.id)}><Check size={14} strokeWidth={2.5} /></button>
                  <div className={styles.taskBody}>
                    <span className={styles.taskTitle}>{task.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Attendance */}
        <div>
          <div className={`glass-panel ${styles.attForm}`} style={{ marginBottom: '1.5rem' }}>
            <h3 className={styles.attFormTitle}>Today's Attendance</h3>
            
            {todaysLog ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <p style={{ color: '#10b981', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} strokeWidth={2} /> Checked in at {todaysLog.checkIn}
                </p>
                <button 
                  className={styles.logBtn} 
                  style={{ background: '#ef4444', width: '100%', marginTop: '1rem' }}
                  onClick={() => handleClockOut(todaysLog.id)}
                >
                  Clock Out
                </button>
              </div>
            ) : (
              <div>
                <button 
                  className={styles.logBtn} 
                  style={{ width: '100%', opacity: locLoading ? 0.7 : 1 }} 
                  onClick={handleClockIn}
                  disabled={locLoading}
                >
                  {locLoading ? 'Capturing GPS & Clocking In...' : <><MapPin size={16} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Clock In Now</>}
                </button>
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Location access is strictly required to clock in.
                </p>
              </div>
            )}
          </div>

          <h3 className={styles.taskGroupTitle} style={{ marginBottom: '1rem' }}>Recent Attendance</h3>
          <div className={styles.attList}>
            {[...member.attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((log) => (
              <div key={log.id} className={`glass-panel ${styles.attCard}`}>
                <div className={styles.attCardLeft}>
                  <div className={styles.attDetails}>
                    <span className={styles.attDate}>{new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <div className={styles.attTimes}>
                      <span className={styles.attTime} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><ArrowRightCircle size={14} strokeWidth={1.75} color="#4ade80" /> {log.checkIn}</span>
                      {log.checkOut && <span className={styles.attTime} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><ArrowLeftCircle size={14} strokeWidth={1.75} color="#f87171" /> {log.checkOut}</span>}
                      {log.hoursWorked !== undefined && (
                        <span className={styles.attHours} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} strokeWidth={1.75} /> {log.hoursWorked.toFixed(1)}h</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
