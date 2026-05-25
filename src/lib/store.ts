// ─── Types ────────────────────────────────────────────────────────────────────
import { pushClientsToSupabase, pushStaffToSupabase } from './supabaseSync';
import { stripLargeBase64 } from './supabase';

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

export interface OtherOwner {
  id: string;
  name: string;
  phone: string;
  address: string;
  aadharNo: string;
  aadharPhoto: string; // Base64
  panNo: string;
  panPhoto: string; // Base64
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
  clientAadharNo?: string;
  clientAadharPhoto?: string;
  clientPanNo?: string;
  clientPanPhoto?: string;
  otherOwners?: OtherOwner[];
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
    const parsedClients: Client[] = raw ? JSON.parse(raw) : [];
    
    // Tombstone check for deleted clients
    const deletedRaw = localStorage.getItem('uka_deleted_client_ids');
    const deletedIds = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    
    const deduplicatedMap = new Map<string, Client>();
    parsedClients.forEach(c => {
      if (!deletedIds.has(c.id)) {
        deduplicatedMap.set(c.id, c);
      }
    });
    const clients = Array.from(deduplicatedMap.values());
    
    let migrated = false;
    const migratedClients = clients.map(client => {
      // Check if they have the old phases format or no phases at all
      const hasOldPhases = !client.phases || client.phases.length === 0 || client.phases.some(p => 
        p.name === "Stage 1 — File Preparation" || 
        p.name === "Stage 2 — Paper Procurement" || 
        p.name === "Stage 3 — Legal / Tree NOC" || 
        p.name === "Stage 3 — Upon Obtaining Permission" ||
        (!p.name.includes("1a") && !p.name.includes("1b") && !p.name.includes("2c") && !p.name.includes("3d") && !p.name.includes("3e") && !p.name.includes("3f"))
      );

      let clientMigrated = false;
      let newPhases = client.phases || [];

      if (hasOldPhases) {
        clientMigrated = true;
        
        const oldStage1 = client.phases?.find(p => p.name.includes("File Preparation"));
        const oldStage2 = client.phases?.find(p => p.name.includes("Paper Procurement"));
        const oldStage3 = client.phases?.find(p => p.name.includes("Legal / Tree NOC"));
        const oldStage4 = client.phases?.find(p => p.name.includes("Obtaining Permission"));

        newPhases = DEFAULT_PHASES_TEMPLATE.map((stage, idx) => {
          let matchingOld = oldStage1;
          if (stage.name.includes("2c")) matchingOld = oldStage2;
          else if (stage.name.includes("3d") || stage.name.includes("3e")) matchingOld = oldStage3;
          else if (stage.name.includes("3f")) matchingOld = oldStage4;

          const status = matchingOld ? matchingOld.status : ("not-started" as const);
          const startedAt = matchingOld ? matchingOld.startedAt : undefined;
          const timeBound = matchingOld ? matchingOld.timeBound : undefined;

          // Map completed tasks where possible
          const tasks = stage.tasks.map(t => {
            let completed = false;
            if (matchingOld) {
              const matchedTask = matchingOld.tasks?.find(ot => 
                ot.title.toLowerCase().substring(0, 15) === t.title.toLowerCase().substring(0, 15) ||
                ot.title.toLowerCase().includes(t.title.toLowerCase().split(' ')[0])
              );
              if (matchedTask) {
                completed = matchedTask.completed;
              }
            }
            return {
              id: crypto.randomUUID(),
              title: t.title,
              completed,
              assignedTo: t.assignedTo
            };
          });

          return {
            id: crypto.randomUUID(),
            name: stage.name,
            status,
            order: idx,
            tasks,
            startedAt,
            timeBound
          };
        });
      } else {
        newPhases = client.phases.map(p => ({
          ...p,
          status: p.status || (p.completed ? 'completed' : 'not-started'),
          tasks: p.tasks || []
        }));
      }

      // Migrate progressChecklist IDs from old numbering to new sequential 1-71
      // Old ID → New ID mapping (covers sub-letter IDs and shifted numeric IDs)
      const CHECKLIST_ID_MAP: Record<string, string[]> = {
        "5":   ["5", "6"],  // Old 5 was both "ADVOCATE TITLE SEARCH REPORT" and "NO CLAIMS..."
        "5a":  ["5"],
        "5b":  ["6"],
        "6":   ["7"],
        "7":   ["8"],
        "8":   ["9"],
        "9":   ["10"],
        "10":  ["11"],
        "11":  ["12"],
        "12":  ["13"],
        "13":  ["14"],
        "14":  ["15"],
        "15":  ["16", "17", "18", "19", "20", "21"], // Old unsplit 15 maps to all 6 new individual consent items!
        "15a": ["16"],
        "15b": ["17"],
        "15c": ["18"],
        "15d": ["19"],
        "15e": ["20"],
        "15f": ["21"],
        "16":  ["22"],
        "17":  ["23"],
        "18":  ["24"],
        "19":  ["25"],
        "20":  ["26"],
        "21":  ["27", "28"], // Old unsplit 21 maps to both DEV. AGREEMENT and POWER
        "21a": ["27"],
        "21b": ["28"],
        "22":  ["29"],
        "23":  ["30"],
        "24":  ["31"],
        "25":  ["32"],
        "26":  ["33"],
        "27":  ["34"],
        "28":  ["35"],
        "29":  ["36"],
        "30":  ["37"],
        "31":  ["38"],
        "32":  ["39"],
        "33":  ["40"],
        "34":  ["41"],
        "35":  ["42"],
        "36":  ["43"],
        "37":  ["44"],
        "38":  ["45"],
        "39":  ["46"],
        "40":  ["47"],
        "41":  ["48"],
        "42":  ["49"],
        "43":  ["50"],
        "44":  ["51"],
        "45":  ["52"],
        "46":  ["53"],
        "47":  ["54"],
        "48":  ["55"],
        "49":  ["56"],
        "50":  ["57"],
        "51":  ["58"],
        "52":  ["59"],
        "53":  ["60"],
        "54":  ["61"],
        "55":  ["62"],
        "56":  ["63"],
        "57":  ["64"],
        "58":  ["65"],
        "59":  ["66"],
        "60":  ["67"],
        "61":  ["68"],
        "62":  ["69"],
        "63":  ["70"],
        "64":  ["71"],
      };

      const originalChecklist = client.progressChecklist || [];
      const isChecklistMigrated = originalChecklist.includes("MIGRATED_V2");
      let uniqueMigratedChecklist = originalChecklist;

      if (!isChecklistMigrated) {
        const migratedChecklist = originalChecklist.flatMap(id => CHECKLIST_ID_MAP[id] ?? [id]);
        uniqueMigratedChecklist = [...new Set([...migratedChecklist, "MIGRATED_V2"])];
        clientMigrated = true;
      }

      // Filter to keep only valid checklist IDs (1-71 and 'MIGRATED_V2')
      const VALID_IDS = new Set([
        ...PROGRESS_CHECKLIST_ITEMS.map(item => item.id),
        "MIGRATED_V2"
      ]);
      uniqueMigratedChecklist = uniqueMigratedChecklist.filter(id => VALID_IDS.has(id));

      if (clientMigrated) {
        migrated = true;
      }

      return {
        ...client,
        phases: newPhases,
        progressChecklist: uniqueMigratedChecklist,
        syncStatus: clientMigrated ? ('pending' as const) : client.syncStatus
      };
    });

