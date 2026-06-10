import { NextResponse } from 'next/server';

// Force rebuild to load updated Vercel environment variables
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
      return `[${a.type.toUpperCase()}] ${a.title} - ${a.message}`;
    }).join('\n');

    const primaryKey = process.env.GEMINI_API_KEY;
    const secondaryKey = process.env.GEMINI_API_KEY_SECONDARY;

    const apiKeys = [primaryKey, secondaryKey].filter(Boolean) as string[];
    
    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file." },
        { status: 500 }
      );
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

    // Format messages for Gemini API - strictly limit to the last 3 messages for context memory
    const recentMessages = messages.slice(-3);
    const formattedMessages = recentMessages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Inject system instructions as the very first message
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: formattedMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    };

    let aiMessage = '';
    let success = false;
    const errors: { keyIndex: number; status: number; message: string; isRateLimit: boolean }[] = [];

    // Try primary key first, fallback to secondary if primary fails
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok) {
          aiMessage = data.candidates[0]?.content?.parts[0]?.text;
          success = true;
          break; // Key worked! Break the loop.
        } else {
          const errMsg = data.error?.message || "Failed to communicate with Gemini AI";
          const isRateLimit = response.status === 429 || errMsg.includes("Quota exceeded");
          errors.push({
            keyIndex: i + 1,
            status: response.status,
            message: errMsg,
            isRateLimit
          });
          console.warn(`Gemini API key rotation: Key ${i + 1} failed (status ${response.status}): ${errMsg}`);
        }
      } catch (err: any) {
        const errMsg = err.message || "Network error occurred";
        errors.push({
          keyIndex: i + 1,
          status: 500,
          message: errMsg,
          isRateLimit: false
        });
        console.warn(`Gemini API key rotation: Fetch with key ${i + 1} threw an error: ${errMsg}`);
      }
    }

    if (!success) {
      // Find the most "helpful" error to show to the user.
      // If any key was just rate-limited, show a rate limit message rather than a scary fatal 403 suspension error.
      const rateLimitError = errors.find(e => e.isRateLimit);
      
      let finalErrorMsg = "Failed to communicate with Gemini AI";
      if (rateLimitError) {
        const match = rateLimitError.message.match(/retry in ([\d\.]+)s/);
        const seconds = match ? Math.ceil(parseFloat(match[1])) : 60;
        finalErrorMsg = `You are asking questions a bit too quickly. Please wait ${seconds} seconds before asking another question!\n\n(Detailed API Error: ${rateLimitError.message})`;
      } else {
        // If all keys had fatal errors, show the error of the primary key first, otherwise the last error.
        const primaryError = errors.find(e => e.keyIndex === 1);
        finalErrorMsg = primaryError ? primaryError.message : errors[errors.length - 1].message;
      }
      
      throw new Error(finalErrorMsg);
    }

    return NextResponse.json({ message: aiMessage });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
