// ═══════════════════════════════════════════════════════════
//  KIWIFY WEBHOOK — Supabase Edge Function v2
//  Cria automaticamente um usuário no Supabase Auth
//  quando uma compra é confirmada no Kiwify.
//  Envia e-mail de boas-vindas via Resend.
//
//  Deploy:
//    supabase functions deploy kiwify-webhook --no-verify-jwt
//
//  Secrets necessários:
//    KIWIFY_WEBHOOK_SECRET       → token secreto do webhook no Kiwify
//    SUPABASE_SERVICE_ROLE_KEY   → chave service_role do projeto
//    RESEND_API_KEY              → chave da API do Resend
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://aprovamap1-bot.github.io/Caderno-De-Erros-E-Revis-o";

// ── Gera senha aleatória segura (20 chars) ──
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  let pwd = "";
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  arr.forEach((b) => (pwd += chars[b % chars.length]));
  return pwd;
}

// ── Envia e-mail via Resend ──
async function sendWelcomeEmail(
  resendKey: string,
  email: string,
  name: string,
  magicLink: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MEU CADERNO DE ERROS <noreply@aprovamaps.com.br>",
      to: [email],
      subject: "Seu acesso ao Caderno de Erros está pronto! 🎉",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f0e0c;color:#f0ece4;padding:2rem;border-radius:12px">
          <div style="text-align:center;margin-bottom:1.5rem">
            <div style="width:72px;height:72px;background:#e8c547;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:1rem">
              <span style="font-size:2rem">📓</span>
            </div>
            <h1 style="font-size:1.6rem;margin:0;color:#f0ece4">MEU CADERNO DE ERROS</h1>
          </div>

          <h2 style="font-size:1.2rem;margin-bottom:0.5rem;color:#e8c547">Olá, ${name}! 🎉</h2>
          <p style="color:#9c9789;line-height:1.7;margin-bottom:1.5rem">
            Sua compra foi confirmada e sua conta foi criada com sucesso!
            Clique no botão abaixo para acessar seu Caderno de Erros.
          </p>

          <div style="background:#1a1916;border:1px solid #2e2c28;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem">
            <p style="color:#9c9789;font-size:0.85rem;margin:0 0 0.5rem 0">Ao clicar no link você será redirecionado para o Caderno. Na primeira vez, defina sua senha de acesso.</p>
          </div>

          <div style="text-align:center;margin:2rem 0">
            <a href="${magicLink}"
               style="background:#e8c547;color:#000;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:1rem;display:inline-block">
              Acessar meu Caderno →
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #2e2c28;margin:1.5rem 0">
          <p style="color:#6b6760;font-size:0.75rem;text-align:center;margin:0">
            Este link expira em 24 horas. Se não realizou esta compra, ignore este e-mail.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Resend error: ${JSON.stringify(err)}`);
  }

  console.log("✅ E-mail enviado via Resend para:", email);
}

serve(async (req: Request) => {
  // ── Só aceita POST ──
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── Lê o body ──
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // ── Valida secret via query param ──
  const kiwifySecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
  if (kiwifySecret) {
    const url = new URL(req.url);
    const secretFromQuery = url.searchParams.get("secret");
    if (!secretFromQuery || secretFromQuery !== kiwifySecret) {
      console.error("Secret inválido ou ausente");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // ── Log do payload ──
  console.log("Payload recebido:", JSON.stringify(body));

  // ── Só processa compras pagas ──
  const orderStatus = (body["order_status"] ?? body["status"]) as string | undefined;
  console.log("order_status:", orderStatus);

  if (orderStatus !== "paid") {
    return new Response(
      JSON.stringify({ ignored: true, status: orderStatus }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Extrai dados do comprador ──
  const customer = (body["Customer"] ?? body["customer"]) as Record<string, string> | undefined;
  const email = customer?.email?.trim().toLowerCase();
  const name  = customer?.full_name?.trim() || email?.split("@")[0] || "Aluno";

  if (!email) {
    console.error("E-mail não encontrado no payload");
    return new Response("Missing email", { status: 400 });
  }

  console.log("Processando comprador:", email, name);

  // ── Cria cliente Supabase ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendKey   = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Verifica se usuário já existe (busca direta por e-mail, sem listUsers) ──
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const alreadyExists = existingList?.users?.some((u) => u.email === email);

  if (alreadyExists) {
    console.log("Usuário já existe — enviando novo magic link:", email);

    // Mesmo já existindo, envia um novo magic link
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: SITE_URL },
      });

      if (!linkError && linkData?.properties?.action_link && resendKey) {
        await sendWelcomeEmail(resendKey, email, name, linkData.properties.action_link);
      }
    } catch (err) {
      console.warn("Não foi possível reenviar magic link:", err);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Usuário já cadastrado. Magic link reenviado.", email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Cria o usuário ──
  const password = generatePassword();
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      created_by: "kiwify-webhook",
      must_change_password: true,
      order_status: orderStatus,
    },
  });

  if (createError) {
    console.error("Erro ao criar usuário:", createError.message);
    return new Response(
      JSON.stringify({ success: false, error: createError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("✅ Usuário criado:", email, "ID:", newUser?.user?.id);

  // ── Gera magic link e envia via Resend ──
  if (resendKey) {
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: SITE_URL },
      });

      if (linkError) {
        console.warn("Aviso: generateLink falhou:", linkError.message);
      } else if (linkData?.properties?.action_link) {
        await sendWelcomeEmail(resendKey, email, name, linkData.properties.action_link);
      }
    } catch (err) {
      console.warn("Erro ao enviar e-mail de boas-vindas:", err);
      // Não é fatal — usuário foi criado com sucesso
    }
  } else {
    console.warn("RESEND_API_KEY não configurado — e-mail não enviado");
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Usuário criado com sucesso.",
      email,
      userId: newUser?.user?.id,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
