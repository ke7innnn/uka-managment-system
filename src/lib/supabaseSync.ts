import { supabase, stripLargeBase64 } from './supabase';
import { Client, StaffMember, WorkspaceMessage } from './store';

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

    const { data: workspaceData, error: workspaceErr } = await supabase
      .from('workspace_messages')
      .select('*')
      .order('created_at', { ascending: true });
    
    // We don't throw on workspaceErr because the table might not exist yet for some users
    if (workspaceErr) console.warn('Workspace table might not exist yet:', workspaceErr);

    const { data: alertsData, error: alertsErr } = await supabase
      .from('performance_alerts')
      .select('*');
    if (alertsErr) console.warn('Performance alerts table might not exist yet:', alertsErr);

    const supabaseClients: Client[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      clientId: c.client_id || '',
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
      progressChecklist: c.progress_checklist || [],
      ocChecklist: c.oc_checklist || [],
      clientPassword: c.client_password || '',
      kyc: c.kyc || {},
      syncStatus: 'synced',
      phases: (c.phases || []).map((p: any) => ({
        id: p.id, name: p.name, completed: p.completed, order: p.order,
        status: p.status || (p.completed ? 'completed' : 'not-started'),
        timeBound: p.time_bound || undefined,
        startedAt: p.started_at || undefined,
        tasks: typeof p.tasks === 'string' ? JSON.parse(p.tasks) : (p.tasks || [])
      })),
      documents: (c.documents || []).map((d: any) => ({
        id: d.id, name: d.name, url: d.url, uploadedAt: d.uploaded_at,
        type: d.type || 'unknown', size: d.size || 0, uploadedBy: d.uploaded_by || '',
        folder: d.folder || undefined, subfolder: d.subfolder || undefined
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

    // Tombstone check for deleted clients
    const deletedRaw = localStorage.getItem('uka_deleted_client_ids');
    const deletedIds = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);

    // Tombstone check for deleted staff members
    const deletedStaffRaw = localStorage.getItem('uka_deleted_staff_ids');
    const deletedStaffIds = new Set<string>(deletedStaffRaw ? JSON.parse(deletedStaffRaw) : []);

    const activeSupabaseClients = supabaseClients.filter(c => !deletedIds.has(c.id));
    // Filter out tombstoned staff from Supabase data — they must never come back
    const activeSupabaseStaff = supabaseStaff.filter(s => !deletedStaffIds.has(s.id));

    const supabaseClientIds = new Set(activeSupabaseClients.map(c => c.id));
    // For staff, deduplicate by BOTH id AND name to prevent clones
    const supabaseStaffIds = new Set(activeSupabaseStaff.map(s => s.id));
    const supabaseStaffNames = new Set(activeSupabaseStaff.map(s => s.name.toLowerCase()));

    // Clients pending push: local clients that have explicitly been marked as 'pending' syncStatus (and not deleted)
    const pendingLocalClients = localClients.filter(c => c.syncStatus === 'pending' && !deletedIds.has(c.id));
    // Staff pending push: not in Supabase by ID AND not already there by name (prevents clones), and not tombstoned
    const pendingLocalStaff = localStaff.filter(s =>
      !supabaseStaffIds.has(s.id) && !supabaseStaffNames.has(s.name.toLowerCase()) && !deletedStaffIds.has(s.id)
    );

    const mergedClientsMap = new Map<string, Client>();
    activeSupabaseClients.forEach(c => mergedClientsMap.set(c.id, c));
    pendingLocalClients.forEach(c => mergedClientsMap.set(c.id, c)); // pending local takes precedence

    const mergedStaffMap = new Map<string, StaffMember>();
    activeSupabaseStaff.forEach(s => mergedStaffMap.set(s.id, s));
    pendingLocalStaff.forEach(s => mergedStaffMap.set(s.id, s));

    const mergedClients = Array.from(mergedClientsMap.values());
    const mergedStaff = Array.from(mergedStaffMap.values());

    localStorage.setItem('uka_clients', JSON.stringify(stripLargeBase64(mergedClients)));
    localStorage.setItem('uka_staff', JSON.stringify(stripLargeBase64(mergedStaff)));
    // Mark that we have synced at least once — getStaff() uses this to skip re-seeding
    localStorage.setItem('uka_supabase_synced', 'true');

    // Retry deletes in the background sequentially for any failed tombstoned clients
    if (deletedIds.size > 0) {
      deletedIds.forEach(async (id) => {
        try {
          await supabase.from('phases').delete().eq('client_id', id);
          await supabase.from('documents').delete().eq('client_id', id);
          const clientRes = await supabase.from('clients').delete().eq('id', id);

          if (!clientRes.error) {
            const currentDeletedRaw = localStorage.getItem('uka_deleted_client_ids');
            if (currentDeletedRaw) {
              const currentDeleted: string[] = JSON.parse(currentDeletedRaw);
              const updated = currentDeleted.filter(deletedId => deletedId !== id);
              localStorage.setItem('uka_deleted_client_ids', JSON.stringify(updated));
            }
          }
        } catch (err) {
          console.error('Retry delete client sequential error:', err);
        }
      });
    }

    // Retry deletes for any failed tombstoned staff members
    if (deletedStaffIds.size > 0) {
      deletedStaffIds.forEach(async (id) => {
        try {
          await supabase.from('staff_tasks').delete().eq('staff_id', id);
          await supabase.from('attendance_logs').delete().eq('staff_id', id);
          const staffRes = await supabase.from('staff').delete().eq('id', id);

          if (!staffRes.error) {
            const currentDeletedRaw = localStorage.getItem('uka_deleted_staff_ids');
            if (currentDeletedRaw) {
              const currentDeleted: string[] = JSON.parse(currentDeletedRaw);
              const updated = currentDeleted.filter(deletedId => deletedId !== id);
              localStorage.setItem('uka_deleted_staff_ids', JSON.stringify(updated));
            }
          }
        } catch (err) {
          console.error('Retry delete staff sequential error:', err);
        }
      });
    }

    // Retry push for any records that hadn't synced yet
    if (pendingLocalClients.length > 0) {
      pushClientsToSupabase(pendingLocalClients).catch(console.error);
    }
    if (pendingLocalStaff.length > 0) {
      pushStaffToSupabase(pendingLocalStaff).catch(console.error);
    }

    if (!workspaceErr && workspaceData) {
      const supabaseMessages: WorkspaceMessage[] = workspaceData.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        content: m.content,
        createdAt: m.created_at
      }));
      // Only keep last 3 days
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const recentMessages = supabaseMessages.filter(m => new Date(m.createdAt).getTime() > threeDaysAgo);
      localStorage.setItem('uka_workspace_messages', JSON.stringify(recentMessages));
    }

    // --- Performance Alerts Merge & Sync ---
    if (!alertsErr) {
      const localAlertsRaw = localStorage.getItem('uka_performance_alerts');
      const localAlerts: any[] = localAlertsRaw ? JSON.parse(localAlertsRaw) : [];
      
      const dbAlerts = (alertsData || []).map((a: any) => ({
        id: a.id,
        clientId: a.client_id || '',
        clientName: a.client_name,
        stageName: a.stage_name,
        severity: a.severity,
        templateKey: a.template_key,
        message: a.message,
        assignedTo: a.assigned_to,
        createdAt: a.created_at,
        readBy: typeof a.read_by === 'string' ? JSON.parse(a.read_by) : (a.read_by || [])
      }));

      const mergedAlertsMap = new Map<string, any>();
      dbAlerts.forEach(a => mergedAlertsMap.set(a.id, a));
      localAlerts.forEach(a => {
        const existing = mergedAlertsMap.get(a.id);
        if (existing) {
          const mergedRead = Array.from(new Set([...(existing.readBy || []), ...(a.readBy || [])]));
          mergedAlertsMap.set(a.id, { ...existing, readBy: mergedRead });
        } else {
          mergedAlertsMap.set(a.id, a);
        }
      });

      const mergedAlerts = Array.from(mergedAlertsMap.values());
      localStorage.setItem('uka_performance_alerts', JSON.stringify(mergedAlerts));

      if (mergedAlerts.length > 0) {
        pushAlertsToSupabase(mergedAlerts).catch(console.error);
      }
    }

    window.dispatchEvent(new Event('uka-sync-complete'));
    window.dispatchEvent(new Event('uka-workspace-sync-complete'));
    return true;
  } catch (err: any) {
    console.error('Failed to pull from Supabase:', err);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uka-sync-failed', {
        detail: err?.message || String(err)
      }));
    }
    return false;
  }
}

