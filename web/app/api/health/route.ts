import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Proteger com autenticação — apenas admins podem ver o status das APIs
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timestamp = new Date().toISOString();

  const services = [
    {
      name: 'Telegram Bot',
      status: 'offline',
      last_check: timestamp,
      details: 'Not checked'
    },
    {
      name: 'Gemini API',
      status: 'offline',
      last_check: timestamp,
      details: 'Not checked'
    },
    {
      name: 'Supabase',
      status: 'offline',
      last_check: timestamp,
      details: 'Not checked'
    }
  ];

  // 1. Check Telegram Bot
  try {
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!tgToken) {
      services[0].details = 'Token not configured';
    } else {
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      if (tgRes.ok) {
        const tgData = await tgRes.json();
        if (tgData.ok) {
          services[0].status = 'online';
          services[0].details = 'OK';
        } else {
          services[0].details = 'API returned not OK';
        }
      } else {
        services[0].details = `Status: ${tgRes.status}`;
      }
    }
  } catch {
    services[0].details = 'Connection timeout';
  }

  // 2. Check Gemini API
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      services[1].details = 'Key not configured';
    } else {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (geminiRes.ok) {
        services[1].status = 'online';
        services[1].details = 'OK';
      } else {
        services[1].details = `Status: ${geminiRes.status}`;
      }
    }
  } catch {
    services[1].details = 'Connection timeout';
  }

  // 3. Check Supabase
  let supabaseAdmin: ReturnType<typeof createAdminClient> | null = null;
  try {
    supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    if (error) {
      services[2].details = 'Database error';
    } else {
      services[2].status = 'online';
      services[2].details = 'OK';
    }
  } catch {
    services[2].details = 'Connection error';
  }

  // 4. Update system_health table
  if (supabaseAdmin) {
    try {
      for (const s of services) {
        await supabaseAdmin.from('system_health').upsert({
          service_name: s.name,
          status: s.status,
          last_check: s.last_check,
          details: { message: s.details }
        }, { onConflict: 'service_name' });
      }
    } catch (err) {
      console.error('Error updating system_health table:', err);
    }
  }

  return NextResponse.json({ services });
}
