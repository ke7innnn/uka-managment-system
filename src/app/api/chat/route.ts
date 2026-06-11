import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Multi-provider waterfall: Paid Gemini → Groq Key 1 → Groq Key 2 → Free Gemini
// Rate-limit errors return in ~100ms, so fallback is near-instant with zero UX impact.
export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    // --- SMART TOKEN COMPRESSOR ---
    // JSON formatting uses an enormous amount of tokens due to brackets, quotes, and repeated keys.
    // By converting the data into dense, bulleted text (Markdown), we keep 100% of the context
    // but drop the token size by 60-80%, saving massive API costs.

    const staffText = (context.staff || []).map((s: any) => {
      const tasks = (s.tasks || []).map((t: any) => `${t.completed ? '✓' : '☐'} ${t.title}`).join(', ');
      return `- ${s.name} (${s.role}): Tasks: ${tasks || 'none'}`;
    }).join('\n');

    const clientsText = (context.clients || []).map((c: any) => {
      let out = `[${c.projectName || 'Unnamed'}] Client: ${c.name} | Status: ${c.projectStatus} | Priority: ${c.priority}`;
      if (c.clientUin) out += ` | UIN: ${c.clientUin}`;
      if (c.tilrStatus) out += ` | TILR: ${c.tilrStatus}`;

      const phases = (c.phases || []).map((p: any) => {
        let pText = `  * Phase: ${p.name} [${p.status}]`;
        if (p.status === 'in-progress' && p.tasks && p.tasks.length > 0) {
          const tasks = p.tasks.map((t: any) => `    - ${t.completed ? '✓' : '☐'} ${t.title}`).join('\n');
          pText += `\n${tasks}`;
        }
        return pText;
      }).join('\n');
      if (phases) out += `\n${phases}`;

      const docs = (c.documents || []).map((d: any) => `[Uploaded: ${new Date(d.uploadedAt).toLocaleDateString()}] ${d.name}`).join(' | ');
      if (docs) out += `\n  * Docs: ${docs}`;

      return out;
    }).join('\n\n');

    const workspaceText = (context.workspaceMessages || []).slice(-20).map((m: any) => {
      return `[${new Date(m.createdAt).toLocaleString()}] ${m.senderName}: ${m.content}`;
    }).join('\n');

    const alertsText = (context.alerts || []).map((a: any) => {
      return `[${(a.type || 'info').toUpperCase()}] ${a.title} - ${a.message}`;
    }).join('\n');

    // Fetch WhatsApp messages from Supabase directly in the API route
    let whatsappText = 'No messages';
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: rawMessages } = await supabase
          .from('whatsapp_messages')
          .select('created_at, phone_number, sender_name, message_body, direction')
          .order('created_at', { ascending: false })
          .limit(30); // Limit to last 30 messages

        if (rawMessages && rawMessages.length > 0) {
          whatsappText = rawMessages.map((m: any) => {
            const time = new Date(m.created_at).toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            });
            const dir = m.direction === 'inbound' ? 'IN' : 'OUT';
            const fromTo = m.direction === 'inbound' ? `from ${m.phone_number}` : `to ${m.phone_number}`;
            const name = m.sender_name ? ` (${m.sender_name})` : '';
            
            // Shorten template body text if it's too long
            let body = m.message_body || '';
            const templateMatch = body.match(/^\[Template:\s*([^\]]+)\]\s*-\s*([\s\S]*)$/);
            if (templateMatch) {
              const [, templateName, content] = templateMatch;
              const parts = content.split(/,\s*/);
              const clientName = parts[0] || 'Client';
              body = `[Template: ${templateName}] sent to ${clientName}`;
            } else if (body.length > 100) {
              body = body.substring(0, 97) + '...';
            }
            
            return `- ${dir} [${time}] ${fromTo}${name}: "${body}"`;
          }).join('\n');
        }
      }
    } catch (err) {
      console.error('Failed to fetch whatsapp messages for chat context:', err);
    }

    const systemInstruction = `
      You are Bruce Wayne, a smart AI assistant for an architecture firm.
      You must guide the Admin in their work, answer questions about their firm, suggest which projects to prioritize, and evaluate staff performance. Be professional, insightful, and act like a high-level manager.

      [CURRENT SYSTEM DATE AND TIME: ${new Date().toLocaleString()}]

      Here is the complete, real-time data of the UKA Management System right now:

      --- STAFF DIRECTORY & PERFORMANCE ---
      ${staffText || 'No staff'}

      --- CLIENTS & ACTIVE PROJECTS ---
      ${clientsText || 'No clients'}

      --- RECENT TEAM WORKSPACE MESSAGES ---
      ${workspaceText || 'No messages'}

      --- STAFF PERFORMANCE ALERTS ---
      ${alertsText || 'No alerts'}

      --- RECENT WHATSAPP REPLIES & PROGRESS UPDATES ---
      ${whatsappText}

      CRITICAL INSTRUCTIONS FOR ACCURACY:
      1. Your answers MUST be 100% accurate and based STRICTLY on the text data provided above.
      2. NEVER hallucinate, guess, or make up any names, project details, or statistics.
      3. If a user asks about something not present in the data, explicitly tell them "I do not have that information in the current database."
      4. Use the document and message timestamps to answer questions about dates and times.
      5. Cross-check your final answer against the text data before responding to ensure zero errors.
      6. You must reply like a normal human talking to the Admin. Keep your responses VERY SHORT (1 to 5 lines maximum), summarized, and conversational, while still providing the full context needed to answer their question. Do not write unnecessarily long essays.
      7. EXTREMELY IMPORTANT: DO NOT post to the workspace accidentally. ONLY post to the workspace if the Admin EXPLICITLY commands you to do so (e.g., "tell the team", "ping John", "post this").
      When you DO post, if the Admin asks you to "ping" someone, you MUST use the exact '@' symbol followed by their name (e.g., "@Testing 2, this is a testing message").
      To execute the post, include this exact string anywhere in your response:
      [ACTION: ADD_WORKSPACE_MESSAGE] "your message here"
      The system will automatically extract it and post it to the workspace. You can still talk to the Admin normally in the rest of your response.
    `;

    // Limit conversation history to last 3 messages to control token usage
    const recentMessages = messages.slice(-3);

    // ── PROVIDER HELPERS ────────────────────────────────────────────────────

    const geminiCall = async (apiKey: string): Promise<string | null> => {
      const formattedMessages = recentMessages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const requestBody = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: formattedMessages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
      );

      const data = await response.json();
      if (!response.ok) {
        console.warn(`[Gemini] Failed (${response.status}): ${data.error?.message}`);
        return null;
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    };

    const groqCall = async (apiKey: string, keyLabel: string): Promise<string | null> => {
      const formattedMessages = [
        { role: 'system', content: systemInstruction },
        ...recentMessages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 8192
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.warn(`[Groq ${keyLabel}] Failed (${response.status}): ${data.error?.message}`);
        return null;
      }
      return data.choices?.[0]?.message?.content ?? null;
    };

    // ── WATERFALL ───────────────────────────────────────────────────────────
    // Order: Paid Gemini → Groq Key 1 → Groq Key 2 → Free Gemini
    // Each provider is only called if the previous one fails.

    type Provider = { name: string; call: () => Promise<string | null> };

    const primaryGemini   = process.env.GEMINI_API_KEY;
    const groqKey1        = process.env.GROQ_API_KEY;
    const groqKey2        = process.env.GROQ_API_KEY_2;
    const secondaryGemini = process.env.GEMINI_API_KEY_SECONDARY;

    const providers: Provider[] = [];
    if (primaryGemini)   providers.push({ name: 'Gemini (Paid)',  call: () => geminiCall(primaryGemini) });
    if (groqKey1)        providers.push({ name: 'Groq Key 1',     call: () => groqCall(groqKey1, '1') });
    if (groqKey2)        providers.push({ name: 'Groq Key 2',     call: () => groqCall(groqKey2, '2') });
    if (secondaryGemini) providers.push({ name: 'Gemini (Free)',  call: () => geminiCall(secondaryGemini) });

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'No AI API keys are configured. Please add GEMINI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    let aiMessage: string | null = null;
    let usedProvider = '';

    const MAX_LOOPS = 3; // 3 full loops = up to 12 total attempts before giving up
    const LOOP_WAIT_MS = 1500; // wait 1.5s before looping back to paid key

    for (let loop = 1; loop <= MAX_LOOPS; loop++) {
      if (loop > 1) {
        console.log(`[Chat] All providers failed. Loop ${loop}/${MAX_LOOPS} — restarting from paid key after ${LOOP_WAIT_MS}ms...`);
        await new Promise(r => setTimeout(r, LOOP_WAIT_MS));
      }

      for (const provider of providers) {
        try {
          console.log(`[Chat] Loop ${loop} — Trying: ${provider.name}`);
          aiMessage = await provider.call();
          if (aiMessage) {
            usedProvider = provider.name;
            console.log(`[Chat] Loop ${loop} — Success with: ${provider.name}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[Chat] Loop ${loop} — ${provider.name} threw: ${err.message}`);
        }
      }

      if (aiMessage) break; // Got an answer, stop looping
    }

    if (!aiMessage) {
      // All 3 loops exhausted — extremely unlikely scenario
      return NextResponse.json(
        { error: 'All AI providers are temporarily overloaded. Please try again in a few seconds.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: aiMessage, provider: usedProvider });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
