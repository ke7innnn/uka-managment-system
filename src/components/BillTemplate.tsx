import { useState } from "react";

const toWords = (num: number) => {
  if (isNaN(num) || num === 0) return "Zero Only";
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const crore = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? " " + a[n%10] : "") + " ";
    return a[Math.floor(n/100)] + " Hundred " + crore(n%100);
  };
  let result = "";
  const n = Math.round(num);
  if (n >= 10000000) result += crore(Math.floor(n/10000000)) + "Crore ";
  if (n >= 100000) result += crore(Math.floor((n%10000000)/100000)) + "Lakh ";
  if (n >= 1000) result += crore(Math.floor((n%100000)/1000)) + "Thousand ";
  result += crore(n%1000);
  return result.trim() + " Only";
};

const SQM_TO_SQFT = 10.7639;
const emptyFloor = () => ({ floor: "", areaSqmt: "", noOfFloors: 1 });

const defaultBuildings = [
  { name: "Building No. 1", floors: [
    { floor: "GROUND STILT AREA (50%)", areaSqmt: "206.745", noOfFloors: 1 },
    { floor: "GROUND FLOOR", areaSqmt: "169.68", noOfFloors: 1 },
    { floor: "1ST & 3RD FLOOR", areaSqmt: "663.08", noOfFloors: 3 },
    { floor: "4TH TO 15TH FLOOR", areaSqmt: "668.61", noOfFloors: 12 },
  ]},
  { name: "Building No. 2", floors: [
    { floor: "GROUND FLOOR", areaSqmt: "121.32", noOfFloors: 1 },
    { floor: "1ST FLOOR", areaSqmt: "126.24", noOfFloors: 1 },
    { floor: "2ND TO 7TH FLOOR", areaSqmt: "123.2", noOfFloors: 6 },
  ]},
];

const defaultForm = {
  billTo: "Mr. MAHESHWAR H. PATIL",
  invoiceNo: "UK/24-25/030",
  date: "2025-11-10",
  dueDate: "",
  subject: "BILL OF PROFESSIONAL CHARGES FOR DEVELOPMENT PERMISSION FOR COMMUNITY DEVELOPMENT BLDG. ON LAND S.NO.231 H.NO. 2,7,8,9 & 10, AT VILLAGE-NARINGI, TAL: VASAI, DIST.: PALGHAR.",
  refDesc: "LIASONING AMOUNT",
  percentageA: 1,
  liasoningFeePerSqft: 20,
  gstRate: 18,
  tdsRate: 10,
  prevPaid: 1684900,
};

const fmt = (n: number | string) => isNaN(Number(n)) ? "0.00" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Monochrome palette — pure black/white/gray scale
const C = {
  ink:       "#0a0a0a",   // near-black headings
  dark:      "#1a1a1a",   // table headers bg
  mid:       "#3a3a3a",   // secondary dark text
  border:    "#c0c0c0",   // table cell borders
  divider:   "#e0e0e0",   // section dividers
  stripe:    "#f4f4f4",   // alternate row fill
  stripe2:   "#ebebeb",   // slightly darker stripe for totals
  paper:     "#ffffff",   // cell bg
  soft:      "#f9f9f9",   // section bg
  muted:     "#888888",   // helper text
};

