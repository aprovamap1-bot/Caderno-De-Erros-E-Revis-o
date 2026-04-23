# Kiwify Webhook — Guia de Deploy

## O que faz
Quando alguém compra seu produto no Kiwify, esta função:
1. Valida que a requisição veio do Kiwify (segurança)
2. Cria automaticamente uma conta no Supabase para o comprador
3. Envia um magic link por e-mail para o usuário acessar

---

## Passo 1 — Instalar o Supabase CLI

```bash
# Windows (winget/choco podem não ter o pacote em alguns ambientes)
# Baixe em: https://github.com/supabase/cli/releases
```

---

## Passo 2 — Fazer login e linkar o projeto

```bash
supabase login
supabase link --project-ref nmcyzfykqymopdwavzav
```

---

## Passo 3 — Configurar as variáveis secretas

Você precisa de dois valores:

**A) KIWIFY_WEBHOOK_SECRET**
- Acesse kiwify.com → seu produto → Webhooks
- Crie um webhook e copie o "Token secreto"

**B) SERVICE_ROLE_KEY**
- Acesse supabase.com → seu projeto → Settings → API
- Copie a chave "service_role" (não a anon!)

Agora configure os secrets:

```bash
supabase secrets set KIWIFY_WEBHOOK_SECRET=SEU_TOKEN_AQUI
supabase secrets set SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_AQUI
```

---

## Passo 4 — Fazer o deploy da função

```bash
supabase functions deploy kiwify-webhook --no-verify-jwt
```

Após o deploy, você verá a URL da função:
```
https://nmcyzfykqymopdwavzav.supabase.co/functions/v1/kiwify-webhook
```

---

## Passo 5 — Configurar o Webhook no Kiwify

1. Acesse **kiwify.com → seu produto → Configurações → Webhooks**
2. Clique em **"Adicionar webhook"**
3. Cole a URL:
   ```
   https://nmcyzfykqymopdwavzav.supabase.co/functions/v1/kiwify-webhook
   ```
4. Selecione o evento: **"Pedido aprovado" (order.approved)**
5. Cole o mesmo token secreto que você usou no Passo 3
6. Salve

---

## Passo 6 — Testar

No Kiwify, use a função "Testar webhook" para enviar um evento de teste.
Verifique no Supabase → Authentication → Users se o usuário foi criado.

---

## Fluxo completo

```
Comprador paga no Kiwify
        ↓
Kiwify envia POST para a Edge Function
        ↓
Função valida o token secreto
        ↓
Função cria usuário no Supabase Auth
        ↓
Supabase envia magic link por e-mail
        ↓
Comprador clica no link e acessa o site
```
