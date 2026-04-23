-- Execute este script no SQL Editor do Supabase.
-- Ele cria as tabelas usadas pelo app, ativa RLS e define policies por usuario.

create table if not exists public.erros (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  materia text not null,
  banca text not null default '',
  assunto text not null,
  onde text not null default '',
  dificuldade text not null,
  keywords text not null default '',
  questao text not null default '',
  obs text not null default '',
  lei text not null default '',
  artigo text not null default '',
  folder text not null default '',
  data_questao date null,
  rev_stage int not null default 0,
  last_revision timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.cadernos (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.materias_custom (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_erros_user_id on public.erros(user_id);
create index if not exists idx_erros_created_at on public.erros(created_at);
create index if not exists idx_cadernos_user_id on public.cadernos(user_id);
create index if not exists idx_materias_custom_user_id on public.materias_custom(user_id);

alter table public.erros enable row level security;
alter table public.cadernos enable row level security;
alter table public.materias_custom enable row level security;

drop policy if exists "erros_select_own" on public.erros;
drop policy if exists "erros_insert_own" on public.erros;
drop policy if exists "erros_update_own" on public.erros;
drop policy if exists "erros_delete_own" on public.erros;

create policy "erros_select_own" on public.erros
for select using (auth.uid() = user_id);

create policy "erros_insert_own" on public.erros
for insert with check (auth.uid() = user_id);

create policy "erros_update_own" on public.erros
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "erros_delete_own" on public.erros
for delete using (auth.uid() = user_id);

drop policy if exists "cadernos_select_own" on public.cadernos;
drop policy if exists "cadernos_insert_own" on public.cadernos;
drop policy if exists "cadernos_update_own" on public.cadernos;
drop policy if exists "cadernos_delete_own" on public.cadernos;

create policy "cadernos_select_own" on public.cadernos
for select using (auth.uid() = user_id);

create policy "cadernos_insert_own" on public.cadernos
for insert with check (auth.uid() = user_id);

create policy "cadernos_update_own" on public.cadernos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cadernos_delete_own" on public.cadernos
for delete using (auth.uid() = user_id);

drop policy if exists "materias_select_own" on public.materias_custom;
drop policy if exists "materias_insert_own" on public.materias_custom;
drop policy if exists "materias_update_own" on public.materias_custom;
drop policy if exists "materias_delete_own" on public.materias_custom;

create policy "materias_select_own" on public.materias_custom
for select using (auth.uid() = user_id);

create policy "materias_insert_own" on public.materias_custom
for insert with check (auth.uid() = user_id);

create policy "materias_update_own" on public.materias_custom
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "materias_delete_own" on public.materias_custom
for delete using (auth.uid() = user_id);
