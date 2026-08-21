// Test all API keys and OpenRouter waterfall
// Run with: node scripts/test_api_keys.mjs
import fs from 'fs';
import path from 'path';

// Parse .env.local if present
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const OPENROUTER_KEY   = process.env.OPENROUTER_API_KEY;
const GEMINI_PRIMARY   = process.env.GEMINI_API_KEY;
const GEMINI_SECONDARY = process.env.GEMINI_API_KEY_SECONDARY;
const GROQ_KEY_1       = process.env.GROQ_API_KEY;
const GROQ_KEY_2       = process.env.GROQ_API_KEY_2;

async function testOpenRouter(modelName) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://ukamanagementsystem.com',
        'X-Title': 'UKA Management System',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Reply with just the word: OK' }],
        max_tokens: 10
      })
    });
    const data = await res.json();
    if (res.ok) {
      const reply = data.choices?.[0]?.message?.content?.trim();
      console.log(`✅ OpenRouter (${modelName}) → OK (reply: "${reply}")`);
    } else {
      console.log(`❌ OpenRouter (${modelName}) → FAILED (${res.status}): ${data.error?.message || JSON.stringify(data.error)}`);
    }
  } catch (err) {
    console.log(`❌ OpenRouter (${modelName}) → ERROR: ${err.message}`);
  }
}

async function testGemini(label, apiKey) {
  if (!apiKey) return console.log(`⚪ ${label} → Not configured`);
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
  if (!apiKey) return console.log(`⚪ ${label} → Not configured`);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: [{ role: 'user', content: 'Reply with just the word: OK' }],
        max_tokens: 10
      })
    });
    const data = await res.json();
    if (res.ok) {
      const reply = data.choices?.[0]?.message?.content?.trim();
      console.log(`✅ ${label} (groq/compound) → OK (reply: "${reply?.slice(0, 30)}")`);
    } else {
      console.log(`❌ ${label} → FAILED (${res.status}): ${data.error?.message}`);
    }
  } catch (err) {
    console.log(`❌ ${label} → ERROR: ${err.message}`);
  }
}

console.log('\n🔍 Testing API keys and fallback models for Bruce Wayne (Batman) Chat...\n');

if (OPENROUTER_KEY) {
  console.log('--- OpenRouter Models ---');
  await testOpenRouter('google/gemini-2.5-flash');
  await testOpenRouter('meta-llama/llama-3.3-70b-instruct');
  await testOpenRouter('openai/gpt-4o-mini');
  await testOpenRouter('deepseek/deepseek-chat');
  await testOpenRouter('qwen/qwen-2.5-72b-instruct');
  console.log('');
} else {
  console.log('❌ OPENROUTER_API_KEY is not set in .env.local\n');
}

console.log('--- Secondary / Emergency Fallbacks ---');
await testGroq('Groq Key 1', GROQ_KEY_1);
await testGroq('Groq Key 2', GROQ_KEY_2);
await testGemini('Gemini Direct', GEMINI_PRIMARY);
await testGemini('Gemini Backup', GEMINI_SECONDARY);

console.log('\n✅ All tests complete.\n');
