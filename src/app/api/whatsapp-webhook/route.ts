import { NextResponse } from 'next/server';

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

    // Todo: Parse message payload and save to Supabase database

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Meta WhatsApp Webhook processing error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
