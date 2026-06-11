import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET request: Meta Webhook Verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token matching the one configured in the Meta Developer portal
  const verifyToken = 'mytoken123';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Meta WhatsApp Webhook verified successfully!');
    return new Response(challenge, { status: 200 });
  }

  console.warn('Webhook verification failed: token mismatch or invalid mode.');
  return new Response('Forbidden', { status: 403 });
}

// POST request: Receiving WhatsApp Event Notifications
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming Meta WhatsApp Event:', JSON.stringify(body, null, 2));

    // Parse Meta WhatsApp Webhook Payload
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              const phoneNumber = message.from; // Sender's phone number
              
              // Extract sender name if available
              const contacts = change.value.contacts || [];
              const senderContact = contacts.find((c: any) => c.wa_id === phoneNumber);
              const senderName = senderContact?.profile?.name || 'Unknown Client';
              
              let messageBody = '';
              if (message.type === 'text') {
                messageBody = message.text.body;
              } else if (message.type === 'image' || message.type === 'document' || message.type === 'audio') {
                messageBody = `[Received ${message.type}]`;
              } else {
                messageBody = `[Unsupported message type: ${message.type}]`;
              }

              // Save to Supabase Database
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
              
              if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                // Try to match the incoming phone number with a registered client
                let finalSenderName = senderName;
                const cleanIncomingPhone = phoneNumber.replace(/\D/g, '');
                const last10Digits = cleanIncomingPhone.length >= 10 ? cleanIncomingPhone.slice(-10) : cleanIncomingPhone;
                
                // Fetch all clients to handle phone number formatting (spaces, dashes) in DB
                const { data: allClients } = await supabase.from('clients').select('name, phone').not('phone', 'is', null);
                if (allClients) {
                  const matchedClient = allClients.find((c: any) => c.phone && c.phone.replace(/\D/g, '').endsWith(last10Digits));
                  if (matchedClient) {
                    finalSenderName = `${matchedClient.name} (WA: ${senderName})`;
                  }
                }

                const { error } = await supabase
                  .from('whatsapp_messages')
                  .insert([
                    {
                      phone_number: phoneNumber,
                      sender_name: finalSenderName,
                      message_body: messageBody,
                      direction: 'inbound',
                      status: 'received',
                    }
                  ]);
                  
                if (error) {
                  console.error('Error inserting message to Supabase:', error.message);
                } else {
                  console.log(`Saved incoming message from ${senderName} (${phoneNumber})`);
                }
              } else {
                console.warn('Supabase URL or Key not configured. Cannot save message.');
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Meta WhatsApp Webhook processing error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
