// ─────────────────────────────────────────────────────────────────────────────
// UKA Chatbot — Stress Test (30 rapid-fire admin questions)
// Run: node scripts/stress_test_chat.mjs
// ─────────────────────────────────────────────────────────────────────────────

// Keys are read from environment variables — set them before running:
// export GEMINI_API_KEY=... GEMINI_API_KEY_SECONDARY=... GROQ_API_KEY=... GROQ_API_KEY_2=...
const GEMINI_PRIMARY   = process.env.GEMINI_API_KEY;
const GEMINI_SECONDARY = process.env.GEMINI_API_KEY_SECONDARY;
const GROQ_KEY_1       = process.env.GROQ_API_KEY;
const GROQ_KEY_2       = process.env.GROQ_API_KEY_2;

// ── Realistic UKA System Data (same format app sends to API) ─────────────────
const STAFF_TEXT = `
- Umesh Pimenta (Architect): Tasks: ✓ Submit CC drawings, ☐ Review OC docs, ✓ Client meeting
- Sadhana Kanojiya (Admin): Tasks: ✓ Update client KYC, ☐ File 7/12 extract, ☐ Follow up NOC
- Uzaid Khan (Site Engineer): Tasks: ✓ Site survey Chirag project, ☐ Upload photos, ✓ Submit report
- Vrushali Madam (Coordinator): Tasks: ☐ Form WhatsApp group, ✓ Coordinate municipality, ☐ Pending approvals
`.trim();

const CLIENTS_TEXT = `
[Chirag Heights] Client: Chirag Shah | Status: active | Priority: high | UIN: VVC/2024/001 | TILR: pending
  * Phase: CC Application [completed]
  * Phase: RDP Submission [in-progress]
    - ✓ Submit structural drawings
    - ☐ Get fire NOC clearance
    - ☐ Submit to municipality
  * Docs: [Uploaded: 1/5/2024] 7-12 Extract | [Uploaded: 2/3/2024] Title Search | [Uploaded: 3/1/2024] Sale Permit

[Shreeram Residency] Client: Shreeram Patil | Status: active | Priority: medium | UIN: VVC/2024/002
  * Phase: OC Application [in-progress]
    - ✓ Appendix G submitted
    - ✓ Fire NOC obtained
    - ☐ Lift NOC pending
    - ☐ Tree authority NOC pending
  * Docs: [Uploaded: 1/10/2024] Completion Drawing | [Uploaded: 2/15/2024] RCC Certificate

[Umesh Villa] Client: Umesh Sharma | Status: on-hold | Priority: low
  * Phase: CC Application [pending]
  * Docs: [Uploaded: 4/1/2024] 7-12 Extract

[Patel Complex] Client: Rajesh Patel | Status: active | Priority: high | UIN: VVC/2024/005
  * Phase: TiLR Filing [in-progress]
    - ✓ Documents submitted
    - ☐ Awaiting municipality response
  * Docs: [Uploaded: 3/20/2024] Advocate Report | [Uploaded: 3/25/2024]8A Extract

[Green Meadows] Client: Sunita Verma | Status: completed | Priority: low
  * Phase: OC Received [completed]
`.trim();

const WORKSPACE_TEXT = `
[6/10/2024, 10:00 AM] Umesh: CC drawings for Chirag Heights submitted to municipality today
[6/10/2024, 11:30 AM] Sadhana: 7/12 extract for Patel Complex is still pending from tehsildar office
[6/10/2024, 2:00 PM] Uzaid: Site photos uploaded for Chirag Heights phase 2
[6/11/2024, 9:00 AM] Vrushali Madam: Municipality follow-up done for Shreeram Residency, waiting 3 more days
[6/11/2024, 10:15 AM] Umesh: Lift NOC application submitted for Shreeram, should take 2 weeks
`.trim();

const ALERTS_TEXT = `
[WARNING] Delayed Task - Sadhana Kanojiya has 2 overdue tasks older than 7 days
[INFO] High Priority - Patel Complex TiLR response expected this week
[WARNING] OC Pending - Shreeram Residency Lift NOC has been pending for 3 weeks
`.trim();

