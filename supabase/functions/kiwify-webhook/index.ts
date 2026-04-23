// ═══════════════════════════════════════════════════════════
//  KIWIFY WEBHOOK — Supabase Edge Function
//  Cria automaticamente um usuário no Supabase Auth
//  quando uma compra é confirmada no Kiwify.
//
//  Deploy:
//    supabase functions deploy kiwify-webhook --no-verify-jwt
//
//  Variáveis de ambiente necessárias (supabase secrets set):
//    KIWIFY_WEBHOOK_SECRET  → token secreto do webhook no Kiwify
//    SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) → chave service_role do projeto
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Gera senha aleatória segura (16 chars) ──
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  let pwd = "";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  arr.forEach((b) => (pwd += chars[b % chars.length]));
  return pwd;
}

serve(async (req: Request) => {
  // Só aceita POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // ── Validação via secret na URL ──
  // A segurança é feita pelo secret embutido na URL:
  // .../kiwify-webhook?secret=KIWIFY_WEBHOOK_SECRET
  const kiwifySecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
  if (kiwifySecret) {
    const url = new URL(req.url);
    const secretFromQuery = url.searchParams.get("secret");
    console.log("Secret recebido (query):", secretFromQuery ? "****" : "ausente");
    if (!secretFromQuery || secretFromQuery !== kiwifySecret) {
      console.error("Secret inválido ou ausente");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // ── Log do payload completo para debug ──
  console.log("Payload recebido:", JSON.stringify(body));

  // ── Só processa compras aprovadas ──
  // Kiwify usa: "paid" | "waiting_payment" | "refunded" | "chargedback"
  const orderStatus = (body["order_status"] ?? body["status"]) as string | undefined;
  console.log("order_status:", orderStatus);

  if (orderStatus !== "paid") {
    console.log("Evento ignorado — status:", orderStatus);
    return new Response(JSON.stringify({ ignored: true, status: orderStatus }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Extrai dados do comprador ──
  // Kiwify pode enviar como "Customer" ou "customer"
  const customer = (body["Customer"] ?? body["customer"]) as Record<string, string> | undefined;
  console.log("Customer:", JSON.stringify(customer));
  const email = customer?.email?.trim().toLowerCase();
  const name = customer?.full_name?.trim() || email?.split("@")[0] || "Aluno";

  if (!email) {
    console.error("E-mail não encontrado no payload:", JSON.stringify(body));
    return new Response("Missing email", { status: 400 });
  }

  // ── Cria cliente Supabase com service_role (permissão total) ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Verifica se usuário já existe ──
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some((u) => u.email === email);

  if (alreadyExists) {
    console.log("Usuário já existe:", email);
    return new Response(
      JSON.stringify({ success: true, message: "Usuário já cadastrado.", email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Cria o usuário com senha aleatória ──
  const password = generatePassword();
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // já confirma o e-mail automaticamente
    user_metadata: {
      name,
      created_by: "kiwify-webhook",
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

  // ── Envia e-mail de boas-vindas com a senha ──
  // Usa o sistema de e-mail do Supabase (SMTP configurado no dashboard)
  const { error: emailError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (emailError) {
    console.warn("Aviso: não foi possível enviar magic link:", emailError.message);
    // Não é erro fatal — o usuário já foi criado
  }

  console.log("✅ Usuário criado com sucesso:", email);

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
