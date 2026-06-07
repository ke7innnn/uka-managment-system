import { NextResponse } from 'next/server';

// Force rebuild to load updated Vercel environment variables
export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    // Deep prune function: Gives AI 100% of details but strips all expensive/bloated data
    function pruneDeep(obj: any): any {
      if (Array.isArray(obj)) {
        const arr = obj.map(pruneDeep).filter(v => v !== null && v !== undefined && v !== '');
        return arr.length > 0 ? arr : undefined;
      }
      if (typeof obj === 'object' && obj !== null) {
        const res: any = {};
        for (const [k, v] of Object.entries(obj)) {
          // Skip expensive or useless keys (base64 images, internal IDs, timestamps, empty values)
          if (
            ['id', 'password', 'createdAt', 'uploadedAt', 'url'].includes(k) || 
            k.endsWith('Photo') || 
            k.endsWith('Certificate') || 
            k.endsWith('Signature')
          ) {
            continue;
          }
          const pruned = pruneDeep(v);
          if (pruned !== undefined && pruned !== null && pruned !== '') {
            res[k] = pruned;
          }
        }
        return Object.keys(res).length > 0 ? res : undefined;
      }
      return obj;
    }

    // Hyper-compress Staff: Convert heavy task objects into simple strings
    const compressedStaff = (context.staff || []).map((s: any) => {
      return {
        ...s,
        tasks: (s.tasks || []).map((t: any) => `${t.completed ? '[DONE]' : '[TODO]'} ${t.title}`)
      };
    });

    // Hyper-compress Clients: Drop tasks for inactive phases entirely. Convert active tasks to simple strings.
    const compressedClients = (context.clients || []).map((c: any) => {
      const compressedPhases = (c.phases || []).map((p: any) => {
        // If a phase is completed or not started, the AI can infer that all tasks inside are either all done or all pending.
        // Sending them wastes massive tokens. We only send the detailed task list for the 'in-progress' phase.
        if (p.status !== 'in-progress') {
          return { name: p.name, status: p.status };
        }
        return {
          name: p.name,
          status: p.status,
          tasks: (p.tasks || []).map((t: any) => `${t.completed ? '[DONE]' : '[TODO]'} ${t.title} (@${t.assignedTo || 'Unassigned'})`)
        };
      });
      return { ...c, phases: compressedPhases };
    });

    const prunedStaff = pruneDeep(compressedStaff);
    const prunedClients = pruneDeep(compressedClients);

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
      
      Here is the complete, real-time data of the UKA Management System right now:
      
      --- STAFF DIRECTORY & PERFORMANCE ---
      ${JSON.stringify(prunedStaff)}
      
      --- CLIENTS & ACTIVE PROJECTS ---
      ${JSON.stringify(prunedClients)}
      
      CRITICAL INSTRUCTIONS FOR ACCURACY:
      1. Your answers MUST be 100% accurate and based STRICTLY on the real-time JSON data provided above.
      2. NEVER hallucinate, guess, or make up any names, project details, or statistics.
      3. If a user asks about something not present in the JSON data, explicitly tell them "I do not have that information in the current database."
      4. Cross-check your final answer against the JSON data before responding to ensure zero errors.
      5. Summarize your responses and give very short, concise answers, but ensure the complete context of the answer is still provided. Do not write unnecessarily long responses.
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
        finalErrorMsg = `You are asking questions a bit too quickly. Please wait ${seconds} seconds before asking another question!`;
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
