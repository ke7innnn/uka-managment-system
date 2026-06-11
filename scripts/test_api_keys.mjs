// Test all 4 API keys
// Run with: node scripts/test_api_keys.mjs

// Keys are read from environment variables — set them before running:
// export GEMINI_API_KEY=... GEMINI_API_KEY_SECONDARY=... GROQ_API_KEY=... GROQ_API_KEY_2=...
const GEMINI_PRIMARY   = process.env.GEMINI_API_KEY;
const GEMINI_SECONDARY = process.env.GEMINI_API_KEY_SECONDARY;
const GROQ_KEY_1       = process.env.GROQ_API_KEY;
const GROQ_KEY_2       = process.env.GROQ_API_KEY_2;

async function testGemini(label, apiKey) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with just the word: OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      }
    );
    const data = await res.json();
    if (res.ok) {
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(`✅ ${label} → OK (reply: "${reply}")`);
    } else {
      console.log(`❌ ${label} → FAILED (${res.status}): ${data.error?.message}`);
    }
  } catch (err) {
    console.log(`❌ ${label} → ERROR: ${err.message}`);
  }
}

async function testGroq(label, apiKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Reply with just the word: OK' }],
        max_tokens: 10
      })
    });
    const data = await res.json();
    if (res.ok) {
      const reply = data.choices?.[0]?.message?.content?.trim();
      console.log(`✅ ${label} (llama-3.3-70b-versatile) → OK (reply: "${reply}")`);
    } else {
      console.log(`❌ ${label} → FAILED (${res.status}): ${data.error?.message}`);
    }
  } catch (err) {
    console.log(`❌ ${label} → ERROR: ${err.message}`);
  }
}

console.log('\n🔍 Testing all API keys for UKA Chatbot waterfall...\n');

await testGemini('Gemini Paid (Primary)    ', GEMINI_PRIMARY);
await testGroq  ('Groq Key 1               ', GROQ_KEY_1);
await testGroq  ('Groq Key 2               ', GROQ_KEY_2);
await testGemini('Gemini Free (Secondary)  ', GEMINI_SECONDARY);

console.log('\n✅ Test complete.\n');
