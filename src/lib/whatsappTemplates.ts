export const WHATSAPP_TEMPLATES: Record<string, string> = {
  stage1_task1: "Basic filing and paperwork has been started at office for your project. Order for balance papers shall be placed shortly by Vijay/Uzaid.\nRegards, UKA",
  stage1_task2: "Order for balance revenue papers has been placed by Vijay/Uzaid. TILR map is satisfactorily / not yet received. Document checklist update shall be shared with you time to time.\nRegards, UKA",
  stage1_task3: "Project UIN {{1}} has been created for your project named {{2}} for further correspondence.\nRegards, UKA",
  stage2_task1: "Basic DP marking of your proposal has been readied by Vijay/Uzaid. NOC like orest, Railway, Environmental clearance, Highway access NOC, etc Shall be applicable for your project.\nRegards.UKA",
  stage3_taskk1: "Basic file for project UIN {{1}} has been inwarded at VVCMC.\nRegards, UKA",
  stage3_task2: "File preparation for legal noc, tree noc has been completed at office and shall be submitted by Vijay to VVCMC. Contact him for further follow-up on the NOCs.\nRegards UKA.",
  stage3_task3: "Rough challan estimate for your project UIN {{1}} is attached herewith for basic understanding and shall be subject to changes as per VVCMC.\nRegards, UKA",
  stage4_task1: "Legal department has checked your project UIN {{1}} and the following points have been noted by Vijay: {{2}}\n\nFinal legal department NOC shall be obtained soon upon solving this query.\nRegards, UKA",
  stage4_task2: "Tree department has checked your project UIN {{1}} and the following points have been noted by Vijay: {{2}}\n\nProvisional tree NOC/tree cutting permission shall be obtained soon upon solving the above query.\nRegards, UKA",
  stage4_task3: "Legal department has successfully scrutinised your project UIN {{1}}. Contact Vijay for further updates.\nRegards, UKA",
  stage4_task4: "Tree department has successfully granted NOC/tree cutting permission for project UIN {{1}}. Contact Vijay for further details.\nRegards, UKA",
  stage4_task5: "TILR has been obtained for your project UIN {{1}}.\nRegards, UKA",
  stage4_tassksix: "DP marking has been successfully completed for your project UIN {{1}} at VVCMC. Contact Vijay for further updates.\nRegards, UKA",
  stage4_task7: "Pre Auto DCR for online scrutiny has been initiated for your project UIN {{1}}. You shall be intimated shortly after successful generation of reports and drawings from the online portal by Uzaid or Vrushali.\nRegards, UKA",
  stage5_task1: "Online reports and drawings for your project UIN {{1}} have been successfully generated. Contact Vrushali/Uzaid for further update as the proposal shall now be submitted in offline mode to VVCMC with the reports and drawings.\nRegards, UKA",
  stage5_task2: "Complete offline file for project UIN {{1}} has been submitted to VVCMC for scrutiny. You shall be intimated by office shortly about further updates in scrutiny.\nRegards, UKA",
  stahe6_task1: "We are pleased to inform you that your proposal UIN {{1}} has been successfully approved by Hon. Commissioner, VVCMC.\n\nYou are requested to pay the requisite development charges and obtain online approval by contacting Uzaid/Vrushali at the earliest.\nRegards, UKA"
};

export function getTemplatePreview(templateName: string, params: string[]): string {
  let text = WHATSAPP_TEMPLATES[templateName];
  if (!text) return `[Template: ${templateName}]\nSending variables: ${params.join(', ')}`;

  // Replace {{1}}, {{2}} with params
  params.forEach((param, index) => {
    const placeholder = `{{${index + 1}}}`;
    text = text.replace(placeholder, param);
  });
  return text;
}
