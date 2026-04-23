// ═══════════════════════════════════════════════════════════
//  SEND MAGIC LINKS — Supabase Edge Function
//  Gera magic links para usuários e envia via Resend
//
//  Deploy:
//    supabase functions deploy send-magic-links --no-verify-jwt
//
//  Chamar via curl ou pelo próprio painel do Supabase
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY    = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL       = "https://aprovamap1-bot.github.io/Caderno-De-Erros-E-Revis-o";

const USERS = [
  { email: "brenoyure@hotmail.com",            name: "Breno Yure" },
  { email: "fernandanascimento23@hotmail.com",  name: "Fernanda" },
  { email: "manuelmmoura@hotmail.com",          name: "Manuel Moura" },
  { email: "olipaty53@gmail.com",               name: "Patricia de Oliveira" },
  { email: "mailtocosta7@gmail.com",            name: "Mailton" },
];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];

  for (const user of USERS) {
    try {
      // Gera magic link
      const { data, error } = await supa.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: { redirectTo: SITE_URL },
      });

      if (error || !data?.properties?.action_link) {
        results.push({ email: user.email, status: "erro_link", error: error?.message });
        continue;
      }

      const magicLink = data.properties.action_link;

      // Envia via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MEU CADERNO DE ERROS <onboarding@resend.dev>",
          to: [user.email],
          subject: "Seu acesso ao Caderno de Erros está pronto! 🎉",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f0e0c;color:#f0ece4;padding:2rem;border-radius:12px">
              <h2 style="font-size:1.6rem;margin-bottom:0.5rem">Olá, ${user.name}! 👋</h2>
              <p style="color:#9c9789;margin-bottom:1.5rem">
                Sua compra foi confirmada e sua conta no <strong style="color:#e8c547">MEU CADERNO DE ERROS</strong> foi criada com sucesso!
              </p>
              <p style="color:#9c9789;margin-bottom:1.5rem">
                Clique no botão abaixo para acessar seu caderno. Ao entrar pela primeira vez, você poderá definir sua senha.
              </p>
              <div style="text-align:center;margin:2rem 0">
                <a href="${magicLink}"
                   style="background:#e8c547;color:#000;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:1rem;display:inline-block">
                  Acessar meu Caderno →
                </a>
              </div>
              <p style="color:#6b6760;font-size:0.78rem;text-align:center">
                Este link expira em 24 horas. Se não solicitou este acesso, ignore este e-mail.
              </p>
            </div>
          `,
        }),
      });

      const resBody = await res.json();
      if (res.ok) {
        results.push({ email: user.email, status: "enviado", id: resBody.id });
        console.log(`✅ E-mail enviado para ${user.email}`);
      } else {
        results.push({ email: user.email, status: "erro_email", error: resBody });
        console.error(`❌ Erro ao enviar para ${user.email}:`, resBody);
      }
    } catch (err) {
      results.push({ email: user.email, status: "exception", error: String(err) });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