// ── 30 realistic admin questions ─────────────────────────────────────────────
const ADMIN_QUESTIONS = [
  "Which projects are currently active?",
  "What is the status of Chirag Heights?",
  "Who is handling the Shreeram Residency project?",
  "What documents are still pending for Shreeram Residency OC?",
  "Which staff has overdue tasks?",
  "What is Uzaid Khan working on right now?",
  "How many clients do we have in total?",
  "Which project has the highest priority?",
  "What phase is Patel Complex in?",
  "Is Umesh Villa still on hold?",
  "What was the last workspace message?",
  "When was the 7/12 extract uploaded for Chirag Heights?",
  "Who submitted the CC drawings for Chirag Heights?",
  "What is the UIN of Patel Complex?",
  "Give me a summary of all active projects",
  "Which projects have OC in progress?",
  "How many tasks does Sadhana Kanojiya have?",
  "What NOCs are still pending for Shreeram Residency?",
  "When did Uzaid upload site photos?",
  "What alerts are there in the system?",
  "Is Green Meadows project completed?",
  "Who should I follow up with about the TiLR?",
  "What is the TILR status of Chirag Heights?",
  "List all staff members and their roles",
  "Which tasks are not yet completed for Uzaid Khan?",
  "How many documents has Chirag Heights uploaded?",
  "What did Vrushali Madam say in the workspace?",
  "Are there any high priority alerts?",
  "Which client has a completed phase?",
  "Give me an overall status report of the firm today",
];

// ── Provider Callers ──────────────────────────────────────────────────────────
const makeSystemPrompt = () => `
You are Bruce Wayne, a smart AI assistant for an architecture firm.
[CURRENT SYSTEM DATE AND TIME: ${new Date().toLocaleString()}]

--- STAFF DIRECTORY & PERFORMANCE ---
${STAFF_TEXT}

--- CLIENTS & ACTIVE PROJECTS ---
${CLIENTS_TEXT}

--- RECENT TEAM WORKSPACE MESSAGES ---
${WORKSPACE_TEXT}

--- STAFF PERFORMANCE ALERTS ---
${ALERTS_TEXT}

INSTRUCTIONS: Keep responses very short (1-3 lines). Be accurate and factual.
`.trim();

async function callGemini(label, apiKey, question) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: makeSystemPrompt() }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
      })
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${data.error?.message}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function callGroq(label, apiKey, question) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: makeSystemPrompt() },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${data.error?.message}`);
  return data.choices?.[0]?.message?.content?.trim();
}

// ── Waterfall (same logic as production route.ts) ────────────────────────────
async function askWithWaterfall(question) {
  const providers = [
    { name: 'Gemini Paid',  fn: () => callGemini('Gemini Paid',  GEMINI_PRIMARY,   question) },
    { name: 'Groq Key 1',   fn: () => callGroq(  'Groq Key 1',   GROQ_KEY_1,       question) },
    { name: 'Groq Key 2',   fn: () => callGroq(  'Groq Key 2',   GROQ_KEY_2,       question) },
    { name: 'Gemini Free',  fn: () => callGemini('Gemini Free',  GEMINI_SECONDARY, question) },
  ];

  for (const p of providers) {
    try {
      const reply = await p.fn();
      if (reply) return { provider: p.name, reply };
    } catch (err) {
      // silently fall to next
    }
  }
  return { provider: 'NONE', reply: null };
}

// ── Run Stress Test ───────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

console.log('\n🧪 UKA Chatbot — 30-Question Stress Test\n');
console.log('='.repeat(70));

for (let i = 0; i < ADMIN_QUESTIONS.length; i++) {
  const q = ADMIN_QUESTIONS[i];
  const qNum = String(i + 1).padStart(2, '0');
  
  const start = Date.now();
  const { provider, reply } = await askWithWaterfall(q);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (reply) {
    console.log(`✅ Q${qNum} [${elapsed}s via ${provider}] "${q.substring(0, 50)}..."`);
    console.log(`   → ${reply.substring(0, 120).replace(/\n/g, ' ')}...\n`);
    passed++;
  } else {
    console.log(`❌ Q${qNum} FAILED — All providers exhausted for: "${q}"\n`);
    failures.push(qNum + ': ' + q);
    failed++;
  }

  // Small delay to avoid slamming APIs simultaneously
  await new Promise(r => setTimeout(r, 200));
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('='.repeat(70));
console.log(`\n📊 RESULTS: ${passed}/30 passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log('❌ Failed questions:');
  failures.forEach(f => console.log('  - ' + f));
  console.log('\n⚠️  DO NOT push to repo — fix failures first!\n');
} else {
  console.log('🎉 ALL 30 QUESTIONS PASSED — Safe to push to repo!\n');
}
