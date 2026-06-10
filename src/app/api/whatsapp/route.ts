import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destination, userName, params } = body;

    if (!destination || !params) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Meta Cloud API Credentials
    const META_PHONE_NUMBER_ID = "1163664470159303";
    const META_ACCESS_TOKEN = "EAAOjDBxScxUBRn0wXTB4DPyak7OmAaoSLcDHtzoEFrHmkeoICrbm1tgmD34HeHwkxXf8OqUJOiw34ZBasXOqREosyOvAkoUmAuCl9KKIoPJciJLsV15kOif2uuD5rIPOkVJxovK21dyUGdBVKhZAamB6vW6qOd0ctJsIvMZCQfZBfPdhIAMTIRkLWW8uQm6UwQZDZD";
    
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
        name: "progress_update_uka",
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
