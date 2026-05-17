import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    // Analyze the latest user message for business keywords
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || "";
    const textStr = lastUserMessage.toLowerCase();
    
    const needsStaff = /staff|employee|attendance|task|performance|late|completed|who/i.test(textStr);
    const needsClients = /client|project|invoice|priority|status|work/i.test(textStr);
    const isBusinessRelated = needsStaff || needsClients || /business|uka|data|report/i.test(textStr);

    let injectedData = "";
    if (isBusinessRelated) {
      if (needsStaff) {
        injectedData += `\n--- STAFF DIRECTORY & PERFORMANCE ---\n${JSON.stringify(context.staff || [])}\n`;
      }
      if (needsClients) {
        injectedData += `\n--- CLIENTS & ACTIVE PROJECTS ---\n${JSON.stringify(context.clients || [])}\n`;
      }
      // If it's vaguely business related but didn't match specific staff/client terms, inject everything to be safe
      if (!needsStaff && !needsClients) {
         injectedData += `\n--- STAFF DATA ---\n${JSON.stringify(context.staff || [])}\n--- CLIENT DATA ---\n${JSON.stringify(context.clients || [])}\n`;
      }
    }

    const systemInstruction = `
      You are UKA, a smart AI assistant for an architecture firm. 
      If business data is provided to you, analyze it and answer professionally. 
      If no data is provided, respond like a helpful friendly assistant. 
      Always be concise. Never make up data that was not given to you.
      
      ${isBusinessRelated ? `Here is the requested real-time business data to answer the user's query:\n${injectedData}` : "No business data is required for this specific interaction."}
    `;

    // Format messages for Gemini API - strictly limit to the last 6 messages for context memory
    const recentMessages = messages.slice(-6);
    const formattedMessages = recentMessages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Inject system instructions as the very first message
    // Note: Gemini has a specific "system_instruction" field we can use.
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to communicate with Gemini AI");
    }

    const aiMessage = data.candidates[0]?.content?.parts[0]?.text;

    return NextResponse.json({ message: aiMessage });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
