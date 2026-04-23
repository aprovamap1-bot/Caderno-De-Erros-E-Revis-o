-- ═══════════════════════════════════════════════════════════
--  MIGRAÇÃO: Notas, Sessões do Cronômetro e Resultados Flashcard
--  Execute no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. NOTAS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL DEFAULT '',
  tag         TEXT        NOT NULL DEFAULT 'importante',
  created_at  BIGINT      NOT NULL DEFAULT extract(epoch from now())*1000
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes: usuário vê só os seus"
  ON public.notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. SESSÕES DO CRONÔMETRO ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seconds     INTEGER     NOT NULL DEFAULT 0,
  duration    TEXT        NOT NULL DEFAULT '00:00:00',
  date        TEXT        NOT NULL DEFAULT '',
  time        TEXT        NOT NULL DEFAULT '',
  ts          BIGINT      NOT NULL DEFAULT extract(epoch from now())*1000
);

ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timer_sessions: usuário vê só os seus"
  ON public.timer_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. RESULTADOS DOS FLASHCARDS ─────────────────────────
CREATE TABLE IF NOT EXISTS public.flash_results (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        TEXT        NOT NULL DEFAULT '',
  ts          BIGINT      NOT NULL DEFAULT extract(epoch from now())*1000,
  correct     INTEGER     NOT NULL DEFAULT 0,
  wrong       INTEGER     NOT NULL DEFAULT 0,
  total       INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.flash_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flash_results: usuário vê só os seus"
  ON public.flash_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Índices para performance ──────────────────────────────
CREATE INDEX IF NOT EXISTS notes_user_idx          ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS timer_sessions_user_idx ON public.timer_sessions(user_id);
CREATE INDEX IF NOT EXISTS flash_results_user_idx  ON public.flash_results(user_id);
