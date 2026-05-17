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

    // Prepare system instructions with realtime database context
    const systemInstruction = `
      You are "UKA", the highly intelligent architectural and management AI assistant for the Admin of the UKA Management System.
      
      You must guide the Admin in their work, answer questions about their firm, suggest which projects to prioritize, and evaluate staff performance. Be professional, insightful, and act like a high-level manager.
      
      Here is the complete, real-time data of the UKA Management System right now:
      
      --- STAFF DIRECTORY & PERFORMANCE ---
      ${JSON.stringify(context.staff || [])}
      
      --- CLIENTS & ACTIVE PROJECTS ---
      ${JSON.stringify(context.clients || [])}
      
      Use this exact data to answer the Admin's questions. 
      - If asked about staff, calculate their completion rates based on their "tasks" array. 
      - If asked about projects, check the "phases" and "projectStatus".
      - Keep your answers concise, well-formatted, and highly analytical.
      - Never break character. You are UKA.
    `;

    // Format messages for Gemini API
    const formattedMessages = messages.map((msg: any) => ({
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
