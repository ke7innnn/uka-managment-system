import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

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
      You are UKA, a smart AI assistant for an architecture firm. 
      You must guide the Admin in their work, answer questions about their firm, suggest which projects to prioritize, and evaluate staff performance. Be professional, insightful, and act like a high-level manager.
      
      Here is the complete, real-time data of the UKA Management System right now:
      
      --- STAFF DIRECTORY & PERFORMANCE ---
      ${JSON.stringify(context.staff || [])}
      
      --- CLIENTS & ACTIVE PROJECTS ---
      ${JSON.stringify(context.clients || [])}
      
      Use this exact data to answer the Admin's questions. 
      Always be concise. Never make up data that was not given to you.
    `;

    // Format messages for Gemini API - strictly limit to the last 6 messages for context memory
    const recentMessages = messages.slice(-6);
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
        maxOutputTokens: 800,
      }
    };

    let aiMessage = '';
    let lastErrorMsg = 'Failed to communicate with Gemini AI';
    let lastStatus = 500;
    let success = false;

    // Loop through all available keys
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
          lastStatus = response.status;
          lastErrorMsg = data.error?.message || "Failed to communicate with Gemini AI";
          console.warn(`Gemini API key rotation: Key ${i + 1} failed with status ${response.status}. Error: ${lastErrorMsg}`);
        }
      } catch (err: any) {
        lastErrorMsg = err.message || "Network error occurred";
        console.warn(`Gemini API key rotation: Fetch with key ${i + 1} threw an error: ${lastErrorMsg}`);
      }
    }

    if (!success) {
      // Clean up scary quota error messages for the UI if all keys failed
      if (lastErrorMsg.includes("Quota exceeded") || lastStatus === 429) {
        const match = lastErrorMsg.match(/retry in ([\d\.]+)s/);
        const seconds = match ? Math.ceil(parseFloat(match[1])) : 60;
        lastErrorMsg = `You are asking questions a bit too quickly. Please wait ${seconds} seconds before asking another question!`;
      }
      
      throw new Error(lastErrorMsg);
    }

    return NextResponse.json({ message: aiMessage });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
