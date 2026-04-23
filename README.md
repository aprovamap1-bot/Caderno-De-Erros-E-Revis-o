# Caderno de Erros e Revisao

Caderno de erros digital para organizar estudos de forma pratica e objetiva, com autenticacao e sincronizacao no Supabase.

## Requisitos

- Conta no Supabase
- Repositorio no GitHub
- Navegador moderno

## Configuracao do projeto

1. Copie `config.example.js` para `config.js`.
2. Edite `config.js` com os dados do seu projeto Supabase:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA_CHAVE_ANON_OU_PUBLISHABLE_AQUI"
};
```

> Importante: `config.js` esta no `.gitignore` e nao deve ser enviado ao GitHub.

## Configuracao do banco no Supabase

1. Abra o SQL Editor no painel do Supabase.
2. Execute o arquivo `supabase/schema.sql`.
3. Confirme se as tabelas foram criadas:
   - `erros`
   - `cadernos`
   - `materias_custom`
4. Confirme se o RLS esta ativo nas 3 tabelas.

## Rodando localmente

Como o projeto e um HTML unico, basta abrir `index.html` no navegador.

Se preferir, rode com servidor local estatico (exemplo com VS Code Live Server ou similar).

## Publicacao

Voce pode publicar com:
- GitHub Pages
- Vercel
- Netlify

Depois de publicar:
1. Garanta que o `config.js` do ambiente de producao esteja presente.
2. Teste cadastro, login, criacao/edicao/exclusao de erros.
3. Valide se cada usuario enxerga apenas os proprios dados.

## Checklist de seguranca

- Nunca use `service_role` no frontend.
- Use apenas chave `anon`/`publishable` no cliente.
- Mantenha RLS habilitado.
- Use policies com `auth.uid() = user_id`.
