import { supabase } from './supabase';
import { Client, StaffMember } from './store';

// ─── SYNC DOWN (Supabase -> LocalStorage) ──────────────────────────────────
export async function pullFromSupabase() {
  if (typeof window === 'undefined') return false;

  try {
    // Fetch Clients with nested relations
    const { data: clientsData, error: clientErr } = await supabase
      .from('clients')
      .select('*, phases(*), documents(*)');

    if (clientErr) throw clientErr;

    // Fetch Staff with nested relations
    const { data: staffData, error: staffErr } = await supabase
      .from('staff')
      .select('*, staff_tasks(*), attendance_logs(*)');

    if (staffErr) throw staffErr;

    // Map Clients
    const mappedClients: Client[] = (clientsData || []).map(c => ({
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
        id: p.id,
        name: p.name,
        completed: p.completed,
        order: p.order
      })),
      documents: (c.documents || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        uploadedAt: d.uploaded_at,
        type: d.type || 'unknown',
        size: d.size || 0,
        uploadedBy: d.uploaded_by || ''
      }))
    }));

    // Map Staff
    const mappedStaff: StaffMember[] = (staffData || []).map(s => ({
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
        id: t.id,
        title: t.title,
        completed: t.completed,
        deadline: t.deadline || '',
        createdAt: t.created_at,
        completedAt: t.completed_at || undefined
      })),
      attendance: (s.attendance_logs || []).map((a: any) => ({
        id: a.id,
        date: a.date,
        checkIn: a.check_in,
        checkOut: a.check_out || undefined,
        location: a.location || undefined,
        locationLabel: a.location_label || undefined,
        hoursWorked: a.hours_worked || undefined
      }))
    }));

    localStorage.setItem('uka_clients', JSON.stringify(mappedClients));
    localStorage.setItem('uka_staff', JSON.stringify(mappedStaff));
    
    // Dispatch event so UI knows to reload
    window.dispatchEvent(new Event('uka-sync-complete'));
    return true;
  } catch (err) {
    console.error("Failed to pull from Supabase:", err);
    return false;
  }
}

// ─── SYNC UP (LocalStorage -> Supabase) ────────────────────────────────────
// To handle nested data easily without complex diffing, we upsert the parents,
// then upsert the children.

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
      phaseRows.push({
        id: p.id,
        client_id: c.id,
        name: p.name,
        completed: p.completed,
        order: p.order
      });
    });
    c.documents.forEach(d => {
      docRows.push({
        id: d.id,
        client_id: c.id,
        name: d.name,
        url: d.url,
        uploaded_at: d.uploadedAt,
        type: d.type,
        size: d.size,
        uploaded_by: d.uploadedBy
      });
    });
  });

  try {
    await supabase.from('clients').upsert(clientRows);
    if (phaseRows.length > 0) await supabase.from('phases').upsert(phaseRows);
    if (docRows.length > 0) await supabase.from('documents').upsert(docRows);
  } catch (err) {
    console.error("Failed to push clients to Supabase:", err);
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
        id: t.id,
        staff_id: s.id,
        title: t.title,
        completed: t.completed,
        deadline: t.deadline || null,
        created_at: t.createdAt,
        completed_at: t.completedAt || null
      });
    });
    s.attendance.forEach(a => {
      attendanceRows.push({
        id: a.id,
        staff_id: s.id,
        date: a.date,
        check_in: a.checkIn,
        check_out: a.checkOut || null,
        location: a.location || null,
        location_label: a.locationLabel || null,
        hours_worked: a.hoursWorked || null
      });
    });
  });

  try {
    await supabase.from('staff').upsert(staffRows);
    if (taskRows.length > 0) await supabase.from('staff_tasks').upsert(taskRows);
    if (attendanceRows.length > 0) await supabase.from('attendance_logs').upsert(attendanceRows);
  } catch (err) {
    console.error("Failed to push staff to Supabase:", err);
  }
}
