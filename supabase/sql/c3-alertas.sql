-- ============================================================================
--  C3 · Alertas pautadas por los profesionales  (spec §3.2 + decisión 19/10)
--  Ejecutar una vez en Supabase (SQL Editor → pegar → Run). Idempotente y ADITIVO:
--  solo CREA dos tablas nuevas; NO modifica ni borra datos existentes.
-- ----------------------------------------------------------------------------
--  1) alerta_regla  — reglas sobre variables numéricas (observacion_clinica.variable)
--     que define CADA profesional (ámbito personal) o una especialidad (compartida).
--     Las evalúa la app contra las observaciones del paciente. Son orientativas:
--     nunca bloquean ni diagnostican.
--  2) paciente_alerta — alertas de CONDICIÓN del paciente (alergia, anticoagulación,
--     marcapasos, embarazo…). Las marca un profesional y las ven todos los que
--     atienden al paciente (spec §27: compartir por defecto).
--  Mismo patrón que el resto del dominio: RLS + política p_authenticated_all
--  (el control fino de permisos lo hace la API), trg_audit (quién/qué/cuándo en
--  `auditoria`) y trg_touch (actualizado_en).
-- ============================================================================

create table if not exists public.alerta_regla (
  id              uuid primary key default gen_random_uuid(),
  variable        text not null,                                   -- ej. 'ta_sistolica', 'fev1_pct'
  especialidad_id uuid references public.especialidad(id) on delete cascade,
  profesional_id  uuid references public.profesional(id) on delete cascade,
  minimo          numeric,
  maximo          numeric,
  mensaje         text,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  creado_por      uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  constraint chk_alerta_regla_ambito check (especialidad_id is not null or profesional_id is not null),
  constraint chk_alerta_regla_umbral check (minimo is not null or maximo is not null),
  constraint chk_alerta_regla_orden  check (minimo is null or maximo is null or minimo <= maximo)
);

-- Una sola regla por variable y ámbito (evita reglas duplicadas o contradictorias).
create unique index if not exists ux_alerta_regla_ambito
  on public.alerta_regla (variable, especialidad_id, profesional_id) nulls not distinct;

create table if not exists public.paciente_alerta (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid not null references public.paciente(id) on delete cascade,
  tipo            text not null,                                   -- ej. 'Alergia', 'Anticoagulación'
  detalle         text,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  creado_por      uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_paciente_alerta_paciente on public.paciente_alerta (paciente_id);

-- RLS (mismo patrón que observacion_clinica, estudio, profesional…).
alter table public.alerta_regla    enable row level security;
alter table public.paciente_alerta enable row level security;

drop policy if exists p_authenticated_all on public.alerta_regla;
create policy p_authenticated_all on public.alerta_regla
  for all to authenticated using (true) with check (true);

drop policy if exists p_authenticated_all on public.paciente_alerta;
create policy p_authenticated_all on public.paciente_alerta
  for all to authenticated using (true) with check (true);

-- Auditoría y actualizado_en (funciones ya existentes en la base).
create or replace trigger trg_audit after insert or update or delete on public.alerta_regla
  for each row execute function public.fn_auditoria();
create or replace trigger trg_touch before update on public.alerta_regla
  for each row execute function public.fn_touch_actualizado_en();

create or replace trigger trg_audit after insert or update or delete on public.paciente_alerta
  for each row execute function public.fn_auditoria();
create or replace trigger trg_touch before update on public.paciente_alerta
  for each row execute function public.fn_touch_actualizado_en();

-- Verificación (solo lectura):
-- select count(*) from alerta_regla;  select count(*) from paciente_alerta;
