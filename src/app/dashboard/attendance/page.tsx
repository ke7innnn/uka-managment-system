'use client';

import { useEffect, useState } from 'react';
import { getStaff, StaffMember, AttendanceLog, StaffTask } from '@/lib/store';
import { Download, Calendar, ArrowRightCircle, ArrowLeftCircle, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import styles from './page.module.css';

type ReportRow = {
  staff: StaffMember;
  log: AttendanceLog | null;
  tasksDone: StaffTask[];
};

export default function DailyAttendancePage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    // Offset by timezone to get correct local ISO date string
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    setSelectedDate(localToday.toISOString().split('T')[0]);
    setStaff(getStaff());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedDate || staff.length === 0) return;

    const data: ReportRow[] = staff.map(member => {
      const log = member.attendance.find(a => a.date === selectedDate) || null;
      // Find tasks completed on this exact date during the shift
      const tasksDone = member.tasks.filter(t => {
        if (!t.completed) return false;
        
        if (t.completedAt) {
          const d = new Date(t.completedAt);
          const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          
          if (localStr !== selectedDate) return false;
          
          if (log && log.checkIn && log.checkIn !== '-') {
            const [timeIn, modIn] = log.checkIn.split(' ');
            let [hIn, mIn] = timeIn.split(':');
            if (hIn === '12') hIn = '00';
            if (modIn === 'PM') hIn = String(parseInt(hIn, 10) + 12);
            const checkInTime = new Date(`${selectedDate}T${hIn.padStart(2, '0')}:${mIn}:00`).getTime();
            
            if (d.getTime() < checkInTime) return false;
            
            if (log.checkOut && log.checkOut !== '-') {
              const [timeOut, modOut] = log.checkOut.split(' ');
              let [hOut, mOut] = timeOut.split(':');
              if (hOut === '12') hOut = '00';
              if (modOut === 'PM') hOut = String(parseInt(hOut, 10) + 12);
              const checkOutTime = new Date(`${selectedDate}T${hOut.padStart(2, '0')}:${mOut}:00`).getTime();
              
              if (d.getTime() > checkOutTime) return false;
            }
          }
          return true;
        } else {
          return t.deadline.startsWith(selectedDate);
        }
      });
      return { staff: member, log, tasksDone };
    });

    // Sort: those present first
    data.sort((a, b) => {
      if (a.log && !b.log) return -1;
      if (!a.log && b.log) return 1;
      return a.staff.name.localeCompare(b.staff.name);
    });

    setReportData(data);
  }, [selectedDate, staff]);

  const exportCSV = () => {
    const headers = ['Staff Name', 'Role', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Location', 'Tasks Completed'];
    const rows = reportData.map(row => {
      const status = row.log ? 'Present' : 'Absent';
      const checkIn = row.log?.checkIn || '-';
      const checkOut = row.log?.checkOut || '-';
      const hours = row.log?.hoursWorked ? row.log.hoursWorked.toFixed(1) : '-';
      const location = row.log?.locationLabel ? `"${row.log.locationLabel.replace(/"/g, '""')}"` : '-';
      
      const tasks = row.tasksDone.map(t => t.title).join(' | ');
      const tasksStr = tasks ? `"${tasks.replace(/"/g, '""')}"` : '-';

      return [
        `"${row.staff.name}"`,
        `"${row.staff.role}"`,
        status,
        checkIn,
        checkOut,
        hours,
        location,
        tasksStr
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) return null;

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily Attendance Report</h1>
          <p className={styles.subtitle}>Track check-ins, check-outs, and daily completed tasks.</p>
        </div>
        <div className={styles.controls}>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className={styles.dateInput}
            max={new Date().toISOString().split('T')[0]}
          />
          <button className={styles.exportBtn} onClick={exportCSV}>
            <Download size={16} strokeWidth={2} /> Export CSV
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Status</th>
              <th>Attendance Times</th>
              <th>Location</th>
              <th>Tasks Completed Today</th>
            </tr>
          </thead>
          <tbody>
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>No staff data found.</td>
              </tr>
            ) : (
              reportData.map((row, idx) => (
                <tr key={row.staff.id || idx}>
                  <td>
                    <div className={styles.staffCell}>
                      {row.staff.profilePicture ? (
                        <img src={row.staff.profilePicture} alt={row.staff.name} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatar}>{row.staff.name.charAt(0).toUpperCase()}</div>
                      )}
                      <div>
                        <span className={styles.staffName}>{row.staff.name}</span>
                        <span className={styles.staffRole}>{row.staff.role}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {row.log ? (
                      <span style={{ 
                        background: 'rgba(16, 185, 129, 0.08)', 
                        border: '1px solid rgba(16, 185, 129, 0.25)', 
                        color: '#34d399', 
                        padding: '0.25rem 0.55rem', 
                        borderRadius: '4px', 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.3rem' 
                      }}>
                        <CheckCircle2 size={12} /> Present
                      </span>
                    ) : (
                      <span style={{ 
                        background: 'rgba(239, 68, 68, 0.08)', 
                        border: '1px solid rgba(239, 68, 68, 0.25)', 
                        color: '#f87171', 
                        padding: '0.25rem 0.55rem', 
                        borderRadius: '4px', 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        display: 'inline-flex'
                      }}>
                        Absent
                      </span>
                    )}
                  </td>
                  <td>
                    {row.log ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <span className={styles.timeTag} style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 500 }}>
                          <ArrowRightCircle size={14} /> In: {row.log.checkIn}
                        </span>
                        {row.log.checkOut ? (
                          <span className={styles.timeTag} style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 500 }}>
                            <ArrowLeftCircle size={14} /> Out: {row.log.checkOut}
                          </span>
                        ) : (
                          <span className={styles.timeTag} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                            <Clock size={14} /> Ongoing...
                          </span>
                        )}
                        {row.log.hoursWorked && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.2rem' }}>
                            {row.log.hoursWorked.toFixed(1)} hrs total
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>—</span>
                    )}
                  </td>
                  <td>
                    {row.log?.locationLabel ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem', maxWidth: '200px' }}>
                        <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {row.log.locationLabel}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>—</span>
                    )}
                  </td>
                  <td>
                    {row.tasksDone.length > 0 ? (
                      <ul className={styles.taskList}>
                        {row.tasksDone.map(t => (
                          <li key={t.id} className={styles.taskItem}>
                            <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{t.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>No tasks completed.</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
