import { supabase, stripLargeBase64 } from './supabase';
import { Client, StaffMember, WorkspaceMessage } from './store';

// ─── PERMANENT TOMBSTONE ────────────────────────────────────────────────────
// These client IDs are permanently banned and must NEVER be re-imported from
// Supabase or localStorage, even if local tombstone storage is cleared.
// Add permanently deleted client IDs here (they have already been removed
// from Supabase — this is a last line of defence).
const PERMANENTLY_DELETED_CLIENT_IDS = new Set<string>([
  'fb057c0a-e1f9-4789-b8f2-c16984634261', // Kevin Pimenta (boi@gmail.com) — deleted 2026-05-27
]);
// ────────────────────────────────────────────────────────────────────────────

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
      .select('*, staff_tasks(*)');

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

    // Tombstone check for deleted clients
    const deletedRaw = localStorage.getItem('uka_deleted_client_ids');
    const deletedIds = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);

    // Tombstone check for deleted staff members
    const deletedStaffRaw = localStorage.getItem('uka_deleted_staff_ids');
    const deletedStaffIds = new Set<string>(deletedStaffRaw ? JSON.parse(deletedStaffRaw) : []);

    // Tombstones for sub-items (docs, phases, tasks) to handle offline deletes
    const deletedDocRaw = localStorage.getItem('uka_deleted_doc_ids');
    const deletedDocIds = new Set<string>(deletedDocRaw ? JSON.parse(deletedDocRaw) : []);
    
    const deletedPhaseRaw = localStorage.getItem('uka_deleted_phase_ids');
    const deletedPhaseIds = new Set<string>(deletedPhaseRaw ? JSON.parse(deletedPhaseRaw) : []);
    
    const deletedTaskRaw = localStorage.getItem('uka_deleted_task_ids');
    const deletedTaskIds = new Set<string>(deletedTaskRaw ? JSON.parse(deletedTaskRaw) : []);

    const supabaseClients: Client[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      clientId: c.client_id || '',
      clientUin: c.kyc?.clientUin || '',
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      place: c.place || '',
      address: c.address || '',
      notes: c.notes || '',
      projectName: c.project_name || '',
      projectStatus: c.project_status || 'pending',
      tilrStatus: c.tilr_status || 'pending',
      priority: c.kyc?.priority || 'medium',
      createdAt: c.created_at,
      tags: c.tags || [],
      progressChecklist: c.progress_checklist || [],
      ocChecklist: c.oc_checklist || [],
      naFolders: c.kyc?.naFolders || [],
      clientPassword: c.client_password || '',
      kyc: c.kyc || {},
      syncStatus: 'synced',
      phases: (c.phases || []).filter((p: any) => !deletedPhaseIds.has(p.id)).map((p: any) => ({
        id: p.id, name: p.name, completed: p.completed, order: p.order,
        status: p.status || (p.completed ? 'completed' : 'not-started'),
        timeBound: p.time_bound || undefined,
        startedAt: p.started_at || undefined,
        tasks: typeof p.tasks === 'string' ? JSON.parse(p.tasks) : (p.tasks || [])
      })).sort((a: any, b: any) => a.order - b.order),
      documents: (c.documents || []).filter((d: any) => !deletedDocIds.has(d.id)).map((d: any) => ({
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
      tasks: (s.staff_tasks || []).filter((t: any) => !deletedTaskIds.has(t.id)).map((t: any) => ({
        id: t.id, title: t.title, completed: t.completed,
        deadline: t.deadline || '', createdAt: t.created_at, completedAt: t.completed_at || undefined
      }))
    }));

    // ── MERGE STRATEGY: Supabase wins, deduplicate by name to prevent ghost clones ──
    const localClientsRaw = localStorage.getItem('uka_clients');
    const localStaffRaw = localStorage.getItem('uka_staff');
    const localClients: Client[] = localClientsRaw ? JSON.parse(localClientsRaw) : [];
    const localStaff: StaffMember[] = localStaffRaw ? JSON.parse(localStaffRaw) : [];

    const activeSupabaseClients = supabaseClients.filter(c => !deletedIds.has(c.id) && !PERMANENTLY_DELETED_CLIENT_IDS.has(c.id));
    // Filter out tombstoned staff from Supabase data — they must never come back
    const activeSupabaseStaff = supabaseStaff.filter(s => !deletedStaffIds.has(s.id));

    const supabaseClientIds = new Set(activeSupabaseClients.map(c => c.id));
    // For staff, deduplicate by BOTH id AND name to prevent clones
    const supabaseStaffIds = new Set(activeSupabaseStaff.map(s => s.id));
    const supabaseStaffNames = new Set(activeSupabaseStaff.map(s => s.name.toLowerCase()));

    // Clients pending push: local clients that have explicitly been marked as 'pending' syncStatus (and not deleted)
    const pendingLocalClients = localClients.filter(c => c.syncStatus === 'pending' && !deletedIds.has(c.id) && !PERMANENTLY_DELETED_CLIENT_IDS.has(c.id));
    // Staff pending push: local staff marked as 'pending' syncStatus (and not tombstoned).
    // If it's a brand new staff member (id not in supabase), prevent cloning by checking name.
    const pendingLocalStaff = localStaff.filter(s =>
      s.syncStatus === 'pending' && 
      !deletedStaffIds.has(s.id) &&
      (supabaseStaffIds.has(s.id) || !supabaseStaffNames.has(s.name.toLowerCase()))
    );

    const mergedClientsMap = new Map<string, Client>();
    activeSupabaseClients.forEach(c => mergedClientsMap.set(c.id, c));
    
    pendingLocalClients.forEach(c => {
      const existing = mergedClientsMap.get(c.id);
      if (existing) {
        // FIELD-LEVEL MERGE: Only overwrite Supabase data with fields the user explicitly edited locally
        const merged = { ...existing };
        const pending = c.pendingFields || [];
        
        pending.forEach(key => {
          (merged as any)[key] = (c as any)[key];
        });
        
        // Ensure nested KYC fields merge correctly if modified
        if (pending.includes('kyc') || pending.includes('clientUin') || pending.includes('naFolders') || pending.includes('priority')) {
          merged.kyc = { ...existing.kyc, ...c.kyc };
        }
        
        // Legacy support: preserve local priority if remote is missing
        if (c.priority && !existing.kyc?.priority && !merged.kyc?.priority) {
          merged.priority = c.priority;
        }

        // Preserve sync status so pushClientsToSupabase knows to push it
        merged.syncStatus = c.syncStatus;
        merged.pendingFields = c.pendingFields;
        
        mergedClientsMap.set(c.id, merged);
      } else {
        mergedClientsMap.set(c.id, c); // It's a brand new offline client
      }
    });

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

    // Retry deletes for any failed tombstoned sub-items
    if (deletedDocIds.size > 0) {
      deletedDocIds.forEach(async (id) => {
        try {
          const res = await supabase.from('documents').delete().eq('id', id);
          if (!res.error) {
            const currentDeletedRaw = localStorage.getItem('uka_deleted_doc_ids');
            if (currentDeletedRaw) {
              const currentDeleted: string[] = JSON.parse(currentDeletedRaw);
              localStorage.setItem('uka_deleted_doc_ids', JSON.stringify(currentDeleted.filter(d => d !== id)));
            }
          }
        } catch (err) {}
      });
    }

    if (deletedPhaseIds.size > 0) {
      deletedPhaseIds.forEach(async (id) => {
        try {
          const res = await supabase.from('phases').delete().eq('id', id);
          if (!res.error) {
            const currentDeletedRaw = localStorage.getItem('uka_deleted_phase_ids');
            if (currentDeletedRaw) {
              const currentDeleted: string[] = JSON.parse(currentDeletedRaw);
              localStorage.setItem('uka_deleted_phase_ids', JSON.stringify(currentDeleted.filter(p => p !== id)));
            }
          }
        } catch (err) {}
      });
    }

    if (deletedTaskIds.size > 0) {
      deletedTaskIds.forEach(async (id) => {
        try {
          const res = await supabase.from('staff_tasks').delete().eq('id', id);
          if (!res.error) {
            const currentDeletedRaw = localStorage.getItem('uka_deleted_task_ids');
            if (currentDeletedRaw) {
              const currentDeleted: string[] = JSON.parse(currentDeletedRaw);
              localStorage.setItem('uka_deleted_task_ids', JSON.stringify(currentDeleted.filter(t => t !== id)));
            }
          }
        } catch (err) {}
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
        timeBound: a.time_bound || null,
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

// Helper to prevent overwriting Supabase fields with local stripped placeholders.
// It merges the real base64 string from the remote database back into the local object before upserting.
function restoreStrippedBase64(localData: any, remoteData: any): any {
  if (localData === '[BASE64_STRIPPED]') {
    return remoteData; // Restore the real string from Supabase
  }
  if (Array.isArray(localData)) {
    return localData.map((item, idx) => 
      restoreStrippedBase64(item, Array.isArray(remoteData) ? remoteData[idx] : undefined)
    );
  }
  if (localData && typeof localData === 'object') {
    const restored: any = {};
    for (const key in localData) {
      if (Object.prototype.hasOwnProperty.call(localData, key)) {
        restored[key] = restoreStrippedBase64(localData[key], remoteData ? remoteData[key] : undefined);
      }
    }
    return restored;
  }
  return localData;
}

// ─── SYNC UP (LocalStorage -> Supabase) ────────────────────────────────────
export async function pushClientsToSupabase(clients: Client[]) {
  if (!clients || clients.length === 0) return;

  // 1. Fetch the FULL existing data from Supabase to prevent overwriting with stale local data
  const clientIds = clients.map(c => c.id);
  const { data: existingClients } = await supabase
    .from('clients')
    .select('*')
    .in('id', clientIds);
    
  const existingMap = new Map(existingClients?.map(c => [c.id, c]) || []);

  const clientRows = clients.map(c => {
    const remoteClient = existingMap.get(c.id);
    const remoteKyc = remoteClient?.kyc || {};
    
    const kycWithUin = {
      ...(c.kyc || {}),
      clientUin: c.clientUin || '',
      naFolders: c.naFolders || [],
      priority: c.priority || 'medium'
    };
    const safeKyc = restoreStrippedBase64(kycWithUin, remoteKyc);

    const pending = c.pendingFields || [];
    const hasPending = pending.length > 0;
    
    // Helper to decide whether to use local value or preserve remote master value
    const val = (localKey: keyof Client, remoteKey: string, localValue: any) => {
      if (!remoteClient) return localValue; // New client — no remote to preserve
      if (!hasPending) return remoteClient[remoteKey] ?? localValue; // No pendingFields → preserve remote, fallback to local only if remote is null
      if (pending.includes(localKey)) return localValue; // Field was explicitly edited locally
      return remoteClient[remoteKey]; // Preserve master database value
    };

    let finalKyc = safeKyc || {};
    if (remoteClient) {
       // Only push local KYC if it or its nested fields were explicitly edited
       if (!hasPending || (!pending.includes('kyc') && !pending.includes('clientUin') && !pending.includes('naFolders') && !pending.includes('priority'))) {
         finalKyc = remoteKyc;
       }
    }

    return {
      id: c.id,
      client_id: val('clientId', 'client_id', c.clientId || null),
      name: val('name', 'name', c.name),
      company: val('company', 'company', c.company),
      email: val('email', 'email', c.email),
      phone: val('phone', 'phone', c.phone),
      place: val('place', 'place', c.place),
      address: val('address', 'address', c.address),
      notes: val('notes', 'notes', c.notes),
      project_name: val('projectName', 'project_name', c.projectName),
      project_status: val('projectStatus', 'project_status', c.projectStatus),
      tilr_status: val('tilrStatus', 'tilr_status', c.tilrStatus || 'pending'),
      created_at: c.createdAt,
      tags: val('tags', 'tags', c.tags),
      progress_checklist: val('progressChecklist', 'progress_checklist', c.progressChecklist || []),
      oc_checklist: val('ocChecklist', 'oc_checklist', c.ocChecklist || []),
      client_password: val('clientPassword', 'client_password', c.clientPassword || null),
      kyc: finalKyc
    };
  });

  const phaseRows: any[] = [];
  const docRows: any[] = [];

  clients.forEach(c => {
    const pending = c.pendingFields || [];
    const hasPending = pending.length > 0;

    // Only push phases if they were explicitly edited — skip when no pendingFields
    // to avoid overwriting fresh Supabase data with stale local phases
    if (hasPending && pending.includes('phases')) {
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
    }

    // Load document tombstone — IDs that were explicitly deleted and must never be re-pushed
    const deletedDocRaw = typeof window !== 'undefined' ? localStorage.getItem('uka_deleted_doc_ids') : null;
    const deletedDocIds = new Set<string>(deletedDocRaw ? JSON.parse(deletedDocRaw) : []);

    // Only push documents if they were explicitly edited — skip when no pendingFields
    // to avoid overwriting fresh Supabase data with stale local documents
    if (hasPending && pending.includes('documents')) {
      c.documents.forEach(d => {
        if (deletedDocIds.has(d.id)) return; // Skip tombstoned (deleted) docs
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
    }
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
      const updated = local.map(c => 
        pushedIds.has(c.id) 
          ? { ...c, syncStatus: 'synced' as const, pendingFields: undefined } 
          : c
      );
      localStorage.setItem('uka_clients', JSON.stringify(updated));
    }
  }

  // ─── Orphan Phase Cleanup ────────────────────────────────────────────────
  // Safely remove phases that no longer exist in local state, but ONLY for
  // clients whose phases were actually part of this push.
  const clientIdsWithPhasesPushed = clients
    .filter(c => {
      const pending = c.pendingFields || [];
      const hasPending = pending.length > 0;
      return hasPending && pending.includes('phases');
    })
    .map(c => c.id);

  if (clientIdsWithPhasesPushed.length > 0) {
    const currentPhaseIds = phaseRows.map(p => p.id);
    if (currentPhaseIds.length > 0) {
      await supabase.from('phases').delete().in('client_id', clientIdsWithPhasesPushed).not('id', 'in', `(${currentPhaseIds.join(',')})`);
    }
    // If currentPhaseIds is empty, do NOT delete phases — client may not have loaded them yet.
  }

  // ─── Documents: NEVER auto-delete ───────────────────────────────────────
  // Documents are NEVER auto-cleaned here. They are only removed when the user
  // explicitly deletes a file via the UI. Auto-deleting based on local state
  // is DANGEROUS because localStorage strips large Base64 URLs
  // (stripLargeBase64), making it appear as if uploaded files don't exist,
  // which previously caused ALL documents to be wiped from Supabase on every sync.
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

  staff.forEach(s => {
    s.tasks.forEach(t => {
      taskRows.push({
        id: t.id, staff_id: s.id, title: t.title, completed: t.completed,
        deadline: t.deadline || null, created_at: t.createdAt, completed_at: t.completedAt || null
      });
    });
  });

  const { error } = await supabase.from('staff').upsert(staffRows);
  if (error) { console.error('pushStaffToSupabase error:', error.message); return; }
  
  if (taskRows.length > 0) await supabase.from('staff_tasks').upsert(taskRows);

  // Clean up orphans — but ONLY delete tasks that were explicitly removed locally.
  // A staff member's local cache may be stale (missing tasks added by admin on another device).
  // Blindly deleting "orphans" would wipe real tasks. So we skip orphan cleanup entirely
  // for staff members whose task list might be stale. The upsert above already adds/updates
  // the tasks that ARE present locally; missing remote tasks are left untouched.
  // Task deletion is handled directly in the UI delete handler, not here.

  // Update local storage to mark successfully pushed staff as 'synced'
  if (typeof window !== 'undefined') {
    const localRaw = localStorage.getItem('uka_staff');
    if (localRaw) {
      const local: StaffMember[] = JSON.parse(localRaw);
      const pushedIds = new Set(staff.map(s => s.id));
      const updated = local.map(s => pushedIds.has(s.id) ? { ...s, syncStatus: 'synced' as const } : s);
      localStorage.setItem('uka_staff', JSON.stringify(updated));
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
