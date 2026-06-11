import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destination, userName, params, templateName } = body;

    if (!destination || !params) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Meta Cloud API Credentials
    const META_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "1139968109202309";
    const META_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "EAAOjDBxScxUBRmixWCZBuZB7eWP3xuj8cdbOccXOkJ2PM6599xtiVbzL4KarNQLseJquf8gHg6LjZB256WEw5eUj29br3pCbkDJcuedNYsj1q9uSRnwXnwaA0MZAQdoZAGBp7wlwnsoqb6HOvOfnCxJfMcaAGVJsTH8uds73qqpolyNpS2i6HMN4rffu9HQUnSQZDZD";
    
    // Format destination number (Meta requires country code without '+', default to 91 for India)
    const cleanDestination = destination.replace(/\D/g, '');
    const finalDest = cleanDestination.startsWith('91') ? cleanDestination : `91${cleanDestination}`;

    // Map the params array to Meta's expected parameters format
    const templateParameters = params.map((paramValue: string) => ({
      type: "text",
      text: paramValue || " " // Meta API fails if text is empty
    }));

    const payload = {
      messaging_product: "whatsapp",
      to: finalDest,
      type: "template",
      template: {
        name: templateName || "client_ukaprogress",
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: templateParameters
          }
        ]
      }
    };

    console.log("Sending Meta Cloud API Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Meta API Response:", data);

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error("WhatsApp API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
