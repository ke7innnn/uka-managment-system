// ─── Types ────────────────────────────────────────────────────────────────────
import { pushClientsToSupabase, pushStaffToSupabase } from './supabaseSync';

export interface Phase {
  id: string;
  name: string;
  completed: boolean;
  order: number;
}

export interface Document {
  id: string;
  name: string;
  url: string;           // data URL or external URL
  uploadedAt: string;
  type: string;          // MIME or label
  size?: number;
  uploadedBy?: string;
  folder?: string;       // NEW: folder ID or name
  subfolder?: string;    // NEW: subfolder ID or name
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  place?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  phases: Phase[];
  documents: Document[];
  projectName?: string;
  projectStatus: 'active' | 'completed' | 'on-hold' | 'pending';
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'uka_clients';

export function getClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveClients(clients: Client[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  // Background sync to Supabase (non-blocking)
  pushClientsToSupabase(clients).catch(console.error);
}

export function getClientById(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function addClient(data: Omit<Client, 'id' | 'createdAt'>): Client {
  const clients = getClients();
  const client: Client = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  clients.push(client);
  saveClients(clients);
  return client;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  clients[idx] = { ...clients[idx], ...data };
  saveClients(clients);
  return clients[idx];
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  // Save locally first
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  // Delete from Supabase in background
  import('./supabase').then(({ supabase }) => {
    supabase.from('phases').delete().eq('client_id', id).then(() => {});
    supabase.from('documents').delete().eq('client_id', id).then(() => {});
    supabase.from('clients').delete().eq('id', id).then(() => {});
  }).catch(console.error);
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('uka_admin_auth') === 'true';
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('uka_admin_auth');
}

// ─── Staff Types ───────────────────────────────────────────────────────────────

export interface StaffTask {
  id: string;
  title: string;
  completed: boolean;
  deadline: string;      // ISO date string
  createdAt: string;
  completedAt?: string;  // ISO date string when marked done
}

export interface AttendanceLog {
  id: string;
  date: string;          // YYYY-MM-DD
  checkIn: string;       // HH:MM
  checkOut?: string;     // HH:MM
  location?: string;     // "lat,lng" or freetext
  locationLabel?: string;// human readable
  hoursWorked?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  password?: string;
  email?: string;
  phone?: string;
  department?: string;
  joinedAt: string;
  totalTasksTarget: number;       // e.g. 65
  tasks: StaffTask[];
  attendance: AttendanceLog[];
  workDeadline?: string;          // ISO date - overall project deadline
  notes?: string;
  profilePicture?: string;        // data URL
}

// ─── Staff helpers ─────────────────────────────────────────────────────────────

const STAFF_KEY = 'uka_staff';

export function getStaff(): StaffMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    let staff = raw ? JSON.parse(raw) : [];
    
    // ── Migrate any old non-UUID IDs and reset hardcoded task targets to 0 ──
    let migrated = false;
    staff = staff.map((s: StaffMember) => {
      let needsSave = false;
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s.id)) {
        needsSave = true;
        s.id = crypto.randomUUID();
      }
      // Reset dummy targets (50 or 10) back to 0
      if (s.totalTasksTarget === 50 || s.totalTasksTarget === 10) {
        needsSave = true;
        s.totalTasksTarget = 0;
      }
      if (needsSave) migrated = true;
      return s;
    });
    if (migrated) {
      localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    }

    // Auto-initialize if empty — ONLY if Supabase hasn't synced yet on this device.
    // If Supabase has synced, staff come from there. Seeding here would create clones.
    if (staff.length === 0 && !localStorage.getItem('uka_supabase_synced')) {
      const initial = [
        { name: "Vrushali Thakur", phone: "9518508458" },
        { name: "Uzaid Khan", phone: "7775815503" },
        { name: "Ganesh Kadam", phone: "8169512997" },
        { name: "Crystal Nadar", phone: "9029447998" },
        { name: "Nihal Gharat", phone: "9028662975" },
        { name: "Vijay Palkar", phone: "9920967948" },
        { name: "Jayesh Jadhav", phone: "9920159887" },
        { name: "Sadhana Kanojiya", phone: "9834528066" },
        { name: "Alpesh Bari", phone: "9823924007" },
        { name: "Uday Arekar", phone: "9028722254" },
      ];
      
      staff = initial.map(s => ({
        id: crypto.randomUUID(),
        name: s.name,
        role: "Staff",
        password: s.phone,
        phone: s.phone,
        joinedAt: new Date().toISOString(),
        totalTasksTarget: 0,
        tasks: [],
        attendance: []
      }));
      localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    }
    
    return staff;
  } catch { return []; }
}


export function isStaffAuthenticated(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('uka_staff_auth');
}

export function logoutStaff(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('uka_staff_auth');
}