    if (migrated) {
      setTimeout(() => {
        saveClients(migratedClients);
      }, 0);
    }

    return migratedClients;
  } catch {
    return [];
  }
}

export function saveClients(clients: Client[]): void {
  if (typeof window === 'undefined') return;
  // Background sync to Supabase (non-blocking with full un-stripped details)
  pushClientsToSupabase(clients).catch(console.error);
  // Save lightweight cleaned representation locally to avoid 5MB quota limits
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripLargeBase64(clients)));
}

export function getClientById(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export const DEFAULT_PHASES_TEMPLATE = [
  {
    name: "Stage 1a — Sadhana/Uzaid: File Prep & Order Placement (3 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Filing with sticker and basic papers (7.12, physical survey with surroundings and gutbook superimposed for D.P, gutbook, site photos, KYC questionnaire, ARCHITECT APPOINTMENT LETTER, give ENTIRE PAPERWORK CHECKLIST of approval to client)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Place order for 2 sets of TILR/NOCs (mention DATE & whether client is doing it or responsible persons name)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Place order for 2 sets of all revenue papers (mention DATE whether client is doing it or responsible persons name)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Upload project on website", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Give it OFFICE UIN and form WhatsApp group (Vrushali madam)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Summarized Auto prompt is sent to client and boss on group.", assignedTo: "Sadhana Kanojiya & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 1b — Vijay/Uzaid: Plot Details & NOC Checks (3 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Upload basic plot on DP marking, CRZ, WETLAND, eco sensitive zone CORRIDOR, HERITAGE, KMZ images on website and give remark.", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Check whether any other NOC like Forest, Railway, Environmental clearance, Highway access NOC, etc is required and mention remark accordingly.", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Summarized Auto prompt is sent to document provider, client and boss on group.", assignedTo: "Vijay Palkar & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 2c — Sadhana/Uzaid: Paper Procurement (5 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Ready half CHECKLIST", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Prepare 1 office file copy and 1 vvcmc file copy", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Complete balance typing as per entire checklist", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Finalise the file and upload on web", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Forward to Vrushali madam for online Inward", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Forward to Vijay Sir for legal and tree NOC (1 SET VVCMC HARD COPY)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Fast track TILR with client.", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Produce Rough challan estimate AND Rough Architect billing Estimate. (Vrushali)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Summarized Auto prompt is sent to client and boss on group.", assignedTo: "Sadhana Kanojiya & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 3d — Vijay: Legal/Tree NOC (21 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Mention compliances of legal department, tree department scrutiny time to time.", assignedTo: "Vijay Palkar" },
      { title: "Confirm and upload final TILR document on web", assignedTo: "Vijay Palkar" },
      { title: "Upload final legal, tree NOC signed noting", assignedTo: "Vijay Palkar" },
      { title: "Upload DP marking", assignedTo: "Vijay Palkar" },
      { title: "FINAL PLAN & COMMENTS FROM UDAY.", assignedTo: "Vijay Palkar" },
      { title: "PRE-AUTO DCR - Sadhana/Vrushali madam (7 DAYS)", assignedTo: "Vijay Palkar" },
      { title: "HARSH/UDAY to attach service drawings and EE report (7 days)", assignedTo: "Vijay Palkar" },
      { title: "Summarized Auto prompt is sent to client and boss on group (CHECKLIST COMPLETE)", assignedTo: "Vijay Palkar" }
    ]
  },
  {
    name: "Stage 3e — Uzaid/Vrushali/Nihal: Drawing, Report & Inwarding (14 Days upon TILR/Plans)",
    status: "not-started" as const,
    tasks: [
      { title: "Prepare and upload offline drawing", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Online clear report and drawing to be readied and uploaded", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Summarized Auto prompt is sent to client and boss on group (REPORT/DRAWING IS COMPLETE AND ATTACHMENT IS AUTO SENT)", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "MARGINAL CONCESSION DIAGRAM AS PER REPORT- 1 DAY", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Complete FINAL OFFLINE DOCKET to be readied as per checklist", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Any issues/clarifications/CHANGES to be mentioned by Vrushali/uzaid to nihal and me on the site itself without verbal communication AND PROCESS E TO BE REPEATED (live chat window)", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Nihal to acknowledge that offline docket has been successfully received", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Nihal to ensure that file is inwarded and covering letter with online/offline number identification is uploaded on the site", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" }
    ]
  },
  {
    name: "Stage 3f — Uzaid/Vrushali: Final Approval & Receipts (Upon obtaining permission)",
    status: "not-started" as const,
    tasks: [
      { title: "AUTO PROMPT TO CLIENT AND BOSS- PROJECT HAS BEEN APPROVED VIA OFFLINE MODE BY HON. COMMISSIONER SIR ON………. FURTHER PROCESS FOR ONLINE APPROVAL AND CHALLANS HAS BEEN INITIATED.", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "VRUSHALI/VIJAY – 2 DAYS FOR FINAL CHALLAN CALCULATION AND SAME TO BE SENT TO NIHAL/BOSS/CLIENT", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "VRUSHALI – TO PREPARE FINAL RECEIPTS", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "AUTOPROMPT TO CLIENT FOR MAKING FINAL PAYMENTS WITH RECEIPT AND FORMAT", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "FINAL ARCHITECTURAL BILL SETTLEMENT (MANUAL)- VRUSHALI/BOSS.", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "ONLINE APPROVAL IS RECEIVED – SADHANA OKAYS Update the master file sheet", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "Ganesh to provide images of notings upon issue of online permission ( within 2 days from online permission )", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "Upload all the scanning of orders and blueprints", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "FINAL PERMISSION COPY TO BE FORWARDED to BOSS/NIHAL/UDAY/ Crystal (MANUAL- NO AUTO PROMPT)", assignedTo: "Uzaid Khan & Vrushali Thakur" },
      { title: "BOSS FORWARDS PERMISSION COPY TO CLIENT", assignedTo: "Uzaid Khan & Vrushali Thakur" }
    ]
  }
];

export function getStageDefaultWorkingDays(stageName: string): number {
  const name = stageName.toLowerCase();
  if (name.includes("1a")) return 3;
  if (name.includes("1b")) return 3;
  if (name.includes("2c")) return 5;
  if (name.includes("3d")) return 21;
  if (name.includes("3e")) return 14;
  return 0;
}

export function calculateDefaultDeadline(days: number): string {
  const startDate = new Date();
  let count = 0;
  const date = new Date(startDate.getTime());
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // skip Saturday and Sunday
      count++;
    }
  }
  return date.toISOString().split('T')[0];
}


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
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    
    // Add to tombstone list to prevent sync from bringing it back
    const deletedRaw = localStorage.getItem('uka_deleted_client_ids');
    const deleted: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem('uka_deleted_client_ids', JSON.stringify(deleted));
    }
  }

  // Delete from Supabase in background sequentially to respect foreign key constraints
  import('./supabase').then(async ({ supabase }) => {
    try {
      await supabase.from('phases').delete().eq('client_id', id);
      await supabase.from('documents').delete().eq('client_id', id);
      const clientRes = await supabase.from('clients').delete().eq('id', id);

      if (clientRes.error) {
        console.error('Delete clients error:', clientRes.error.message);
      } else {
        // Successfully deleted from Supabase, remove from tombstone
        const deletedRaw = localStorage.getItem('uka_deleted_client_ids');
        if (deletedRaw) {
          const deleted: string[] = JSON.parse(deletedRaw);
          const updated = deleted.filter(deletedId => deletedId !== id);
          localStorage.setItem('uka_deleted_client_ids', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Delete client sequential error:', err);
    }
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
  // Background sync to Supabase (non-blocking with full un-stripped details)
  pushStaffToSupabase(staff).catch(console.error);
  // Save lightweight cleaned representation locally to avoid 5MB quota limits
  localStorage.setItem(STAFF_KEY, JSON.stringify(stripLargeBase64(staff)));
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
  { id: "1",  label: "7/12 EXTRACT / PROPERTY CARD" },
  { id: "2",  label: "ALL 6/12 MUTATIONS AS PER 7/12 & PIKPANI EXTRACT" },
  { id: "3",  label: "PIKPANI (1952 TILL DATE)" },
  { id: "4",  label: "8A EXTRACT" },
  { id: "5",  label: "ADVOCATE TITLE SEARCH REPORT FROM 1952 TILL DATE WITH RECEIPT" },
  { id: "6",  label: "NO CLAIMS ON LAND TITLE & POSSESSION AFTER ISSUING PAPER NOTICE" },
  { id: "7",  label: "SALE PERMISSION IF APPLICABLE" },
  { id: "8",  label: "NA ORDER / LAND CONVERSION WITH RECEIPT" },
  { id: "9",  label: "GAON NAKASHA" },
  { id: "10", label: "GAVTHAN CERTIFICATION (IF APPLICABLE)" },
  { id: "11", label: "PHYSICAL & LEVEL SURVEY WITH 100MT SURROUNDING" },
  { id: "12", label: "GOOGLE LOCATION & SITE PHOTOS" },
  { id: "13", label: "COPY OF LATEST RR RATE" },
  { id: "14", label: "GUTBOOK, TILR MAP WITH RECEIPT / CTS SKETCH WITH RECEIPT" },
  { id: "15", label: "SOCIETY REGISTRATION CERTIFICATE" },
  { id: "16", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH GHARPATTI" },
  { id: "17", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH ASSESSMENT" },
  { id: "18", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH SHARE CERTIFICATE" },
  { id: "19", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH LIGHT BILL" },
  { id: "20", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH PAN CARDS" },
  { id: "21", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH AADHAR CARDS" },
  { id: "22", label: "LIST OF ALL MEMBERS WITH FLATS NUMBERS & AREAS STAMPED & SIGNED BY CHAIRMAN, SECRETARY" },
  { id: "23", label: "SECTION 79 A REDEVELOPMENT RESOLUTION OF SOC" },
  { id: "24", label: "SECTION 79 A SUB REGISTER NOC" },
  { id: "25", label: "SOCIETY RESOLUTION FOR CHAIRMAN, SECRETARY APPOINTMENT" },
  { id: "26", label: "DILAPIDATED NOTICE FROM VVCMC (C1 NOTICE)" },
  { id: "27", label: "DEV. AGREEMENT (REGISTERED)" },
  { id: "28", label: "POWER (REGISTERED)" },
  { id: "29", label: "PARTNERSHIP DEED / SIGNING AUTHORIZATION OF FIRM (REGISTERED) / PVT. LTD. FIRM" },
  { id: "30", label: "FIRM PAN CARD" },
  { id: "31", label: "NO DUES LETTER FROM VVCMC WARD OFFICE FOR REDEVELOPMENT PROPOSAL" },
  { id: "32", label: "OLD APPROVAL" },
  { id: "33", label: "AS BUILT FLOOR & ROOM SIZE SURVEY" },
  { id: "34", label: "RESOLUTION FOR JOINT SOCIETY" },
  { id: "35", label: "ALL AFFIDAVIT: SIGN/PHOTO IS REMAINING" },
  { id: "36", label: "SOCIETY RESOLUTION FOR CHAIRMAN, SECRETARY AUTHORIZATION TO SIGN THE D.A/P.O.A" },
  { id: "37", label: "ALL XEROX PAPER TRUE COPY" },
  { id: "38", label: "APPOINTMENT LETTER OF ARCHITECT IN FAVOUR OF UMESH KEKRE & ASSOCIATES" },
  { id: "39", label: "500 ₹ STAMP PAPERS (16 TYPES: SITE ENGINEER, ADJOINING FLAT, INDEMNITY BOND, SEWAGE, TENANT BAND PATR, UNDERTAKING 100, PRATIDNYA-PATRA 7/12, TREE PRATIDNYA, BAND-PATRA, GREEN ZONE, EWS)" },
  { id: "40", label: "ZONE REMARK" },
  { id: "41", label: "CLIENT PHOTOS" },
  { id: "42", label: "CLIENT KYC" },
  { id: "43", label: "CLIENT ID / PASSWORD" },
  { id: "44", label: "CLIENT DIGITAL SIGNATURE (DSC)" },
  { id: "45", label: "OTP BASED CLIENT MOBILE NUMBER" },
  { id: "46", label: "PERMISSION TYPE (CC / RDP / OC)" },
  { id: "47", label: "SCHEME (REDEVELOPMENT / EWS)" },
  { id: "48", label: "APPENDIX - A1" },
  { id: "49", label: "APPENDIX - B" },
  { id: "50", label: "RAILWAY NOC (IF REQUIRED)" },
  { id: "51", label: "ARCHITECT APPOINTMENT / ENGINEER APPOINTMENT" },
  { id: "52", label: "STRUCTURAL APPOINTMENT" },
  { id: "53", label: "STRUCTURAL STABILITY" },
  { id: "54", label: "RECEIPT" },
  { id: "55", label: "EE REPORT" },
  { id: "56", label: "DP" },
  { id: "57", label: "PROVISIONAL TREE NOC" },
  { id: "58", label: "PROVISIONAL FIRE NOC" },
  { id: "59", label: "LEVEL SURVEY" },
  { id: "60", label: "PHYSICAL SURVEY" },
  { id: "61", label: "REPORT & DRAWING" },
  { id: "62", label: "BLUE BOARD" },
  { id: "63", label: "HARDSHIP REPORT" },
  { id: "64", label: "LAYOUT" },
  { id: "65", label: "ANY SPECIFIC NOC IF APPLICABLE" },
  { id: "66", label: "WORK STATUS REPORT" },
  { id: "67", label: "MOEF CLEARANCE" },
  { id: "68", label: "COPY OF LATEST RR RATE (CC/RDP)" },
  { id: "69", label: "RIGHT OF WAY REGISTERED AGREEMENT" },
  { id: "70", label: "EC DRAWING WITH NOC" },
  { id: "71", label: "TDR UTILISATION FORM" }
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
    { id: "1g", code: "1.G", name: "TiLR" },
    { id: "1h", code: "1.H", name: "Gut Book" },
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
