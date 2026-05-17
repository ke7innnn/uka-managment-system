import { supabase } from './supabase';
import { Client, StaffMember } from './store';

// ─── SYNC DOWN (Supabase -> LocalStorage) ──────────────────────────────────
export async function pullFromSupabase() {
  if (typeof window === 'undefined') return false;

  try {
    const { data: clientsData, error: clientErr } = await supabase
      .from('clients')
      .select('*, phases(*), documents(*)');

    if (clientErr) throw clientErr;

    const { data: staffData, error: staffErr } = await supabase
      .from('staff')
      .select('*, staff_tasks(*), attendance_logs(*)');

    if (staffErr) throw staffErr;

    const supabaseClients: Client[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      place: c.place || '',
      address: c.address || '',
      notes: c.notes || '',
      projectName: c.project_name || '',
      projectStatus: c.project_status || 'pending',
      createdAt: c.created_at,
      tags: c.tags || [],
      phases: (c.phases || []).map((p: any) => ({
        id: p.id, name: p.name, completed: p.completed, order: p.order
      })),
      documents: (c.documents || []).map((d: any) => ({
        id: d.id, name: d.name, url: d.url, uploadedAt: d.uploaded_at,
        type: d.type || 'unknown', size: d.size || 0, uploadedBy: d.uploaded_by || ''
      }))
    }));

    const supabaseStaff: StaffMember[] = (staffData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      password: s.password || '',
      email: s.email || '',
      phone: s.phone || '',
      department: s.department || '',
      joinedAt: s.joined_at,
      totalTasksTarget: s.total_tasks_target || 0,
      workDeadline: s.work_deadline || undefined,
      notes: s.notes || '',
      profilePicture: s.profile_picture || '',
      tasks: (s.staff_tasks || []).map((t: any) => ({
        id: t.id, title: t.title, completed: t.completed,
        deadline: t.deadline || '', createdAt: t.created_at, completedAt: t.completed_at || undefined
      })),
      attendance: (s.attendance_logs || []).map((a: any) => ({
        id: a.id, date: a.date, checkIn: a.check_in, checkOut: a.check_out || undefined,
        location: a.location || undefined, locationLabel: a.location_label || undefined,
        hoursWorked: a.hours_worked || undefined
      }))
    }));

    // ── MERGE STRATEGY: Supabase wins, deduplicate by name to prevent ghost clones ──
    const localClientsRaw = localStorage.getItem('uka_clients');
    const localStaffRaw = localStorage.getItem('uka_staff');
    const localClients: Client[] = localClientsRaw ? JSON.parse(localClientsRaw) : [];
    const localStaff: StaffMember[] = localStaffRaw ? JSON.parse(localStaffRaw) : [];

    const supabaseClientIds = new Set(supabaseClients.map(c => c.id));
    // For staff, deduplicate by BOTH id AND name to prevent clones
    const supabaseStaffIds = new Set(supabaseStaff.map(s => s.id));
    const supabaseStaffNames = new Set(supabaseStaff.map(s => s.name.toLowerCase()));

    // Clients pending push: not in Supabase by ID
    const pendingLocalClients = localClients.filter(c => !supabaseClientIds.has(c.id));
    // Staff pending push: not in Supabase by ID AND not already there by name (prevents clones)
    const pendingLocalStaff = localStaff.filter(s =>
      !supabaseStaffIds.has(s.id) && !supabaseStaffNames.has(s.name.toLowerCase())
    );

    const mergedClients = [...supabaseClients, ...pendingLocalClients];
    const mergedStaff = [...supabaseStaff, ...pendingLocalStaff];

    localStorage.setItem('uka_clients', JSON.stringify(mergedClients));
    localStorage.setItem('uka_staff', JSON.stringify(mergedStaff));
    // Mark that we have synced at least once — getStaff() uses this to skip re-seeding
    localStorage.setItem('uka_supabase_synced', 'true');

    // Retry push for any records that hadn't synced yet
    if (pendingLocalClients.length > 0) {
      pushClientsToSupabase(pendingLocalClients).catch(console.error);
    }
    if (pendingLocalStaff.length > 0) {
      pushStaffToSupabase(pendingLocalStaff).catch(console.error);
    }

    window.dispatchEvent(new Event('uka-sync-complete'));
    return true;
  } catch (err) {
    console.error('Failed to pull from Supabase:', err);
    return false;
  }
}

