import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

async function testWebhookLogic() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const phoneNumber = '918698930978';
  const senderName = 'Kevin Pimenta';
  const messageBody = 'This is a test reply from Kevin';

  console.log('Testing client matching logic...');
  let finalSenderName = senderName;
  const cleanIncomingPhone = phoneNumber.replace(/\D/g, '');
  const last10Digits = cleanIncomingPhone.length >= 10 ? cleanIncomingPhone.slice(-10) : cleanIncomingPhone;
  
  try {
    const { data: allClients, error: fetchError } = await supabase.from('clients').select('name, phone, kyc');
    if (fetchError) {
      console.error('Error fetching clients:', fetchError);
      return;
    }

    if (allClients) {
      for (const c of allClients) {
        const checkPhone = (p) => p && typeof p === 'string' && p.replace(/\D/g, '').endsWith(last10Digits);
        
        if (checkPhone(c.phone)) {
          finalSenderName = `${c.name} (WA: ${senderName})`;
          console.log('Matched primary phone!');
          break;
        }
        
        const matchedOwner = c.kyc?.otherOwners?.find((o) => checkPhone(o.phone));
        if (matchedOwner) {
          finalSenderName = `${c.name} (Owner: ${matchedOwner.name || senderName})`;
          console.log('Matched owner phone!');
          break;
        }
        
        const matchedRef = c.kyc?.references?.find((r) => checkPhone(r.phone));
        if (matchedRef) {
          finalSenderName = `${c.name} (Ref: ${matchedRef.name || senderName})`;
          console.log('Matched ref phone!');
          break;
        }
      }
    }

    console.log(`Final sender name resolved to: ${finalSenderName}`);

    console.log('Testing insert...');
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
      console.error('Error inserting message to Supabase:', error.message, error.details, error.hint);
    } else {
      console.log(`Saved incoming message from ${senderName} (${phoneNumber})`);
    }
  } catch (err) {
    console.error('Caught exception:', err);
  }
}

testWebhookLogic();
