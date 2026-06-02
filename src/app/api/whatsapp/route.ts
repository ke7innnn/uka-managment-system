import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destination, userName, params } = body;

    if (!destination || !params) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Securely hold the AiSensy API Key
    const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWQ1MWU5MzNkODVkMGYyMzk4YjlhNSIsIm5hbWUiOiJQaW5uYWNsZSBTdHVkaW9zIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjZhMWQ1MWU5MzNkODVkMGYyMzk4YjlhMCIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3ODAzMDY0MDl9.ooiJnLqoID1ht-qHfuUAG0vHCtohvzi5wRubyVBSQ7k";
    
    // Format destination number (AiSensy requires country code without '+', default to 91 for India)
    const cleanDestination = destination.replace(/\D/g, '');
    const finalDest = cleanDestination.startsWith('91') ? cleanDestination : `91${cleanDestination}`;

    const payload = {
      apiKey: apiKey,
      campaignName: "progress_update_uka", // The exact Campaign Name created in AiSensy Dashboard
      destination: finalDest,
      userName: userName || "Client",
      templateParams: params
    };

    console.log("Sending AiSensy Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("AiSensy Response:", data);

    // AiSensy typically returns 200 OK but the internal payload might show error status
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error("WhatsApp API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