// ─── SYNC UP (LocalStorage -> Supabase) ────────────────────────────────────
export async function pushClientsToSupabase(clients: Client[]) {
  if (!clients || clients.length === 0) return;

  const clientRows = clients.map(c => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    place: c.place,
    address: c.address,
    notes: c.notes,
    project_name: c.projectName,
    project_status: c.projectStatus,
    created_at: c.createdAt,
    tags: c.tags
  }));

  const phaseRows: any[] = [];
  const docRows: any[] = [];

  clients.forEach(c => {
    c.phases.forEach(p => {
      phaseRows.push({ id: p.id, client_id: c.id, name: p.name, completed: p.completed, order: p.order });
    });
    c.documents.forEach(d => {
      docRows.push({
        id: d.id, client_id: c.id, name: d.name, url: d.url,
        uploaded_at: d.uploadedAt, type: d.type, size: d.size, uploaded_by: d.uploadedBy
      });
    });
  });

  const { error } = await supabase.from('clients').upsert(clientRows);
  if (error) { console.error('pushClientsToSupabase error:', error.message); return; }
  
  if (phaseRows.length > 0) await supabase.from('phases').upsert(phaseRows);
  if (docRows.length > 0) await supabase.from('documents').upsert(docRows);

  // Clean up orphans
  const clientIds = clients.map(c => c.id);
  if (clientIds.length > 0) {
    const currentPhaseIds = phaseRows.map(p => p.id);
    if (currentPhaseIds.length > 0) {
      await supabase.from('phases').delete().in('client_id', clientIds).not('id', 'in', `(${currentPhaseIds.join(',')})`);
    } else {
      await supabase.from('phases').delete().in('client_id', clientIds);
    }

    const currentDocIds = docRows.map(d => d.id);
    if (currentDocIds.length > 0) {
      await supabase.from('documents').delete().in('client_id', clientIds).not('id', 'in', `(${currentDocIds.join(',')})`);
    } else {
      await supabase.from('documents').delete().in('client_id', clientIds);
    }
  }
}

export async function pushStaffToSupabase(staff: StaffMember[]) {
  if (!staff || staff.length === 0) return;

  const staffRows = staff.map(s => ({
    id: s.id,
    name: s.name,
    role: s.role,
    password: s.password,
    email: s.email,
    phone: s.phone,
    department: s.department,
    joined_at: s.joinedAt,
    total_tasks_target: s.totalTasksTarget,
    work_deadline: s.workDeadline,
    notes: s.notes,
    profile_picture: s.profilePicture
  }));

  const taskRows: any[] = [];
  const attendanceRows: any[] = [];

  staff.forEach(s => {
    s.tasks.forEach(t => {
      taskRows.push({
        id: t.id, staff_id: s.id, title: t.title, completed: t.completed,
        deadline: t.deadline || null, created_at: t.createdAt, completed_at: t.completedAt || null
      });
    });
    s.attendance.forEach(a => {
      attendanceRows.push({
        id: a.id, staff_id: s.id, date: a.date, check_in: a.checkIn,
        check_out: a.checkOut || null, location: a.location || null,
        location_label: a.locationLabel || null, hours_worked: a.hoursWorked || null
      });
    });
  });

  const { error } = await supabase.from('staff').upsert(staffRows);
  if (error) { console.error('pushStaffToSupabase error:', error.message); return; }
  
  if (taskRows.length > 0) await supabase.from('staff_tasks').upsert(taskRows);
  if (attendanceRows.length > 0) await supabase.from('attendance_logs').upsert(attendanceRows);

  // Clean up orphans
  const staffIds = staff.map(s => s.id);
  if (staffIds.length > 0) {
    const currentTaskIds = taskRows.map(t => t.id);
    if (currentTaskIds.length > 0) {
      await supabase.from('staff_tasks').delete().in('staff_id', staffIds).not('id', 'in', `(${currentTaskIds.join(',')})`);
    } else {
      await supabase.from('staff_tasks').delete().in('staff_id', staffIds);
    }

    const currentAttendanceIds = attendanceRows.map(a => a.id);
    if (currentAttendanceIds.length > 0) {
      await supabase.from('attendance_logs').delete().in('staff_id', staffIds).not('id', 'in', `(${currentAttendanceIds.join(',')})`);
    } else {
      await supabase.from('attendance_logs').delete().in('staff_id', staffIds);
    }
  }
}
