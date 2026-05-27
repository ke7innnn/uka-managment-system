'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Client, addClient, updateClient, OtherOwner, ClientReference } from '@/lib/store';
import { FileText, Image as ImageIcon, Eye, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ClientForm.module.css';

type FormData = {
  name: string;
  clientId: string;
  clientUin: string;
  clientPassword: string;
  company: string;
  email: string;
  phone: string;
  place: string;
  address: string;
  notes: string;
  tags: string;
  projectName: string;
  projectStatus: Client['projectStatus'];
  priority: 'low' | 'medium' | 'high';
  
  // KYC fields
  proposedSub: string;
  proposedDevelopment: string;
  landBearingSno: string;
  landBearingPlotNo: string;
  landBearingVillage: string;
  landBearingTal: string;
  landBearingDist: string;
  scheme: string;
  permissionType: string;
  ownerType: string;
  applicantName: string;
  companyOwnerType: string;
  companyPanCard: string;
  gstNoCertificate: string;
  memberAadharCard: string;
  memberPanCard: string;
  memberMobileNo: string;
  authorisedPersonEmail: string;
  requiredDigitalSignature: string;
  officeAdd: string;
  siteAdd: string;
  northPhoto: string;
  northDetails: string;
  southPhoto: string;
  southDetails: string;
  eastPhoto: string;
  eastDetails: string;
  westPhoto: string;
  westDetails: string;
  road: string;
  roadDetails: string;
  side: string;
  sideDetails: string;
  sNo: string;
  hNo: string;
  village: string;
  tal: string;
  siteAddSecondary: string;
  projectNameSecondary: string;
  geoCoordinates: string;
  emailIdSecondary: string;
  whetherOpenPlot: string;
  siteEng: string;
  regulations: string;
  siteSupervisor: string;
  anyOther: string;
  contactNo: string;
  use: string;
  noOfBldgs: string;
  floor: string;
  pLine: string;
  architect: string;
  structuralEngName: string;
  isDigitalSignature: string;
  digitalSignaturePhoto: string;
  clientAadharNo: string;
  clientAadharPhoto: string;
  clientPanNo: string;
  clientPanPhoto: string;
};

interface Props {
  client?: Client;
  mode: 'new' | 'edit';
  successRedirect?: string;
}

export default function ClientForm({ client, mode, successRedirect }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: client?.name || '',
    clientId: client?.clientId || '',
    clientUin: client?.clientUin || '',
    clientPassword: client?.clientPassword || '',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    place: client?.place || '',
    address: client?.address || '',
    notes: client?.notes || '',
    tags: client?.tags?.join(', ') || '',
    projectName: client?.projectName || '',
    projectStatus: client?.projectStatus || 'pending',
    priority: client?.priority || 'medium',
    
    // KYC initial states
    proposedSub: client?.kyc?.proposedSub || '',
    proposedDevelopment: client?.kyc?.proposedDevelopment || 'RESIDENTIAL CUM SHOPLINE',
    landBearingSno: client?.kyc?.landBearingSno || '',
    landBearingPlotNo: client?.kyc?.landBearingPlotNo || '',
    landBearingVillage: client?.kyc?.landBearingVillage || '',
    landBearingTal: client?.kyc?.landBearingTal || '',
    landBearingDist: client?.kyc?.landBearingDist || '',
    scheme: client?.kyc?.scheme || 'REGULAR PERMISSION',
    permissionType: client?.kyc?.permissionType || 'CC',
    ownerType: client?.kyc?.ownerType || 'INDIVIDUAL',
    applicantName: client?.kyc?.applicantName || '',
    companyOwnerType: client?.kyc?.companyOwnerType || 'INDIVIDUAL',
    companyPanCard: client?.kyc?.companyPanCard || '',
    gstNoCertificate: client?.kyc?.gstNoCertificate || '',
    memberAadharCard: client?.kyc?.memberAadharCard || '',
    memberPanCard: client?.kyc?.memberPanCard || '',
    memberMobileNo: client?.kyc?.memberMobileNo || '',
    authorisedPersonEmail: client?.kyc?.authorisedPersonEmail || '',
    requiredDigitalSignature: client?.kyc?.requiredDigitalSignature || 'NO',
    officeAdd: client?.kyc?.officeAdd || '',
    siteAdd: client?.kyc?.siteAdd || '',
    northPhoto: client?.kyc?.northPhoto || '',
    northDetails: client?.kyc?.northDetails || '',
    southPhoto: client?.kyc?.southPhoto || '',
    southDetails: client?.kyc?.southDetails || '',
    eastPhoto: client?.kyc?.eastPhoto || '',
    eastDetails: client?.kyc?.eastDetails || '',
    westPhoto: client?.kyc?.westPhoto || '',
    westDetails: client?.kyc?.westDetails || '',
    road: client?.kyc?.road || '',
    roadDetails: client?.kyc?.roadDetails || '',
    side: client?.kyc?.side || '',
    sideDetails: client?.kyc?.sideDetails || '',
    sNo: client?.kyc?.sNo || '',
    hNo: client?.kyc?.hNo || '',
    village: client?.kyc?.village || '',
    tal: client?.kyc?.tal || '',
    siteAddSecondary: client?.kyc?.siteAddSecondary || '',
    projectNameSecondary: client?.kyc?.projectNameSecondary || '',
    geoCoordinates: client?.kyc?.geoCoordinates || '',
    emailIdSecondary: client?.kyc?.emailIdSecondary || '',
    whetherOpenPlot: client?.kyc?.whetherOpenPlot || '',
    siteEng: client?.kyc?.siteEng || '',
    regulations: client?.kyc?.regulations || '',
    siteSupervisor: client?.kyc?.siteSupervisor || '',
    anyOther: client?.kyc?.anyOther || '',
    contactNo: client?.kyc?.contactNo || '',
    use: client?.kyc?.use || '',
    noOfBldgs: client?.kyc?.noOfBldgs || '',
    floor: client?.kyc?.floor || '',
    pLine: client?.kyc?.pLine || '',
    architect: client?.kyc?.architect || '',
    structuralEngName: client?.kyc?.structuralEngName || '',
    isDigitalSignature: client?.kyc?.isDigitalSignature || 'NO',
    digitalSignaturePhoto: client?.kyc?.digitalSignaturePhoto || '',
    clientAadharNo: client?.kyc?.clientAadharNo || '',
    clientAadharPhoto: client?.kyc?.clientAadharPhoto || '',
    clientPanNo: client?.kyc?.clientPanNo || '',
    clientPanPhoto: client?.kyc?.clientPanPhoto || '',
  });
  const [otherOwners, setOtherOwners] = useState<OtherOwner[]>(client?.kyc?.otherOwners || []);
  const [references, setReferences] = useState<ClientReference[]>(client?.kyc?.references || []);
  const [error, setError] = useState('');

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Auto-generate proposedSub ONLY for new clients when dependencies change
  useEffect(() => {
    // In edit mode, never overwrite the user's manually saved proposedSub
    if (mode === 'edit') return;
    setForm((prev) => {
      const defaultText = `PROPOSED REDEVELOPMENT / DEVELOPMENT PERMISSION FOR PROPOSED ${prev.proposedDevelopment || 'RESIDENTIAL CUM SHOPLINE'} BUILDING ON LAND BEARING S.NO. ${prev.landBearingSno || '______'}, PLOT NO. ${prev.landBearingPlotNo || '_____'} OF VILLAGE: ${prev.landBearingVillage || '________'} TAL: ${prev.landBearingTal || 'VASAI'}, DIST.: ${prev.landBearingDist || 'PALGHAR'}.`;
      if (!prev.proposedSub) {
        return { ...prev, proposedSub: defaultText };
      }
      return prev;
    });
  }, [mode, form.proposedDevelopment, form.landBearingSno, form.landBearingPlotNo, form.landBearingVillage, form.landBearingTal, form.landBearingDist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Client name is required.'); return; }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const kycData = {
      proposedSub: form.proposedSub,
      proposedDevelopment: form.proposedDevelopment,
      landBearingSno: form.landBearingSno,
      landBearingPlotNo: form.landBearingPlotNo,
      landBearingVillage: form.landBearingVillage,
      landBearingTal: form.landBearingTal,
      landBearingDist: form.landBearingDist,
      scheme: form.scheme,
      permissionType: form.permissionType,
      ownerType: form.ownerType,
      applicantName: form.applicantName,
      companyOwnerType: form.companyOwnerType,
      companyPanCard: form.companyPanCard,
      gstNoCertificate: form.gstNoCertificate,
      memberAadharCard: form.memberAadharCard,
      memberPanCard: form.memberPanCard,
      memberMobileNo: form.memberMobileNo,
      authorisedPersonEmail: form.authorisedPersonEmail,
      requiredDigitalSignature: form.requiredDigitalSignature,
      officeAdd: form.officeAdd,
      siteAdd: form.siteAdd,
      northPhoto: form.northPhoto,
      northDetails: form.northDetails,
      southPhoto: form.southPhoto,
      southDetails: form.southDetails,
      eastPhoto: form.eastPhoto,
      eastDetails: form.eastDetails,
      westPhoto: form.westPhoto,
      westDetails: form.westDetails,
      road: form.road,
      roadDetails: form.roadDetails,
      side: form.side,
      sideDetails: form.sideDetails,
      sNo: form.sNo,
      hNo: form.hNo,
      village: form.village,
      tal: form.tal,
      siteAddSecondary: form.siteAddSecondary,
      projectNameSecondary: form.projectNameSecondary,
      geoCoordinates: form.geoCoordinates,
      emailIdSecondary: form.emailIdSecondary,
      whetherOpenPlot: form.whetherOpenPlot,
      siteEng: form.siteEng,
      regulations: form.regulations,
      siteSupervisor: form.siteSupervisor,
      anyOther: form.anyOther,
      contactNo: form.contactNo,
      use: form.use,
      noOfBldgs: form.noOfBldgs,
      floor: form.floor,
      pLine: form.pLine,
      architect: form.architect,
      structuralEngName: form.structuralEngName,
      isDigitalSignature: form.isDigitalSignature,
      digitalSignaturePhoto: form.digitalSignaturePhoto,
      clientAadharNo: form.clientAadharNo,
      clientAadharPhoto: form.clientAadharPhoto,
      clientPanNo: form.clientPanNo,
      clientPanPhoto: form.clientPanPhoto,
      otherOwners: otherOwners,
      references: references,
    };

    if (mode === 'new') {
      addClient({
        name: form.name.trim(),
        clientId: form.clientId.trim() || undefined,
        clientUin: form.clientUin.trim() || undefined,
        clientPassword: form.clientPassword.trim() || undefined,
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        place: form.place.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags,
        projectName: form.projectName.trim() || undefined,
        projectStatus: form.projectStatus,
        priority: form.priority,
        phases: [],
        documents: [],
        kyc: kycData,
      });
      router.push(successRedirect ?? '/dashboard/clients');
    } else {
      updateClient(client!.id, {
        name: form.name.trim(),
        clientId: form.clientId.trim() || undefined,
        clientUin: form.clientUin.trim() || undefined,
        clientPassword: form.clientPassword.trim() || undefined,
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        place: form.place.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags,
        projectName: form.projectName.trim() || undefined,
        projectStatus: form.projectStatus,
        priority: form.priority,
        kyc: kycData,
      });
      router.push(successRedirect ?? `/dashboard/clients/${client!.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <Section title="Personal Information">
        <div className={styles.grid}>
          <Field label="Full Name *" id="name" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Rahul Sharma" />
          <Field label="Client ID" id="clientId" value={form.clientId} onChange={(v) => set('clientId', v)} placeholder="e.g. UKA-101" />
          <Field label="Client UIN" id="clientUin" value={form.clientUin} onChange={(v) => set('clientUin', v)} placeholder="e.g. UKA-UIN-XYZ" />
          <Field label="Client Password" id="clientPassword" value={form.clientPassword} onChange={(v) => set('clientPassword', v)} placeholder="e.g. securePass123" />
          <Field label="Company / Brand" id="company" value={form.company} onChange={(v) => set('company', v)} placeholder="e.g. Ktech Studios" />
          <Field label="Email" id="email" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="rahul@example.com" />
          <Field label="Phone" id="phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+91 98765 43210" />
          <Field label="City / Place" id="place" value={form.place} onChange={(v) => set('place', v)} placeholder="Mumbai" />
          <Field label="Full Address" id="address" value={form.address} onChange={(v) => set('address', v)} placeholder="Street, City, State…" />
        </div>
      </Section>

      <Section title="Client Identification Documents">
        <div className={styles.grid}>
          <Field label="Client Aadhaar Card Number" id="clientAadharNo" value={form.clientAadharNo} onChange={(v) => set('clientAadharNo', v)} placeholder="12-digit Aadhaar Card Number" />
          <ImageField label="Client Aadhaar Card Photo" id="clientAadharPhoto" value={form.clientAadharPhoto} onChange={(v) => set('clientAadharPhoto', v)} />
          
          <Field label="Client PAN Card Number" id="clientPanNo" value={form.clientPanNo} onChange={(v) => set('clientPanNo', v)} placeholder="10-digit PAN Card Number" />
          <ImageField label="Client PAN Card Photo" id="clientPanPhoto" value={form.clientPanPhoto} onChange={(v) => set('clientPanPhoto', v)} />
        </div>
      </Section>

      <Section title="Multiple Owners / Other Owners (If Applicable)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {otherOwners.map((owner, idx) => (
            <div key={owner.id} style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.01)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>Owner #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOtherOwners((prev) => prev.filter((o) => o.id !== owner.id));
                  }}
                  style={{
                    padding: '4px 10px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Remove Owner
                </button>
              </div>
              <div className={styles.grid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Owner Name</label>
                  <input
                    type="text"
                    value={owner.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, name } : o));
                    }}
                    placeholder="Owner's Full Name"
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={owner.phone}
                    onChange={(e) => {
                      const phone = e.target.value;
                      setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, phone } : o));
                    }}
                    placeholder="Owner's Phone Number"
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Full Address</label>
                  <input
                    type="text"
                    value={owner.address}
                    onChange={(e) => {
                      const address = e.target.value;
                      setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, address } : o));
                    }}
                    placeholder="Owner's Address"
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Aadhaar Card Number</label>
                  <input
                    type="text"
                    value={owner.aadharNo}
                    onChange={(e) => {
                      const aadharNo = e.target.value;
                      setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, aadharNo } : o));
                    }}
                    placeholder="12-digit Aadhaar Number"
                    className={styles.input}
                  />
                </div>
                <ImageField
                  label="Aadhaar Card Photo"
                  id={`owner-aadhar-${owner.id}`}
                  value={owner.aadharPhoto}
                  onChange={(v) => {
                    setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, aadharPhoto: v } : o));
                  }}
                />
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>PAN Card Number</label>
                  <input
                    type="text"
                    value={owner.panNo}
                    onChange={(e) => {
                      const panNo = e.target.value;
                      setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, panNo } : o));
                    }}
                    placeholder="10-digit PAN Number"
                    className={styles.input}
                  />
                </div>
                <ImageField
                  label="PAN Card Photo"
                  id={`owner-pan-${owner.id}`}
                  value={owner.panPhoto}
                  onChange={(v) => {
                    setOtherOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, panPhoto: v } : o));
                  }}
                />
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={() => {
              setOtherOwners((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  phone: '',
                  address: '',
                  aadharNo: '',
                  aadharPhoto: '',
                  panNo: '',
                  panPhoto: '',
                }
              ]);
            }}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed var(--border)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            + Add Other Owner
          </button>
        </div>
      </Section>

      <Section title="Client References (If Applicable)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {references.map((ref, idx) => (
            <div key={ref.id} style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.01)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>Reference #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReferences((prev) => prev.filter((r) => r.id !== ref.id));
                  }}
                  style={{
                    padding: '4px 10px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Remove Reference
                </button>
              </div>
              <div className={styles.grid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Reference Name</label>
                  <input
                    type="text"
                    value={ref.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setReferences((prev) => prev.map((r) => r.id === ref.id ? { ...r, name } : r));
                    }}
                    placeholder="Reference's Full Name"
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Reference Number</label>
                  <input
                    type="tel"
                    value={ref.phone}
                    onChange={(e) => {
                      const phone = e.target.value;
                      setReferences((prev) => prev.map((r) => r.id === ref.id ? { ...r, phone } : r));
                    }}
                    placeholder="Reference's Contact Number"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={() => {
              setReferences((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  phone: ''
                }
              ]);
            }}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed var(--border)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            + Add Extra Reference
          </button>
        </div>
      </Section>

      <Section title="Project Details">
        <div className={styles.grid}>
          <Field label="Project Name" id="projectName" value={form.projectName} onChange={(v) => set('projectName', v)} placeholder="e.g. Brand Identity 2024" />
          <div className={styles.fieldGroup}>
            <label htmlFor="projectStatus" className={styles.label}>Project Status</label>
            <select
              id="projectStatus"
              value={form.projectStatus}
              onChange={(e) => set('projectStatus', e.target.value as Client['projectStatus'])}
              className={styles.select}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="priority" className={styles.label}>Project Priority</label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as FormData['priority'])}
              className={styles.select}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>
        <Field label="Tags (comma-separated)" id="tags" value={form.tags} onChange={(v) => set('tags', v)} placeholder="photography, branding, video" />
      </Section>

      <Section title="KYC Details">
        <div className={styles.grid}>
          {/* Proposed Subject Line */}
          <div className={styles.fieldGroup} style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="proposedSub" className={styles.label}>SUB: - Proposed Development Subject Line (Auto-Generated & Editable)</label>
            <textarea
              id="proposedSub"
              value={form.proposedSub}
              onChange={(e) => set('proposedSub', e.target.value)}
              placeholder="Proposed redevelopment subject line details"
              rows={3}
              className={styles.textarea}
            />
          </div>
          {/* Proposed Development & Land Bearing */}
          <div className={styles.fieldGroup}>
            <label htmlFor="proposedDevelopment" className={styles.label}>Proposed Development Type</label>
            <select
              id="proposedDevelopment"
              value={form.proposedDevelopment}
              onChange={(e) => set('proposedDevelopment', e.target.value)}
              className={styles.select}
            >
              <option value="RESIDENTIAL CUM SHOPLINE">RESIDENTIAL CUM SHOPLINE</option>
              <option value="COMMERCIAL">COMMERCIAL</option>
              <option value="RESIDENTIAL">RESIDENTIAL</option>
              <option value="INDUSTRIAL">INDUSTRIAL</option>
            </select>
          </div>
          <Field label="Land Bearing S.No." id="landBearingSno" value={form.landBearingSno} onChange={(v) => set('landBearingSno', v)} placeholder="e.g. 124" />
          <Field label="Land Bearing Plot No." id="landBearingPlotNo" value={form.landBearingPlotNo} onChange={(v) => set('landBearingPlotNo', v)} placeholder="e.g. 12" />
          <Field label="Village" id="landBearingVillage" value={form.landBearingVillage} onChange={(v) => set('landBearingVillage', v)} placeholder="e.g. Village Name" />
          <Field label="Taluka" id="landBearingTal" value={form.landBearingTal} onChange={(v) => set('landBearingTal', v)} placeholder="e.g. Vasai" />
          <Field label="District" id="landBearingDist" value={form.landBearingDist} onChange={(v) => set('landBearingDist', v)} placeholder="e.g. Palghar" />

          {/* Scheme & Permission */}
          <div className={styles.fieldGroup}>
            <label htmlFor="scheme" className={styles.label}>Scheme Type</label>
            <select
              id="scheme"
              value={form.scheme}
              onChange={(e) => set('scheme', e.target.value)}
              className={styles.select}
            >
              <option value="REGULAR PERMISSION">REGULAR PERMISSION</option>
              <option value="EWS LIG SCHEME">EWS LIG SCHEME</option>
              <option value="SRA">SRA</option>
              <option value="CLUSTER SCHEME">CLUSTER SCHEME</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="permissionType" className={styles.label}>Permission Type</label>
            <select
              id="permissionType"
              value={form.permissionType}
              onChange={(e) => set('permissionType', e.target.value)}
              className={styles.select}
            >
              <option value="CC">CC</option>
              <option value="RDP">RDP</option>
              <option value="OC">OC</option>
              <option value="EC">EC</option>
              <option value="FIRE">FIRE</option>
            </select>
          </div>

          {/* Owner Details */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ownerType" className={styles.label}>Owner Type</label>
            <select
              id="ownerType"
              value={form.ownerType}
              onChange={(e) => set('ownerType', e.target.value)}
              className={styles.select}
            >
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="MULTIPLE OWNER">MULTIPLE OWNER</option>
              <option value="PARTNERSHIP">PARTNERSHIP</option>
              <option value="PROPRIETOR">PROPRIETOR</option>
              <option value="LLP">LLP</option>
            </select>
          </div>

          <Field label="Applicant Name (Name / Middle / Surname)" id="applicantName" value={form.applicantName} onChange={(v) => set('applicantName', v)} placeholder="Full Applicant Name" />

          {/* Company & Registration */}
          <div className={styles.fieldGroup}>
            <label htmlFor="companyOwnerType" className={styles.label}>Company Registration Type</label>
            <select
              id="companyOwnerType"
              value={form.companyOwnerType}
              onChange={(e) => set('companyOwnerType', e.target.value)}
              className={styles.select}
            >
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="MULTIPLE OWNER">MULTIPLE OWNER</option>
              <option value="PARTNERSHIP">PARTNERSHIP</option>
              <option value="PROPRIETOR">PROPRIETOR</option>
              <option value="LLP">LLP</option>
            </select>
          </div>

          <Field label="Company PAN Card" id="companyPanCard" value={form.companyPanCard} onChange={(v) => set('companyPanCard', v)} placeholder="e.g. ABCDE1234F" />
          <Field label="GST No. Certificate" id="gstNoCertificate" value={form.gstNoCertificate} onChange={(v) => set('gstNoCertificate', v)} placeholder="GST Number" />

          {/* Members KYC */}
          <Field label="Member Aadhar Card" id="memberAadharCard" value={form.memberAadharCard} onChange={(v) => set('memberAadharCard', v)} placeholder="12-digit Aadhar" />
          <Field label="Member PAN Card" id="memberPanCard" value={form.memberPanCard} onChange={(v) => set('memberPanCard', v)} placeholder="10-digit PAN" />
          <Field label="Member Mobile No." id="memberMobileNo" value={form.memberMobileNo} onChange={(v) => set('memberMobileNo', v)} placeholder="Mobile Number" />

          {/* Authorized Person DSC */}
          <Field label="Authorized Person (DSC Person) Email ID" id="authorisedPersonEmail" type="email" value={form.authorisedPersonEmail} onChange={(v) => set('authorisedPersonEmail', v)} placeholder="dsc@example.com" />
          
          <div className={styles.fieldGroup}>
            <label htmlFor="requiredDigitalSignature" className={styles.label}>Required Digital Signature (Pen Drive)</label>
            <select
              id="requiredDigitalSignature"
              value={form.requiredDigitalSignature}
              onChange={(e) => set('requiredDigitalSignature', e.target.value)}
              className={styles.select}
            >
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </div>

          <Field label="Office Address" id="officeAdd" value={form.officeAdd} onChange={(v) => set('officeAdd', v)} placeholder="Office Address" />
          <Field label="Site Address" id="siteAdd" value={form.siteAdd} onChange={(v) => set('siteAdd', v)} placeholder="Site Address" />

          {/* Site Direction Photos */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
              <ImageField label="Site Photo - North Side" id="northPhoto" value={form.northPhoto} onChange={(v) => set('northPhoto', v)} />
              <div style={{ marginTop: '0.75rem' }}>
                <ImageField label="North Direction Details" id="northDetails" value={form.northDetails} onChange={(v) => set('northDetails', v)} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
              <ImageField label="Site Photo - South Side" id="southPhoto" value={form.southPhoto} onChange={(v) => set('southPhoto', v)} />
              <div style={{ marginTop: '0.75rem' }}>
                <ImageField label="South Direction Details" id="southDetails" value={form.southDetails} onChange={(v) => set('southDetails', v)} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
              <ImageField label="Site Photo - East Side" id="eastPhoto" value={form.eastPhoto} onChange={(v) => set('eastPhoto', v)} />
              <div style={{ marginTop: '0.75rem' }}>
                <ImageField label="East Direction Details" id="eastDetails" value={form.eastDetails} onChange={(v) => set('eastDetails', v)} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
              <ImageField label="Site Photo - West Side" id="westPhoto" value={form.westPhoto} onChange={(v) => set('westPhoto', v)} />
              <div style={{ marginTop: '0.75rem' }}>
                <ImageField label="West Direction Details" id="westDetails" value={form.westDetails} onChange={(v) => set('westDetails', v)} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
              <ImageField label="Road Photo" id="road" value={form.road} onChange={(v) => set('road', v)} />
              <div style={{ marginTop: '0.75rem' }}>
                <ImageField label="Road Details" id="roadDetails" value={form.roadDetails} onChange={(v) => set('roadDetails', v)} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)' }}>
              <ImageField label="Side Photo" id="side" value={form.side} onChange={(v) => set('side', v)} />
              <div style={{ marginTop: '0.75rem' }}>
                <ImageField label="Side Details" id="sideDetails" value={form.sideDetails} onChange={(v) => set('sideDetails', v)} />
              </div>
            </div>
          </div>

          {/* Secondary Details */}
          <Field label="S.No." id="sNo" value={form.sNo} onChange={(v) => set('sNo', v)} placeholder="Survey Number" />
          <Field label="H/PLOT.NO" id="hNo" value={form.hNo} onChange={(v) => set('hNo', v)} placeholder="Hissa / Plot Number" />
          <Field label="Village Name" id="village" value={form.village} onChange={(v) => set('village', v)} placeholder="Village" />
          <Field label="Taluka Name" id="tal" value={form.tal} onChange={(v) => set('tal', v)} placeholder="Taluka" />
          <Field label="Site Address (Secondary)" id="siteAddSecondary" value={form.siteAddSecondary} onChange={(v) => set('siteAddSecondary', v)} placeholder="Secondary Site Address" />
          <Field label="Project Name (RERA)" id="projectNameSecondary" value={form.projectNameSecondary} onChange={(v) => set('projectNameSecondary', v)} placeholder="RERA Project Name" />
          <Field label="Geo-Coordinates (Google Image)" id="geoCoordinates" value={form.geoCoordinates} onChange={(v) => set('geoCoordinates', v)} placeholder="Latitude, Longitude" />
          <Field label="Email ID (Secondary)" id="emailIdSecondary" type="email" value={form.emailIdSecondary} onChange={(v) => set('emailIdSecondary', v)} placeholder="Secondary Project Email" />
          <Field label="Whether Open Plot" id="whetherOpenPlot" value={form.whetherOpenPlot} onChange={(v) => set('whetherOpenPlot', v)} placeholder="Open plot status" />
          <Field label="Site Engineer Name" id="siteEng" value={form.siteEng} onChange={(v) => set('siteEng', v)} placeholder="Site Engineer" />
          <Field label="Regulations / Revised Dev. Permission" id="regulations" value={form.regulations} onChange={(v) => set('regulations', v)} placeholder="Regulations" />
          <Field label="Site Supervisor Name" id="siteSupervisor" value={form.siteSupervisor} onChange={(v) => set('siteSupervisor', v)} placeholder="Site Supervisor" />
          <Field label="Any Other" id="anyOther" value={form.anyOther} onChange={(v) => set('anyOther', v)} placeholder="Additional info" />
          <Field label="Contact Number" id="contactNo" value={form.contactNo} onChange={(v) => set('contactNo', v)} placeholder="Contact Number" />
          <Field label="Use Type" id="use" value={form.use} onChange={(v) => set('use', v)} placeholder="e.g. Residential" />
          <Field label="No. of Buildings" id="noOfBldgs" value={form.noOfBldgs} onChange={(v) => set('noOfBldgs', v)} placeholder="Total buildings" />
          <Field label="Floor Count" id="floor" value={form.floor} onChange={(v) => set('floor', v)} placeholder="Number of floors" />


          <Field label="P-Line" id="pLine" value={form.pLine} onChange={(v) => set('pLine', v)} placeholder="P-Line details" />
          <Field label="Architect Name" id="architect" value={form.architect} onChange={(v) => set('architect', v)} placeholder="Architect" />
          <Field label="Structural Engineer Name" id="structuralEngName" value={form.structuralEngName} onChange={(v) => set('structuralEngName', v)} placeholder="Structural Engineer" />
          <div className={styles.fieldGroup}>
            <label htmlFor="isDigitalSignature" className={styles.label}>Is Digital Signature Available</label>
            <select
              id="isDigitalSignature"
              value={form.isDigitalSignature}
              onChange={(e) => set('isDigitalSignature', e.target.value)}
              className={styles.select}
            >
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </div>
          {form.isDigitalSignature === 'YES' && (
            <ImageField label="Digital Signature Photo" id="digitalSignaturePhoto" value={form.digitalSignaturePhoto} onChange={(v) => set('digitalSignaturePhoto', v)} />
          )}
        </div>
      </Section>

      <Section title="Notes">
        <div className={styles.fieldGroup}>
          <label htmlFor="notes" className={styles.label}>Internal Notes</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional notes about this client…"
            rows={4}
            className={styles.textarea}
          />
        </div>
      </Section>

      <div className={styles.actions}>
        <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" className={styles.submitBtn}>
          {mode === 'new' ? '+ Create Client' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, id, value, onChange, placeholder, type = 'text',
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
}

function ImageField({
  label, id, value, onChange
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = `kyc-files/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error } = await supabase.storage.from('uka-storage').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

      if (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('uka-storage').getPublicUrl(path);
      onChange(publicUrl);
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const getMime = (): string => {
    if (value.startsWith('data:')) {
      const m = value.match(/^data:([^;,]+)/);
      return m ? m[1] : 'application/octet-stream';
    }
    const ext = value.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const extMap: Record<string, string> = {
      pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
      jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      heic: 'image/heic', heif: 'image/heif', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return extMap[ext] || 'application/octet-stream';
  };

  const isPdf = getMime() === 'application/pdf';
  const isDocx = getMime() === 'application/msword' || getMime().includes('wordprocessingml');
  const isHeic = getMime() === 'image/heic' || getMime() === 'image/heif';
  const isOctet = getMime() === 'application/octet-stream';

  const toBlobUrl = (forceMime?: string): string => {
    if (value.startsWith('data:')) {
      try {
        const comma = value.indexOf(',');
        const b64 = value.slice(comma + 1);
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: forceMime || getMime() }));
      } catch { return value; }
    }
    return value;
  };

  const handleDownload = () => {
    const ext = isPdf ? 'pdf' : isDocx ? 'docx' : isHeic ? 'heic' : 'jpg';
    const filename = `${label.replace(/\s+/g, '_')}.${ext}`;
    
    if (value.startsWith('data:')) {
      const url = toBlobUrl();
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      fetch(value).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }).catch(() => window.open(value, '_blank'));
    }
  };

  const handleView = () => {
    if (isDocx) { handleDownload(); return; }
    if (value.startsWith('data:')) {
      const viewMime = isHeic || isOctet ? 'image/jpeg' : getMime();
      const url = toBlobUrl(viewMime);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      window.open(value, '_blank');
    }
  };

  return (
    <div className={styles.fieldGroup} style={{ gridColumn: 'span 1' }}>
      <label className={styles.label}>{label}</label>
      {value ? (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          {value === '[BASE64_STRIPPED]' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 0' }}>
              <FileText size={32} color="var(--text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Please re-upload</span>
            </div>
          ) : isPdf ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 0' }}>
              <FileText size={32} color="#ef4444" />
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>PDF Document</span>
            </div>
          ) : isDocx ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 0' }}>
              <FileText size={32} color="#3b82f6" />
              <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>Word Document</span>
            </div>
          ) : isHeic || isOctet ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 0' }}>
              <ImageIcon size={32} color="#10b981" />
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>HEIC/HEIF Image</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 0' }}>
              <ImageIcon size={32} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>Uploaded File</span>
            </div>
          )}

          {value !== '[BASE64_STRIPPED]' && (
            <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
              {!isDocx && (
                <button type="button" onClick={handleView} style={{ flex: 1, padding: '6px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Eye size={12} /> View
                </button>
              )}
              <button type="button" onClick={handleDownload} style={{ flex: 1, padding: '6px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Download size={12} /> Download
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '6px',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background 0.15s ease'
            }}
          >
            Remove File
          </button>
        </div>
      ) : (
        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.01)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease',
          opacity: isUploading ? 0.7 : 1
        }}
        onClick={() => { if (!isUploading) document.getElementById(`file-${id}`)?.click(); }}
        >
          {isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Loader2 className={styles.spin} size={24} color="var(--primary)" />
              <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Uploading...</span>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Click to upload file</span>
              <input
                type="file"
                id={`file-${id}`}
                accept="image/*,.heic,.heif,.pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
