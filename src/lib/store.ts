// ─── Types ────────────────────────────────────────────────────────────────────
import { pushClientsToSupabase, pushStaffToSupabase } from './supabaseSync';

export interface PhaseTask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string; // Staff ID or Name
}

export interface Phase {
  id: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'completed';
  timeBound?: string;
  startedAt?: string;
  order: number;
  tasks: PhaseTask[];
  completed?: boolean; // legacy support
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

export interface KycData {
  proposedSub?: string;
  proposedDevelopment?: string; // RESIDENTIAL CUM SHOPLINE / COMMERCIAL / RESIDENTIAL / INDUSTRIAL
  landBearingSno?: string;
  landBearingPlotNo?: string;
  landBearingVillage?: string;
  landBearingTal?: string;
  landBearingDist?: string;
  scheme?: string; // REGULAR PERMISSION / EWS LIG SCHEME / SRA / CLUSTER SCHEME
  permissionType?: string; // CC / RDP / OC / EC / FIRE
  ownerType?: string; // MULTIPLE OWNER / PARTNERSHIP / PROPRIETOR / LLP / INDIVIDUAL
  applicantName?: string;
  companyOwnerType?: string; // FOR COMPANY: MULTIPLE OWNER / PARTNERSHIP / PROPRIETOR / LLP / INDIVIDUAL
  companyPanCard?: string;
  gstNoCertificate?: string;
  memberAadharCard?: string;
  memberPanCard?: string;
  memberMobileNo?: string;
  authorisedPersonEmail?: string;
  requiredDigitalSignature?: string; // YES / NO
  officeAdd?: string;
  siteAdd?: string;
  northPhoto?: string;
  northDetails?: string;
  southPhoto?: string;
  southDetails?: string;
  eastPhoto?: string;
  eastDetails?: string;
  westPhoto?: string;
  westDetails?: string;
  road?: string;
  roadDetails?: string;
  side?: string;
  sideDetails?: string;
  sNo?: string;
  hNo?: string;
  village?: string;
  tal?: string;
  siteAddSecondary?: string;
  projectNameSecondary?: string;
  geoCoordinates?: string;
  emailIdSecondary?: string;
  whetherOpenPlot?: string;
  siteEng?: string;
  regulations?: string;
  siteSupervisor?: string;
  anyOther?: string;
  contactNo?: string;
  use?: string;
  noOfBldgs?: string;
  floor?: string;
  subSecondary?: string;
  pLine?: string;
  architect?: string;
  structuralEngName?: string;
  isDigitalSignature?: string;
  digitalSignaturePhoto?: string;
}

export interface Client {
  id: string;
  clientId?: string;      // Custom user-facing Client ID (e.g. UKA-101)
  clientPassword?: string;
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
  priority?: 'low' | 'medium' | 'high';
  progressChecklist?: string[];
  syncStatus?: 'pending' | 'synced';
  ocChecklist?: string[];
  kyc?: KycData;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'uka_clients';

export function getClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const clients: Client[] = raw ? JSON.parse(raw) : [];
    // Data Migration for old Phase objects
    return clients.map(client => ({
      ...client,
      phases: client.phases.map(p => ({
        ...p,
        status: p.status || (p.completed ? 'completed' : 'not-started'),
        tasks: p.tasks || []
      }))
    }));
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

export const DEFAULT_PHASES_TEMPLATE = [
  {
    name: "Stage 1 — File Preparation",
    status: "not-started" as const,
    tasks: [
      // Sadhana & Uzaid — 2 Working Days together
      { title: "Filing with sticker and basic papers — 7/12, physical survey with surroundings and gutbook superimposed for D.P, gutbook, site photos, KYC questionnaire, Architect Appointment Letter", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Give entire paperwork checklist of approval to client", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Upload project on website", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Give it Office UIN and form WhatsApp group", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Send summarized auto prompt to client and boss on group", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      // Vijay & Uzaid — 3 Working Days together
      { title: "Upload basic plot on DP marking, CRZ, Wetland, Eco Sensitive Zone Corridor, Heritage, KMZ images on website and give remark", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Check whether additional NOCs required (Forest, Railway, Environmental Clearance, Highway Access, etc.) and mention remark accordingly", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Place order for 2 sets of TILR/NOCs — mention date and whether client is doing it or responsible person's name", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Place order for 2 sets of all revenue papers — mention date, whether client is doing it or responsible person's name", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Send summarized auto prompt to document provider, client and boss on group", assignedTo: "Vijay Palkar & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 2 — Paper Procurement",
    status: "not-started" as const,
    tasks: [
      // Sadhana & Uzaid — 5 Working Days
      { title: "Prepare 1 office file copy and 1 VVCMC file copy", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Complete balance typing as per entire checklist", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Finalise the file and upload on web", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Forward to Vrushali Madam for online inward", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Forward to Vijay Sir for Legal and Tree NOC (1 set VVCMC hard copy)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Fast track TILR with client", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Produce rough challan estimate", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Send summarized auto prompt to client and boss on group", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      // Vrushali — upon forwarding
      { title: "Receive file forwarded for online inward", assignedTo: "Vrushali Thakur" },
      { title: "Process online inward of the file", assignedTo: "Vrushali Thakur" }
    ]
  },
  {
    name: "Stage 3 — Legal / Tree NOC",
    status: "not-started" as const,
    tasks: [
      // Vijay Palkar — 21 Working Days
      { title: "Mention compliances of legal department and tree department scrutiny periodically", assignedTo: "Vijay Palkar" },
      { title: "Confirm and upload final TILR document on web", assignedTo: "Vijay Palkar" },
      { title: "Upload final legal and tree NOC signed noting", assignedTo: "Vijay Palkar" },
      { title: "Upload DP marking", assignedTo: "Vijay Palkar" },
      // Uzaid & Vrushali — 14 Days upon receipt of TILR and plans from Uday
      { title: "Prepare and upload offline drawing", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "Ready online clear report and drawing and upload", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "Complete final offline docket as per checklist", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "Any issues/clarifications to be mentioned to Nihal on live chat window (no verbal communication)", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      // Uzaid only
      { title: "Ensure Nihal acknowledges offline docket receipt", assignedTo: "Uzaid Khan" },
      { title: "Ensure file is inwarded and covering letter with online/offline number is uploaded on site", assignedTo: "Uzaid Khan" },
      // Nihal Gharat — upon receipt of offline docket
      { title: "Acknowledge that offline docket has been successfully received", assignedTo: "Nihal Gharat" },
      { title: "Ensure that file is inwarded", assignedTo: "Nihal Gharat" },
      { title: "Upload covering letter with online/offline number identification on the site", assignedTo: "Nihal Gharat" },
      // Uday Arekar — 2 Days
      { title: "Attach final signed drawing from client on site for further drafting by Vrushali Madam", assignedTo: "Uday Arekar" },
      // Crystal Nadar — 4 Days
      { title: "Attach service drawings and EE report", assignedTo: "Crystal Nadar" }
    ]
  },
  {
    name: "Stage 3 — Upon Obtaining Permission",
    status: "not-started" as const,
    tasks: [
      // Uzaid Khan
      { title: "Update the master file sheet", assignedTo: "Uzaid Khan" },
      { title: "Upload all scanning of orders and blueprints", assignedTo: "Uzaid Khan" },
      { title: "Forward to Crystal for Rera letters / On-site handling", assignedTo: "Uzaid Khan" },
      // Vrushali Thakur
      { title: "Update the master file sheet", assignedTo: "Vrushali Thakur" },
      { title: "Upload all scanning of orders and blueprints", assignedTo: "Vrushali Thakur" },
      { title: "Handle Rera letters / On-site handling (forwarded from Uzaid)", assignedTo: "Vrushali Thakur" },
      // Crystal Nadar
      { title: "Handle Rera letters", assignedTo: "Crystal Nadar" },
      { title: "On-site handling", assignedTo: "Crystal Nadar" },
      // Ganesh Kadam — within 2 days from online permission
      { title: "Provide images of notings upon issue of online permission", assignedTo: "Ganesh Kadam" }
    ]
  }
];

export function addClient(data: Omit<Client, 'id' | 'createdAt'>): Client {
  const clients = getClients();
  const client: Client = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    priority: data.priority || 'medium',
    syncStatus: 'pending',
    phases: data.phases && data.phases.length > 0 ? data.phases : DEFAULT_PHASES_TEMPLATE.map((stage, idx) => ({
      id: crypto.randomUUID(),
      name: stage.name,
      status: stage.status,
      order: idx,
      tasks: stage.tasks.map(t => ({
        id: crypto.randomUUID(),
        title: t.title,
        completed: false,
        assignedTo: t.assignedTo
      }))
    }))
  };
  clients.push(client);
  saveClients(clients);
  return client;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  clients[idx] = { ...clients[idx], ...data, syncStatus: 'pending' };
  saveClients(clients);
  return clients[idx];
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  // Save locally first
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  // Delete from Supabase in background
  import('./supabase').then(({ supabase }) => {
    supabase.from('phases').delete().eq('client_id', id).then(({ error }) => {
      if (error) console.error('Delete phases error:', error.message);
    });
    supabase.from('documents').delete().eq('client_id', id).then(({ error }) => {
      if (error) console.error('Delete documents error:', error.message);
    });
    supabase.from('clients').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Delete clients error:', error.message);
    });
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

// ─── Performance Alerts ────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';

export interface PerformanceAlert {
  id: string;
  clientId: string;
  clientName: string;
  stageName: string;
  assignedTo: string;        // staff name(s), e.g. "Sadhana Kanojiya & Uzaid Khan"
  pendingTasks: string[];    // list of task titles still pending
  timeBound?: string;        // YYYY-MM-DD deadline
  severity: AlertSeverity;
  templateKey: string;       // 'stage-start' | 'day-1-light' | 'day-2-moderate' | 'day-3-warning' | 'deadline-breach' | 'repeat-harsh'
  message: string;
  createdAt: string;         // ISO string
  readBy: string[];          // list of userIds who have read it
}

const ALERTS_KEY = 'uka_performance_alerts';

export function getAlerts(): PerformanceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveAlerts(alerts: PerformanceAlert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function addAlert(alert: Omit<PerformanceAlert, 'id' | 'createdAt' | 'readBy'>): PerformanceAlert {
  const alerts = getAlerts();
  const newAlert: PerformanceAlert = {
    ...alert,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    readBy: []
  };
  alerts.push(newAlert);
  saveAlerts(alerts);
  return newAlert;
}

export function markAlertRead(alertId: string, userId: string): void {
  const alerts = getAlerts().map(a =>
    a.id === alertId && !a.readBy.includes(userId)
      ? { ...a, readBy: [...a.readBy, userId] }
      : a
  );
  saveAlerts(alerts);
}

export function getAlertsForUser(staffName: string): PerformanceAlert[] {
  return getAlerts().filter(a =>
    a.assignedTo.toLowerCase().includes(staffName.toLowerCase()) || staffName === 'admin'
  );
}

export function getUnreadAlertsCount(staffNameOrAdmin: string): number {
  const userId = staffNameOrAdmin;
  return getAlertsForUser(staffNameOrAdmin).filter(a => !a.readBy.includes(userId)).length;
}

export const PROGRESS_CHECKLIST_ITEMS = [
  { id: "1", label: "7/12 EXTRACT / PROPERTY CARD" },
  { id: "2", label: "ALL 6/12 MUTATIONS AS PER 7/12 & PIKPANI EXTRACT" },
  { id: "3", label: "PIKPANI (1952 TILL DATE)" },
  { id: "4", label: "8A EXTRACT" },
  { id: "5", label: "ADVOCATE TITLE SEARCH REPORT FROM 1952 TILL DATE WITH RECEIPT (NO CLAIMS ON LAND TITLE & POSSESSION AFTER ISSUING PAPER NOTICE)" },
  { id: "6", label: "SALE PERMISSION IF APPLICABLE" },
  { id: "7", label: "NA ORDER / LAND CONVERSION WITH RECEIPT" },
  { id: "8", label: "GAON NAKASHA" },
  { id: "9", label: "GAVTHAN CERTIFICATION (IF APPLICABLE)" },
  { id: "10", label: "PHYSICAL & LEVEL SURVEY WITH 100MT SURROUNDING" },
  { id: "11", label: "GOOGLE LOCATION & SITE PHOTOS" },
  { id: "12", label: "COPY OF LATEST RR RATE" },
  { id: "13", label: "GUTBOOK, TILR MAP WITH RECEIPT / CTS SKETCH WITH RECEIPT" },
  { id: "14", label: "SOCIETY REGISTRATION CERTIFICATE" },
  { id: "15", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH GHARPATTI, ASSESSMENT, SHARE CERTIFICATE, LIGHT BILL, PAN CARDS, AADHAR CARDS" },
  { id: "16", label: "LIST OF ALL MEMBERS WITH FLATS NUMBERS & AREAS STAMPED & SIGNED BY CHAIRMAN, SECRETARY" },
  { id: "17", label: "SECTION 79 A REDEVELOPMENT RESOLUTION OF SOC" },
  { id: "18", label: "SECTION 79 A SUB REGISTER NOC" },
  { id: "19", label: "SOCIETY RESOLUTION FOR CHAIRMAN, SECRETARY APPOINTMENT" },
  { id: "20", label: "DILAPIDATED NOTICE FROM VVCMC (C1 NOTICE)" },
  { id: "21", label: "DEV. AGREEMENT & POWER (REGISTERED)" },
  { id: "22", label: "PARTNERSHIP DEED / SIGNING AUTHORIZATION OF FIRM (REGISTERED) / PVT. LTD. FIRM" },
  { id: "23", label: "FIRM PAN CARD" },
  { id: "24", label: "NO DUES LETTER FROM VVCMC WARD OFFICE FOR REDEVELOPMENT PROPOSAL" },
  { id: "25", label: "OLD APPROVAL" },
  { id: "26", label: "AS BUILT FLOOR & ROOM SIZE SURVEY" },
  { id: "27", label: "RESOLUTION FOR JOINT SOCIETY" },
  { id: "28", label: "ALL AFFIDAVIT: SIGN/PHOTO IS REMAINING" },
  { id: "29", label: "SOCIETY RESOLUTION FOR CHAIRMAN, SECRETARY AUTHORIZATION TO SIGN THE D.A/P.O.A" },
  { id: "30", label: "ALL XEROX PAPER TRUE COPY" },
  { id: "31", label: "APPOINTMENT LETTER OF ARCHITECT IN FAVOUR OF UMESH KEKRE & ASSOCIATES" },
  { id: "32", label: "500 ₹ STAMP PAPERS (16 TYPES: SITE ENGINEER, ADJOINING FLAT, INDEMNITY BOND, SEWAGE, TENANT BAND PATR, UNDERTAKING 100, PRATIDNYA-PATRA 7/12, TREE PRATIDNYA, BAND-PATRA, GREEN ZONE, EWS)" },
  { id: "33", label: "ZONE REMARK" },
  { id: "34", label: "CLIENT PHOTOS" },
  { id: "35", label: "CLIENT KYC" },
  { id: "36", label: "CLIENT ID / PASSWORD" },
  { id: "37", label: "CLIENT DIGITAL SIGNATURE (DSC)" },
  { id: "38", label: "OTP BASED CLIENT MOBILE NUMBER" },
  { id: "39", label: "PERMISSION TYPE (CC / RDP / OC)" },
  { id: "40", label: "SCHEME (REDEVELOPMENT / EWS)" },
  { id: "41", label: "APPENDIX - A1" },
  { id: "42", label: "APPENDIX - B" },
  { id: "43", label: "RAILWAY NOC (IF REQUIRED)" },
  { id: "44", label: "ARCHITECT APPOINTMENT / ENGINEER APPOINTMENT" },
  { id: "45", label: "STRUCTURAL APPOINTMENT" },
  { id: "46", label: "STRUCTURAL STABILITY" },
  { id: "47", label: "RECEIPT" },
  { id: "48", label: "EE REPORT" },
  { id: "49", label: "DP" },
  { id: "50", label: "PROVISIONAL TREE NOC" },
  { id: "51", label: "PROVISIONAL FIRE NOC" },
  { id: "52", label: "LEVEL SURVEY" },
  { id: "53", label: "PHYSICAL SURVEY" },
  { id: "54", label: "REPORT & DRAWING" },
  { id: "55", label: "BLUE BOARD" },
  { id: "56", label: "HARDSHIP REPORT" },
  { id: "57", label: "LAYOUT" },
  { id: "58", label: "ANY SPECIFIC NOC IF APPLICABLE" },
  { id: "59", label: "WORK STATUS REPORT" },
  { id: "60", label: "MOEF CLEARANCE" },
  { id: "61", label: "COPY OF LATEST RR RATE (CC/RDP)" },
  { id: "62", label: "RIGHT OF WAY REGISTERED AGREEMENT" },
  { id: "63", label: "EC DRAWING WITH NOC" },
  { id: "64", label: "TDR UTILISATION FORM" }
];

export const OC_CHECKLIST_ITEMS = [
  // MANDATORY
  { id: "1", label: "APPENDIX G", type: "mandatory" },
  { id: "2", label: "COMPLETION DRAWING", type: "mandatory" },
  { id: "3", label: "RCC STABILITY CERTIFICATE FROM STRUCTURAL ENGINEER", type: "mandatory" },
  { id: "4", label: "STRUCTURAL DESIGN ADEQUACY (CERTIFICATE AS PER APPENDIX C-4.3)", type: "mandatory" },
  { id: "5", label: "NOC FROM FIRE DEPARTMENT FOR OCCUPATION", type: "mandatory" },
  { id: "6", label: "NOC FROM WATER SUPPLY DEPARTMENT", type: "mandatory" },
  { id: "7", label: "COMPLETION CERTIFICATE FOR SEWAGE TREATMENT PLANT (STP) FROM DRAINAGE DEPARTMENT", type: "mandatory" },
  { id: "8", label: "ENCROACHMENT DEPARTMENT NOC", type: "mandatory" },
  { id: "9", label: "NOC FROM TREE AUTHORITY", type: "mandatory" },
  { id: "10", label: "TAX NOC", type: "mandatory" },
  { id: "11", label: "LIFT NOC", type: "mandatory" },
  { id: "12", label: "COMPLETION CERTIFICATE NOC FROM STORM WATER DEPARTMENT", type: "mandatory" },

  // OPTIONAL
  { id: "13", label: "APPENDIX – J FOR OCCUPANCY (INDEMNITY BOND)", type: "optional" },
  { id: "14", label: "SOLAR WATER HEATING SYSTEM COMPLETION CERTIFICATE / PHOTOGRAPHS", type: "optional" },
  { id: "15", label: "RAIN WATER HARVESTING SYSTEM COMPLETION CERTIFICATE / PHOTOGRAPHS", type: "optional" },
  { id: "16", label: "ORGANIC WATER DISPOSAL SYSTEM COMPLETION CERTIFICATE / PHOTOGRAPHS", type: "optional" },
  { id: "17", label: "CCTV SYSTEM COMPLETION CERTIFICATE / PHOTOGRAPHS", type: "optional" },
  { id: "18", label: "HANDOVER RECEIPT OF BUILT-UP AMENITY / INCLUSIVE HOUSING TENEMENTS", type: "optional" },
  { id: "19", label: "CERTIFICATE FROM ARCHITECT REGARDING NO. OF PARKINGS REQUIRED FOR THE PROPOSED BUILDING AND AVAILABLE AS PER BUILT PLAN", type: "optional" },
  { id: "20", label: "CONSENT TO OPERATE FROM MPCB (POLLUTION CONTROL BOARD NOC)", type: "optional" }
];

export const DOCUMENT_FOLDERS = [
  { id: '1', name: "Revenue", code: "REV", subfolders: [
    { id: "1a", code: "1.A", name: "7/12 Extract / Property Card" },
    { id: "1b", code: "1.B", name: "6/12 Extracts" },
    { id: "1c", code: "1.C", name: "Pikpahani Extracts" },
    { id: "1d", code: "1.D", name: "8A Extract" },
    { id: "1e", code: "1.E", name: "Advocate Reports" },
    { id: "1f", code: "1.F", name: "Others" }
  ]},
  { id: '2', name: "VVCMC Bonds & Forms", code: "VBF", subfolders: [
    { id: "2a", code: "2.1", name: "REGARDING APPOINTMENT OF SITE ENGINEER. (500 STAMP)" },
    { id: "2b", code: "2.2", name: "ADJOINING FLAT AFFIDAVIT. (500 STAMP) - IF REQUIRED" },
    { id: "2c", code: "2.3", name: "AFFIDAVIT 1. (500 STAMP)" },
    { id: "2d", code: "2.4", name: "BALANCE PAPER AFFIDAVIT. (500 STAMP)" },
    { id: "2e", code: "2.5", name: "DECLARATION. (500 STAMP)" },
    { id: "2f", code: "2.6", name: "INDEMNITY BOND. (500 STAMP)" },
    { id: "2g", code: "2.7", name: "OP AFFIDAVIT. (500 STAMP)" },
    { id: "2h", code: "2.8", name: "SELF DECLARATION. (500 STAMP) - IF REQUIRED" },
    { id: "2i", code: "2.9", name: "SEWAGE DISPOSAL. (500 STAMP)" },
    { id: "2j", code: "2.10", name: "TENENT BAND PATR. (500 STAMP)" },
    { id: "2k", code: "2.11", name: "UNDERTAKING 100 STAMP PAPER. (500 STAMP)" },
    { id: "2l", code: "2.12", name: "PRATIDNYA-PATRA. 7/12. (500 STAMP)" },
    { id: "2m", code: "2.13", name: "TREE PRATIDNYA-PATRA. (500 STAMP)" },
    { id: "2n", code: "2.14", name: "BAND-PATRA. (500 STAMP)" },
    { id: "2o", code: "2.15", name: "GREEN ZONE AFFIDAVIT. (500 STAMP) - IF REQUIRED" },
    { id: "2p", code: "2.16", name: "EWS AFFIDAVIT. (500 STAMP) - IF REQUIRED" }
  ]},
  { id: '3', name: "Technical Papers", code: "TEC", subfolders: [
    { id: "3a", code: "3.1", name: "Architect Appointment" },
    { id: "3b", code: "3.2", name: "Architect Acceptance" },
    { id: "3c", code: "3.3", name: "Architect Supervision" },
    { id: "3d", code: "3.4", name: "Architect License" },
    { id: "3e", code: "3.5", name: "Structural Appointment" },
    { id: "3f", code: "3.6", name: "Structural Acceptance" },
    { id: "3g", code: "3.7", name: "Structural Supervision" },
    { id: "3h", code: "3.8", name: "Structural License" }
  ]},
  { id: '4', name: "VVCMC NOC's", code: "NOC", subfolders: [
    { id: "4a", code: "4.A", name: "D.P Remark" },
    { id: "4b", code: "4.B", name: "Tree Noc" },
    { id: "4c", code: "4.C", name: "Fire Noc" },
    { id: "4d", code: "4.D", name: "E.C Noc" },
    { id: "4e", code: "4.E", name: "Railway Noc" },
    { id: "4f", code: "4.F", name: "High Noc" },
    { id: "4g", code: "4.G", name: "Others" }
  ]},
  { id: '5', name: "VVCMC Previous Approvals", code: "VPA", subfolders: [] },
  { id: '6', name: "Courts Cases / Complaints / Notices", code: "CCN", subfolders: [] },
  { id: '7', name: "Others", code: "OTH", subfolders: [] }
];