export function saveStaff(staff: StaffMember[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  // Background sync to Supabase (non-blocking)
  pushStaffToSupabase(staff).catch(console.error);
}

export function getStaffById(id: string): StaffMember | undefined {
  return getStaff().find((s) => s.id === id);
}

export function addStaffMember(data: Omit<StaffMember, 'id' | 'joinedAt'>): StaffMember {
  const staff = getStaff();
  const member: StaffMember = {
    ...data,
    id: crypto.randomUUID(),
    joinedAt: new Date().toISOString(),
  };
  staff.push(member);
  saveStaff(staff);
  return member;
}

export function updateStaffMember(id: string, data: Partial<StaffMember>): StaffMember | undefined {
  const staff = getStaff();
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  staff[idx] = { ...staff[idx], ...data };
  saveStaff(staff);
  return staff[idx];
}

export function deleteStaffMember(id: string): void {
  const staff = getStaff().filter((s) => s.id !== id);
  if (typeof window !== 'undefined') localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  // Delete from Supabase in background
  import('./supabase').then(({ supabase }) => {
    supabase.from('staff_tasks').delete().eq('staff_id', id).then(() => {});
    supabase.from('attendance_logs').delete().eq('staff_id', id).then(() => {});
    supabase.from('staff').delete().eq('id', id).then(() => {});
  }).catch(console.error);
}

// ─── Staff performance helpers ─────────────────────────────────────────────────

/** 0-100 completion percentage based on assigned tasks */
export function staffCompletionPct(member: StaffMember): number {
  const total = member.tasks.length;
  if (total === 0) return 0;
  const done = member.tasks.filter((t) => t.completed).length;
  return Math.min(100, Math.round((done / total) * 100));
}

/** green | yellow | red */
export function staffStatusColor(member: StaffMember): 'green' | 'yellow' | 'red' {
  if (member.tasks.length === 0) return 'green'; // No work assigned = On Track
  const pct = staffCompletionPct(member);
  if (pct >= 80) return 'green';
  if (pct >= 40) return 'yellow';
  return 'red';
}

/** Safely open data URLs in a new tab without being blocked by browser security */
export function viewDocumentSafe(dataUrl: string) {
  try {
    if (!dataUrl.startsWith('data:')) {
      window.open(dataUrl, '_blank');
      return;
    }
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      window.open(dataUrl, '_blank');
      return;
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (e) {
    console.error("Failed to view document", e);
    window.open(dataUrl, '_blank');
  }
}

export function totalHoursWorked(member: StaffMember): number {
  return member.attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);
}

// ─── Workspace Chat ────────────────────────────────────────────────────────────

export interface WorkspaceMessage {
  id: string;
  senderId: string; // 'admin' or staff.id
  senderName: string;
  senderRole: string; // 'Admin', or staff role
  content: string;
  createdAt: string; // ISO string
}

const WORKSPACE_KEY = 'uka_workspace_messages';

export function cleanOldWorkspaceMessages(messages: WorkspaceMessage[]): WorkspaceMessage[] {
  // Delete messages older than 3 days (72 hours)
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  return messages.filter(m => new Date(m.createdAt).getTime() > threeDaysAgo);
}

export function getWorkspaceMessages(): WorkspaceMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    const messages: WorkspaceMessage[] = raw ? JSON.parse(raw) : [];
    const cleaned = cleanOldWorkspaceMessages(messages);
    if (cleaned.length < messages.length) {
      saveWorkspaceMessages(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveWorkspaceMessages(messages: WorkspaceMessage[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(messages));
  // Background sync to Supabase (non-blocking)
  import('./supabaseSync').then(({ pushWorkspaceToSupabase }) => {
    if (pushWorkspaceToSupabase) pushWorkspaceToSupabase(messages).catch(console.error);
  }).catch(() => {});
}

export function addWorkspaceMessage(senderId: string, senderName: string, senderRole: string, content: string): WorkspaceMessage {
  const messages = getWorkspaceMessages();
  const msg: WorkspaceMessage = {
    id: crypto.randomUUID(),
    senderId,
    senderName,
    senderRole,
    content,
    createdAt: new Date().toISOString()
  };
  messages.push(msg);
  saveWorkspaceMessages(messages);
  return msg;
}

export function getWorkspaceLastRead(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('uka_workspace_last_read') || '';
}

export function setWorkspaceLastRead(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('uka_workspace_last_read', new Date().toISOString());
  // Dispatch event so sidebars immediately clear their badges
  window.dispatchEvent(new Event('uka-workspace-read-complete'));
}

export function getUnreadWorkspaceCount(currentUserId: string): number {
  const lastRead = getWorkspaceLastRead();
  if (!lastRead) {
    return getWorkspaceMessages().filter(m => m.senderId !== currentUserId).length;
  }
  const lastReadTime = new Date(lastRead).getTime();
  return getWorkspaceMessages().filter(m => 
    m.senderId !== currentUserId && new Date(m.createdAt).getTime() > lastReadTime
  ).length;
}