export default function BillTemplate() {
  const [form, setForm] = useState(defaultForm);
  const [buildings, setBuildings] = useState(defaultBuildings);

  const updateField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const updateFloor = (bIdx: number, fIdx: number, key: string, val: any) =>
    setBuildings(bs => bs.map((b, i) => i !== bIdx ? b : {
      ...b, floors: b.floors.map((fl, j) => j !== fIdx ? fl : { ...fl, [key]: val })
    }));
  const addFloor = (bIdx: number) => setBuildings(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, floors: [...b.floors, emptyFloor()] }));
  const removeFloor = (bIdx: number, fIdx: number) => setBuildings(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, floors: b.floors.filter((_, j) => j !== fIdx) }));
  const addBuilding = () => setBuildings(bs => [...bs, { name: `Building No. ${bs.length + 1}`, floors: [emptyFloor()] }]);
  const removeBuilding = (i: number) => setBuildings(bs => bs.filter((_, j) => j !== i));
  const updateBuildingName = (i: number, v: string) => setBuildings(bs => bs.map((b, j) => j !== i ? b : { ...b, name: v }));

  const buildingTotals = buildings.map(b => {
    const rows = b.floors.map(fl => {
      const area = parseFloat(String(fl.areaSqmt)) || 0;
      const n = parseInt(String(fl.noOfFloors)) || 0;
      const totalSqmt = area * n;
      return { ...fl, totalSqmt, totalSqft: totalSqmt * SQM_TO_SQFT };
    });
    return { rows, totalSqmt: rows.reduce((s,r) => s+r.totalSqmt, 0), totalSqft: rows.reduce((s,r) => s+r.totalSqft, 0) };
  });

  const grandSqmt = buildingTotals.reduce((s,b) => s+b.totalSqmt, 0);
  const grandSqft = buildingTotals.reduce((s,b) => s+b.totalSqft, 0);

  const fee      = parseFloat(String(form.liasoningFeePerSqft)) || 0;
  const gstRate  = parseFloat(String(form.gstRate)) || 0;
  const tdsRate  = parseFloat(String(form.tdsRate)) || 0;
  const prevPaid = parseFloat(String(form.prevPaid)) || 0;
  const totalD   = grandSqft * fee;
  const totalF   = totalD;
  const gstG     = (gstRate / 100) * totalD;
  const tdsH     = (tdsRate / 100) * totalD;
  const totalBilling = totalF + gstG + tdsH;
  const balance  = totalBilling - prevPaid;

  const inp = (extra: any = {}) => ({
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    padding: "3px 6px",
    fontSize: 11,
    background: C.paper,
    color: C.ink,
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    ...extra,
  });

  const TH = (extra: any = {}) => ({
    background: C.dark,
    color: "#ffffff",
    padding: "7px 8px",
    fontSize: 11,
    fontWeight: 600,
    textAlign: "center" as const,
    border: `1px solid ${C.mid}`,
    letterSpacing: "0.03em",
    ...extra,
  });

  const TD = (align: "center" | "left" | "right" = "center", bg = C.paper) => ({
    padding: "5px 8px",
    fontSize: 11,
    border: `1px solid ${C.border}`,
    textAlign: align,
    verticalAlign: "middle",
    background: bg,
    color: C.ink,
  });

  const sectionDivider = { borderTop: `1.5px solid ${C.ink}` };

  return (
    <div className="printable-bill-wrapper" style={{ fontFamily: "'Times New Roman', Georgia, serif", maxWidth: 900, margin: "0 auto", padding: "1rem", color: C.ink, background: "#fff", borderRadius: 8 }}>
      <style>{`
        @media print {
          /* 1. HIDE ABSOLUTELY EVERYTHING ON THE PAGE BY DEFAULT */
          body * {
            visibility: hidden !important;
          }

          /* 2. ONLY SHOW THE BILL AND ITS CHILDREN */
          .printable-bill-wrapper, .printable-bill-wrapper * {
            visibility: visible !important;
          }

          /* 3. POSITION THE BILL AT THE VERY TOP LEFT OF THE PAGE */
          .printable-bill-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .np { 
            display: none !important; 
            visibility: hidden !important; 
            opacity: 0 !important;
          }
          .bill-outer { 
            border-color: ${C.ink} !important;
            box-sizing: border-box;
          }
          /* Strip all input styling for print so it looks like pure text */
          input, textarea {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            appearance: none !important;
            -moz-appearance: none !important;
            -webkit-appearance: none !important;
          }
          /* Completely hide number spinners */
          input[type=number]::-webkit-inner-spin-button, 
          input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none !important; 
            margin: 0 !important; 
            display: none !important;
          }
          /* Prevent awkward page breaks */
          tr, td, th {
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: auto !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
          }
        }
        .erow:hover td { background: ${C.stripe} !important; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.6; }
        input:focus { outline: 1px solid ${C.mid}; }
      `}</style>

      {/* Toolbar */}
      <div className="np" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.muted, fontFamily: "sans-serif" }}>Pinnacle Studios — Bill Template</span>
        <button onClick={() => window.print()} style={{ marginLeft: "auto", padding: "5px 16px", fontSize: 11, background: C.ink, color: "#fff", border: "none", borderRadius: 2, cursor: "pointer", fontFamily: "sans-serif", letterSpacing: "0.04em" }}>
          Print / PDF
        </button>
        <button onClick={() => { setForm(defaultForm); setBuildings(defaultBuildings); }} style={{ padding: "5px 12px", fontSize: 11, border: `1px solid ${C.border}`, background: "transparent", color: C.mid, borderRadius: 2, cursor: "pointer", fontFamily: "sans-serif" }}>
          Reset
        </button>
      </div>

      <div className="bill-outer" style={{ border: `2px solid ${C.ink}` }}>

        {/* Header */}
        <div style={{ background: C.ink, color: "#fff", textAlign: "center", padding: "16px 20px" }} className="avoid-break">
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.06em" }}>M/S. UMESH KEKRE & ASSOCIATES</div>
          <div style={{ fontSize: 11, marginTop: 5, color: "#cccccc", letterSpacing: "0.02em" }}>
            ADD:- Shop no. 2, Kishor Kunj Building, Shastri Nagar, Near Vartak Polytechnic College, Vasai West.
          </div>
        </div>

        {/* GSTIN / PAN */}
        <div style={{ display: "flex", justifyContent: "space-between", background: C.stripe2, padding: "5px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 4 }} className="avoid-break">
          <span style={{ fontSize: 10.5 }}><b>GSTIN:</b> 27BIAPK5005L1ZD &nbsp;|&nbsp; <b>PAN:</b> BIAPK5005L</span>
          <span style={{ fontSize: 10.5 }}><b>Email:</b> umesh.s.kekre@gmail.com &nbsp;|&nbsp; <b>Contact:</b> 9860146006</span>
        </div>

        {/* Bill To / Invoice */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.border}` }} className="avoid-break">
          <div style={{ padding: "10px 16px", borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", color: C.mid }}>Bill To</div>
            <input style={inp({ fontSize: 12, fontWeight: 600, width: "100%" })} value={form.billTo} onChange={e => updateField("billTo", e.target.value)} placeholder="Client Name" />
          </div>
          <div style={{ padding: "10px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Invoice No.</div>
                <input style={inp({ width: "100%" })} value={form.invoiceNo} onChange={e => updateField("invoiceNo", e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Date</div>
                <input type="date" style={inp({ width: "100%" })} value={form.date} onChange={e => updateField("date", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Due Date (optional)</div>
                <input type="date" style={inp({ width: "100%" })} value={form.dueDate} onChange={e => updateField("dueDate", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Subject */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, background: C.soft }} className="avoid-break">
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", paddingTop: 4 }}>SUB: </span>
            <textarea style={{ ...inp(), resize: "none", minHeight: 40, fontFamily: "inherit", fontSize: 11, width: "100%", overflow: "hidden" }} value={form.subject} onChange={e => updateField("subject", e.target.value)} rows={2} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>REF: </span>
            <input style={{ ...inp(), maxWidth: 280 }} value={form.refDesc} onChange={e => updateField("refDesc", e.target.value)} />
          </div>
        </div>

        {/* Buildings */}
        <div style={{ padding: "12px 16px" }}>
          {buildings.map((bldg, bIdx) => {
            const bt = buildingTotals[bIdx];
            return (
              <div key={bIdx} style={{ marginBottom: 20 }} className="avoid-break">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input style={{ ...inp({ width: 200, fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", background: "transparent", border: "none", padding: 0 }) }} value={bldg.name} onChange={e => updateBuildingName(bIdx, e.target.value)} />
                  {buildings.length > 1 && (
                    <button className="np" onClick={() => removeBuilding(bIdx)} style={{ fontSize: 10, padding: "2px 8px", background: C.stripe2, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", fontFamily: "sans-serif", marginLeft: "auto" }}>Remove</button>
                  )}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={TH({ width: "8%" })}>Sr.</th>
                      <th style={TH({ textAlign: "left", width: "35%" })}>Floor</th>
                      <th style={TH({ width: "17%" })}>Area (Sq. Mtr)</th>
                      <th style={TH({ width: "12%" })}>No. of Floors</th>
                      <th style={TH({ width: "14%" })}>Total (Sq. Mtr)</th>
                      <th style={TH({ width: "14%" })}>Total (Sq. Ft)</th>
                      <th style={{ ...TH({ width: "5%" }), display: "none" }} className="np"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bt.rows.map((row, fIdx) => (
                      <tr key={fIdx} className="erow">
                        <td style={TD()}>{fIdx + 1}</td>
                        <td style={TD("left")}>
                          <input style={inp({ width: "100%", border: "none", background: "transparent" })} value={bldg.floors[fIdx].floor} onChange={e => updateFloor(bIdx, fIdx, "floor", e.target.value)} placeholder="Floor name" />
                        </td>
                        <td style={TD()}>
                          <input type="number" step="0.001" style={inp({ textAlign: "right", width: "100%", border: "none", background: "transparent" })} value={bldg.floors[fIdx].areaSqmt} onChange={e => updateFloor(bIdx, fIdx, "areaSqmt", e.target.value)} />
                        </td>
                        <td style={TD()}>
                          <input type="number" min="1" style={inp({ textAlign: "center", width: "100%", border: "none", background: "transparent" })} value={bldg.floors[fIdx].noOfFloors} onChange={e => updateFloor(bIdx, fIdx, "noOfFloors", e.target.value)} />
                        </td>
                        <td style={TD("right")}><b>{fmt(row.totalSqmt)}</b></td>
                        <td style={TD("right")}><b>{fmt(row.totalSqft)}</b></td>
                        <td style={{ ...TD(), display: "none" }} className="np">
                          {bt.rows.length > 1 && (
                            <button onClick={() => removeFloor(bIdx, fIdx)} style={{ fontSize: 10, padding: "1px 5px", background: C.stripe2, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer" }}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="avoid-break">
                      <td colSpan={4} style={{ ...TD("right", C.stripe2), fontWeight: 700, letterSpacing: "0.04em" }}>TOTAL</td>
                      <td style={{ ...TD("right", C.stripe2), fontWeight: 700 }}>{fmt(bt.totalSqmt)}</td>
                      <td style={{ ...TD("right", C.stripe2), fontWeight: 700 }}>{fmt(bt.totalSqft)}</td>
                      <td className="np" style={{ ...TD(), display: "none" }}></td>
                    </tr>
                  </tbody>
                </table>
                <button className="np" onClick={() => addFloor(bIdx)} style={{ marginTop: 4, fontSize: 10.5, padding: "3px 10px", background: "transparent", color: C.mid, border: `1px dashed ${C.border}`, borderRadius: 2, cursor: "pointer", fontFamily: "sans-serif" }}>+ Add Floor Row</button>
              </div>
            );
          })}

          <button className="np" onClick={addBuilding} style={{ fontSize: 10.5, padding: "4px 14px", background: "transparent", color: C.mid, border: `1px dashed ${C.border}`, borderRadius: 2, cursor: "pointer", marginBottom: 8, fontFamily: "sans-serif" }}>+ Add Building</button>

          {/* Grand Total Row */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 2, tableLayout: "fixed" }} className="avoid-break">
            <tbody>
              <tr>
                <td colSpan={4} style={{ ...TD("right", C.ink), width: "72%", color: "#fff", fontWeight: 700, border: `1px solid ${C.mid}`, letterSpacing: "0.04em", fontSize: 11 }}>TOTAL BLDG-1 & BLDG-2</td>
                <td style={{ ...TD("right", C.ink), width: "14%", color: "#fff", fontWeight: 700, border: `1px solid ${C.mid}` }}>{fmt(grandSqmt)}</td>
                <td style={{ ...TD("right", C.ink), width: "14%", color: "#fff", fontWeight: 700, border: `1px solid ${C.mid}` }}>{fmt(grandSqft)}</td>
                <td className="np" style={{ ...TD(), display: "none", background: C.ink, border: `1px solid ${C.mid}` }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount Calculation */}
        <div style={{ padding: "12px 16px", ...sectionDivider }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={TH({ width: "6%" })}></th>
                <th style={TH({ textAlign: "left", width: "45%" })}>Description</th>
                <th style={TH({ width: "24%" })}>Formula</th>
                <th style={TH({ width: "25%" })}>Amount Details</th>
                <th style={{ ...TH({ width: "0%" }), display: "none" }} className="np"></th>
              </tr>
            </thead>
            <tbody>
              {[
                { lbl: "A.", desc: "Percentage %", formula: "", cell: <input type="number" step="0.01" style={inp({ textAlign: "right", width: "100%", border: "none", background: "transparent" })} value={form.percentageA} onChange={e => updateField("percentageA", e.target.value)} />, bg: C.paper },
                { lbl: "B.", desc: "Construction Area In Sq. ft", formula: "Auto", cell: <span style={{ fontWeight: 600 }}>{fmt(grandSqft)} SQ.FT</span>, bg: C.stripe },
                { lbl: "C.", desc: "Liasoning Fees Per Sq. ft", formula: "", cell: <input type="number" style={inp({ textAlign: "right", width: "100%", border: "none", background: "transparent" })} value={form.liasoningFeePerSqft} onChange={e => updateField("liasoningFeePerSqft", e.target.value)} />, bg: C.paper },
                { lbl: "D.", desc: "Total", formula: "D = B × C", cell: <b>₹ {fmt(totalD)}</b>, bg: C.stripe },
                { lbl: "F.", desc: "Total", formula: "F = D + E", cell: <b>₹ {fmt(totalF)}</b>, bg: C.stripe },
              ].map(({ lbl, desc, formula, cell, bg }) => (
                <tr key={lbl} className="avoid-break">
                  <td style={{ ...TD("center", bg), fontWeight: 700 }}>{lbl}</td>
                  <td style={TD("left", bg)}>{desc}</td>
                  <td style={{ ...TD("center", bg), color: C.muted, fontStyle: "italic", fontSize: 10.5 }}>{formula}</td>
                  <td style={TD("right", bg)}>{cell}</td>
                  <td className="np" style={{ ...TD("center", bg), display: "none" }}></td>
                </tr>
              ))}

              <tr className="avoid-break">
                <td style={{ ...TD(), fontWeight: 700 }}>G.</td>
                <td style={TD("left")}>GST <input type="number" style={inp({ display: "inline-block", width: 40, padding: 0, border: "none", background: "transparent", textAlign: "center" })} value={form.gstRate} onChange={e => updateField("gstRate", e.target.value)} />% of (D)</td>
                <td style={{ ...TD(), color: C.muted, fontStyle: "italic", fontSize: 10.5 }}>G = {form.gstRate}% of D</td>
                <td style={{ ...TD("right"), fontWeight: 700 }}>₹ {fmt(gstG)}</td>
                <td className="np" style={{ ...TD(), display: "none" }}></td>
              </tr>
              <tr className="avoid-break">
                <td style={{ ...TD(), fontWeight: 700 }}>H.</td>
                <td style={TD("left")}>TDS <input type="number" style={inp({ display: "inline-block", width: 40, padding: 0, border: "none", background: "transparent", textAlign: "center" })} value={form.tdsRate} onChange={e => updateField("tdsRate", e.target.value)} />% of (D)</td>
                <td style={{ ...TD(), color: C.muted, fontStyle: "italic", fontSize: 10.5 }}>H = {form.tdsRate}% of D</td>
                <td style={{ ...TD("right"), fontWeight: 700 }}>₹ {fmt(tdsH)}</td>
                <td className="np" style={{ ...TD(), display: "none" }}></td>
              </tr>

              {/* Total Billing — inverted */}
              <tr className="avoid-break">
                <td style={{ ...TD("center", C.ink), color: "#fff", fontWeight: 700, border: `1px solid ${C.mid}` }}>I.</td>
                <td style={{ ...TD("left", C.ink), color: "#fff", border: `1px solid ${C.mid}` }}>Total Billing</td>
                <td style={{ ...TD("center", C.ink), color: "#aaa", fontStyle: "italic", fontSize: 10.5, border: `1px solid ${C.mid}` }}>I = F + G + H</td>
                <td style={{ ...TD("right", C.ink), color: "#fff", fontWeight: 700, fontSize: 13, border: `1px solid ${C.mid}` }}>₹ {fmt(totalBilling)}</td>
                <td className="np" style={{ ...TD(), display: "none", background: C.ink, border: `1px solid ${C.mid}` }}></td>
              </tr>

              <tr className="avoid-break">
                <td style={{ ...TD(), fontWeight: 700 }}>J.</td>
                <td style={TD("left")}>Previously Paid Amount</td>
                <td style={{ ...TD(), color: C.muted }}></td>
                <td style={TD("right")}><input type="number" style={inp({ textAlign: "right", width: "100%", border: "none", background: "transparent" })} value={form.prevPaid} onChange={e => updateField("prevPaid", e.target.value)} /></td>
                <td className="np" style={{ ...TD(), display: "none" }}></td>
              </tr>

              {/* Balance — double border top */}
              <tr className="avoid-break">
                <td style={{ ...TD("center", C.stripe2), fontWeight: 700, borderTop: `2px solid ${C.ink}` }}>K.</td>
                <td style={{ ...TD("left", C.stripe2), borderTop: `2px solid ${C.ink}` }}>Balance Amount</td>
                <td style={{ ...TD("center", C.stripe2), color: C.muted, fontStyle: "italic", fontSize: 10.5, borderTop: `2px solid ${C.ink}` }}>K = I − J</td>
                <td style={{ ...TD("right", C.stripe2), fontWeight: 700, fontSize: 13, borderTop: `2px solid ${C.ink}` }}>₹ {fmt(balance)}</td>
                <td className="np" style={{ ...TD(), display: "none", background: C.stripe2, borderTop: `2px solid ${C.ink}` }}></td>
              </tr>
              <tr className="avoid-break">
                <td style={{ ...TD("center", C.stripe2), fontWeight: 700 }}>L.</td>
                <td style={TD("left", C.stripe2)}>Amount for P.C.C. to O.C = 100%</td>
                <td style={{ ...TD("center", C.stripe2), color: C.muted, fontStyle: "italic", fontSize: 10.5 }}>L = K × 100%</td>
                <td style={{ ...TD("right", C.stripe2), fontWeight: 700, fontSize: 13 }}>₹ {fmt(balance)}</td>
                <td className="np" style={{ ...TD("center", C.stripe2), display: "none" }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div style={{ padding: "8px 16px", background: C.stripe, borderTop: `1px solid ${C.border}` }} className="avoid-break">
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em" }}>Amount in Words: </span>
          <span style={{ fontSize: 11.5, fontStyle: "italic" }}>{toWords(Math.round(balance))}</span>
        </div>

        {/* Bank + Signatory */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${C.border}` }} className="avoid-break">
          <div style={{ padding: "12px 16px", borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Bank Details</div>
            <div style={{ fontSize: 10.5, lineHeight: 2, color: C.mid }}>
              UMESH KEKRE & ASSOCIATES<br />
              A/C NO: 50200095485421<br />
              IFSC CODE: HDFC0008922<br />
              BRANCH: PARNAKA &nbsp;|&nbsp; CODE: 8922
            </div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ height: 40 }}></div>
              <div style={{ borderTop: `1px solid ${C.ink}`, paddingTop: 6, fontSize: 10.5, minWidth: 200, letterSpacing: "0.03em" }}>
                For M/S. UMESH KEKRE & ASSOCIATES
              </div>
              <div style={{ fontSize: 10, marginTop: 2, color: C.muted }}>Authorised Signatory</div>
            </div>
          </div>
        </div>

      </div>

      <div className="np" style={{ marginTop: 10, padding: "8px 12px", background: C.soft, border: `1px solid ${C.divider}`, borderRadius: 2, fontSize: 10.5, color: C.muted, fontFamily: "sans-serif" }}>
        Editable: Bill To · Invoice No. · Date · Subject · Floor names · Area · No. of Floors · Fee/Sqft · GST% · TDS% · Previously Paid — amounts auto-calculate.
      </div>
    </div>
  );
}