// ─── SYNC UP (LocalStorage -> Supabase) ────────────────────────────────────
export async function pushClientsToSupabase(clients: Client[]) {
  if (!clients || clients.length === 0) return;

  const clientRows = clients.map(c => ({
    id: c.id,
    client_id: c.clientId || null,
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
    tags: c.tags,
    progress_checklist: c.progressChecklist || [],
    oc_checklist: c.ocChecklist || [],
    client_password: c.clientPassword || null,
    kyc: c.kyc || {}
  }));

  const phaseRows: any[] = [];
  const docRows: any[] = [];

  clients.forEach(c => {
    c.phases.forEach(p => {
      phaseRows.push({ 
        id: p.id, 
        client_id: c.id, 
        name: p.name, 
        completed: p.status === 'completed' || p.completed, 
        order: p.order,
        status: p.status,
        time_bound: p.timeBound || null,
        started_at: p.startedAt || null,
        tasks: JSON.stringify(p.tasks || [])
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
        uploaded_by: d.uploadedBy,
        folder: d.folder || null,
        subfolder: d.subfolder || null
      });
    });
  });

  const { error } = await supabase.from('clients').upsert(clientRows);
  if (error) { console.error('pushClientsToSupabase clients error:', error.message); return; }
  
  if (phaseRows.length > 0) {
    const { error: phaseErr } = await supabase.from('phases').upsert(phaseRows);
    if (phaseErr) console.error('pushClientsToSupabase phases error:', phaseErr.message);
  }
  if (docRows.length > 0) {
    const { error: docErr } = await supabase.from('documents').upsert(docRows);
    if (docErr) console.error('pushClientsToSupabase documents error:', docErr.message);
  }

  // Update local storage to mark successfully pushed clients as 'synced'
  if (typeof window !== 'undefined') {
    const localRaw = localStorage.getItem('uka_clients');
    if (localRaw) {
      const local: Client[] = JSON.parse(localRaw);
      const pushedIds = new Set(clients.map(c => c.id));
      const updated = local.map(c => pushedIds.has(c.id) ? { ...c, syncStatus: 'synced' as const } : c);
      localStorage.setItem('uka_clients', JSON.stringify(updated));
    }
  }

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

export async function pushWorkspaceToSupabase(messages: any[]) {
  if (!messages || messages.length === 0) return;
  const rows = messages.map(m => ({
    id: m.id,
    sender_id: m.senderId,
    sender_name: m.senderName,
    sender_role: m.senderRole,
    content: m.content,
    created_at: m.createdAt
  }));
  
  // Also clean old messages from supabase
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('workspace_messages').delete().lt('created_at', threeDaysAgo);

  const { error } = await supabase.from('workspace_messages').upsert(rows);
  if (error) { console.error('pushWorkspaceToSupabase error:', error.message); }
}

export async function pushAlertsToSupabase(alerts: any[]) {
  if (!alerts || alerts.length === 0) return;
  const rows = alerts.map(a => ({
    id: a.id,
    client_id: a.clientId || null,
    client_name: a.clientName,
    stage_name: a.stageName,
    severity: a.severity,
    template_key: a.templateKey,
    message: a.message,
    assigned_to: a.assignedTo,
    created_at: a.createdAt,
    read_by: JSON.stringify(a.readBy || [])
  }));

  try {
    const { error } = await supabase.from('performance_alerts').upsert(rows);
    if (error) console.error('pushAlertsToSupabase error:', error.message);
  } catch (err) {
    console.error('Failed to push alerts to Supabase:', err);
  }
}
