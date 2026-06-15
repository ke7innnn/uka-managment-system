const fs = require('fs');

let content = fs.readFileSync('src/lib/store.ts', 'utf-8');

// Update PhaseTask interface
content = content.replace(
  /export interface PhaseTask \{\n  id: string;\n  title: string;\n  completed: boolean;\n  assignedTo: string; \/\/ Staff ID or Name\n\}/g,
  `export interface PhaseTask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string; // Staff ID or Name
  templateName?: string;
  requiresManualRemark?: boolean;
}`
);

// Replace DEFAULT_PHASES_TEMPLATE
const newTemplate = `export const DEFAULT_PHASES_TEMPLATE = [
  {
    name: "Stage 1 — Sadhana/Uzaid: File Prep & Order Placement (3 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Filing with sticker and basic papers (7.12, physical survey with surroundings and gutbook superimposed for D.P, gutbook, site photos, KYC questionnaire, ARCHITECT APPOINTMENT LETTER, give ENTIRE PAPERWORK CHECKLIST of approval to client)", assignedTo: "Sadhana Kanojiya & Uzaid Khan", templateName: "stage1_task1" },
      { title: "Place order for 2 sets of TILR/NOCs (mention DATE & whether client is doing it or responsible persons name) with Vijay", assignedTo: "Sadhana Kanojiya & Uzaid Khan", templateName: "stage1_task2" },
      { title: "Place order for 2 sets of all revenue papers (mention DATE whether client is doing it or responsible persons name)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Upload project on website", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Give it OFFICE UIN and form WhatsApp group (Vrushali madam)", assignedTo: "Sadhana Kanojiya & Uzaid Khan", templateName: "stage1_task3" },
      { title: "Summarized Auto prompt is sent to client and boss on group.", assignedTo: "Sadhana Kanojiya & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 2 — Vijay/Uzaid: Plot Details & NOC Checks (3 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Upload basic plot on DP marking, CRZ, WETLAND, eco sensitive zone CORRIDOR, HERITAGE, KMZ images on website and give remark.", assignedTo: "Vijay Palkar & Uzaid Khan", templateName: "stage2_task1" },
      { title: "Check whether any other NOC like Forest, Railway, Environmental clearance, Highway access NOC, etc is required and mention remark accordingly.", assignedTo: "Vijay Palkar & Uzaid Khan" },
      { title: "Summarized Auto prompt is sent to document provider, client and boss on group.", assignedTo: "Vijay Palkar & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 3 — Sadhana/Uzaid: Paper Procurement (5 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Ready half CHECKLIST", assignedTo: "Sadhana Kanojiya & Uzaid Khan", templateName: "stage3_taskk1" },
      { title: "Prepare 1 office file copy and 1 vvcmc file copy", assignedTo: "Sadhana Kanojiya & Uzaid Khan", templateName: "stage3_task2" },
      { title: "Complete balance typing as per entire checklist", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Finalise the file and upload on web", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Forward to Vrushali madam for online Inward", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Forward to Vijay Sir for legal and tree NOC (1 SET VVCMC HARD COPY)", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Fast track TILR with client.", assignedTo: "Sadhana Kanojiya & Uzaid Khan" },
      { title: "Produce Rough challan estimate AND Rough Architect billing Estimate. (Vrushali)", assignedTo: "Sadhana Kanojiya & Uzaid Khan", templateName: "stage3_task3" },
      { title: "Summarized Auto prompt is sent to client and boss on group.", assignedTo: "Sadhana Kanojiya & Uzaid Khan" }
    ]
  },
  {
    name: "Stage 4 — Vijay: Legal/Tree NOC (21 Working Days)",
    status: "not-started" as const,
    tasks: [
      { title: "Mention compliances of legal department scrutiny time to time.", assignedTo: "Vijay Palkar", templateName: "stage4_task1", requiresManualRemark: true },
      { title: "Mention compliances of tree department scrutiny time to time.", assignedTo: "Vijay Palkar", templateName: "stage4_task2", requiresManualRemark: true },
      { title: "Confirm and upload final TILR document on web", assignedTo: "Vijay Palkar", templateName: "stage4_task5" },
      { title: "Upload final legal NOC signed noting", assignedTo: "Vijay Palkar", templateName: "stage4_task3" },
      { title: "Upload final tree NOC signed noting", assignedTo: "Vijay Palkar", templateName: "stage4_task4" },
      { title: "Upload DP marking", assignedTo: "Vijay Palkar", templateName: "stage4_tassksix" },
      { title: "FINAL PLAN & COMMENTS FROM UDAY.", assignedTo: "Vijay Palkar" },
      { title: "PRE-AUTO DCR - Sadhana/Vrushali madam (7 DAYS)", assignedTo: "Vijay Palkar", templateName: "stage4_task7" },
      { title: "HARSH/UDAY to attach service drawings and EE report (7 days)", assignedTo: "Vijay Palkar" },
      { title: "Summarized Auto prompt is sent to client and boss on group (CHECKLIST COMPLETE)", assignedTo: "Vijay Palkar" }
    ]
  },
  {
    name: "Stage 5 — Uzaid/Vrushali/Nihal: Drawing, Report & Inwarding (14 Days upon TILR/Plans)",
    status: "not-started" as const,
    tasks: [
      { title: "take Auto Cad drawing from Uday.", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Prepare and upload offline drawing", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Online clear report to be readied and uploaded", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat", templateName: "stage5_task1" },
      { title: "Drawing to be readied and uploaded", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Summarized Auto prompt is sent to client and boss on group (REPORT/DRAWING IS COMPLETE AND ATTACHMENT IS AUTO SENT)", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "point E report and service drawing", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "hardship point", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Drawing", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Report", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Marginal", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Engineering Drawing", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Complete FINAL OFFLINE DOCKET to be readied as per checklist", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat", templateName: "stage5_task2" },
      { title: "Any issues/clarifications/CHANGES to be mentioned by Vrushali/uzaid to nihal and me on the site itself without verbal communication AND PROCESS E TO BE REPEATED (live chat window)", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Nihal to acknowledge that offline docket has been successfully received", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" },
      { title: "Nihal to ensure that file is inwarded and covering letter with online/offline number identification is uploaded on the site", assignedTo: "Uzaid Khan & Vrushali Thakur & Nihal Gharat" }
    ]
  },
  {
    name: "Stage 6 — Uzaid/Vrushali: Final Approval & Receipts (Upon obtaining permission)",
    status: "not-started" as const,
    tasks: [
      { title: "AUTO PROMPT TO CLIENT AND BOSS- PROJECT HAS BEEN APPROVED VIA OFFLINE MODE BY HON. COMMISSIONER SIR ON………. FURTHER PROCESS FOR ONLINE APPROVAL AND CHALLANS HAS BEEN INITIATED.", assignedTo: "Uzaid Khan & Vrushali Thakur", templateName: "stahe6_task1" },
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
];`;

const oldTemplateRegex = /export const DEFAULT_PHASES_TEMPLATE = \[\s*\{[\s\S]*?name: "Stage 6 — Uzaid\/Vrushali: Final Approval & Receipts \(Upon obtaining permission\)",[\s\S]*?\]\s*\}\s*\];/;
content = content.replace(oldTemplateRegex, newTemplate);

fs.writeFileSync('src/lib/store.ts', content);
console.log('Successfully updated src/lib/store.ts');
