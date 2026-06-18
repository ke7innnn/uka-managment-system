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

    let currentParams = [...params];
    let res;
    let data;

    while (currentParams.length >= 0) {
      const templateParameters = currentParams.map((paramValue: string) => ({
        type: "text",
        text: paramValue || " " // Meta API fails if text is empty
      }));

      const components = currentParams.length > 0 ? [
        {
          type: "body",
          parameters: templateParameters
        }
      ] : [];

      const payload = {
        messaging_product: "whatsapp",
        to: finalDest,
        type: "template",
        template: {
          name: templateName || "client_ukaprogress",
          language: {
            code: "en"
          },
          components: components
        }
      };

      console.log(`Sending Meta Cloud API Payload with ${currentParams.length} params`);

      res = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      data = await res.json();
      console.log("Meta API Response:", data);

      if (res.ok) {
        break;
      } else {
        const isParamError = data?.error?.code === 132000 || (data?.error?.message && data.error.message.includes("Number of parameters"));
        if (isParamError && currentParams.length > 0) {
          console.log(`Parameter mismatch. Retrying with ${currentParams.length - 1} parameters...`);
          currentParams.pop();
        } else {
          break;
        }
      }
    }

    if (!res || !res.ok) {
      return NextResponse.json({ success: false, error: data }, { status: res ? res.status : 500 });
    }

    // Attempt to log the outbound message to the database for context tracking
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        // We use dynamic import for createClient here, or just assume it works if we import it at top
        // Let's use fetch directly since we don't have createClient imported in this file
        await fetch(`${supabaseUrl}/rest/v1/whatsapp_messages`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            phone_number: finalDest,
            sender_name: body.userName || body.senderName || 'UKA Admin (Sent)',
            message_body: `[Template: ${templateName || "client_ukaprogress"}] - ${body.userName || ''}${params.length > 0 ? ', ' + params.join(', ') : ''}`,
            direction: 'outbound',
            status: 'sent'
          })
        });
      }
    } catch (dbError) {
      console.error("Failed to log outbound message to Supabase:", dbError);
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
