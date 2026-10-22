-- ============================================================================
--  Pacientes SIN profesional asignado → al profesional que los atiende (22/10)
--  Ejecutar UNA vez en Supabase (SQL Editor → pegar → Run).
-- ----------------------------------------------------------------------------
--  Problema: la Agenda daba de alta al paciente nuevo SIN profesional asignado
--  (paciente.profesional_id vacío), aunque el turno ya tenía profesional. Por eso,
--  después de unificar fichas, César/Imaz/etc. tienen los TURNOS pero no los
--  pacientes "asignados". Afecta a todo el sistema, no solo a los duplicados.
--  (La prevención va en el código: Agenda manda el profesional al crear el
--  paciente y el servidor asigna al primer profesional que le da turno.)
--
--  Regla (determinística, trazable):
--   - Solo pacientes con profesional_id VACÍO. Nunca se pisa un asignado.
--   - Se asigna al profesional con MÁS atenciones (turnos + evoluciones) con ese
--     paciente; empate → el más reciente.
--   - Se excluyen las fichas que son RECURSOS de agenda (Mapa, Holter, ECG,
--     Ergometría, Espirometría, Laboratorio): si el paciente solo tiene turnos de
--     recursos, queda sin asignar (sigue visible por el vínculo de turnos).
--   - No se toca ningún turno, evolución, estudio ni observación.
--   - Auditado (trg_audit) con Elian como autor. Si algún control falla, se
--     cancela TODO. Una 2da corrida no cambia nada (solo toma los vacíos).
-- ============================================================================

begin;

set local request.jwt.claim.sub = '7323a9a4-9724-44cb-b922-475008fb143f'; -- autor: eliangonzi

create temporary table _recurso (id uuid primary key) on commit drop;
insert into _recurso values
  ('f45383a3-725d-4b8c-a65e-aa8571e02a59'),  -- Mapa
  ('4eddaaef-0e06-434e-895d-0a798d300ea9'),  -- HOLTER
  ('60bba32e-d8d9-49be-a637-9b8ac1bd6db0'),  -- Electrocardiograma
  ('6f98738d-685f-4226-b0c4-6301cbfda90d'),  -- ERGOMETRIA / ECOSTRESS
  ('46e60cb2-9132-434f-94db-52fa82e83940'),  -- ESPIROMETRIA / TEST DE CAMINATA
  ('89f34e4f-c4e9-4063-8ef1-372edb59425c');  -- LABORATORIO

-- Plan: paciente sin asignar → profesional elegido por la regla.
create temporary table _plan on commit drop as
with v as (
  select paciente_id, profesional_id, fecha::timestamptz as f from public.turno
   where profesional_id is not null and profesional_id not in (select id from _recurso)
  union all
  select paciente_id, profesional_id, creado_en from public.evolucion
   where profesional_id is not null and profesional_id not in (select id from _recurso)
), r as (
  select paciente_id, profesional_id,
         row_number() over (partition by paciente_id order by count(*) desc, max(f) desc, profesional_id) as rk
    from v group by paciente_id, profesional_id
)
select p.id as paciente_id, r.profesional_id
  from public.paciente p join r on r.paciente_id = p.id and r.rk = 1
 where p.profesional_id is null;

-- Foto de los que YA tenían profesional: no deben cambiar.
create temporary table _ya_asignados on commit drop as
select id, profesional_id from public.paciente where profesional_id is not null;

-- ---------------------------------------------------------------- ANTES ----
do $$
declare n int;
begin
  select count(*) into n from public.profesional where id in (select id from _recurso);
  if n <> 6 then raise exception 'Se esperaban 6 fichas de recursos, existen %', n; end if;
  select count(*) into n from _plan;
  raise notice 'Pacientes a asignar: %', n;
end $$;

-- ------------------------------------------------------------ CAMBIOS ----
update public.paciente p
   set profesional_id = pl.profesional_id
  from _plan pl
 where p.id = pl.paciente_id
   and p.profesional_id is null;

-- ------------------------------------------------------------ DESPUÉS ----
do $$
declare n int;
begin
  -- Todo el plan quedó aplicado.
  select count(*) into n from _plan pl join public.paciente p on p.id = pl.paciente_id
   where p.profesional_id is distinct from pl.profesional_id;
  if n <> 0 then raise exception '% pacientes del plan no quedaron asignados', n; end if;
  -- Ningún paciente que ya tenía profesional cambió.
  select count(*) into n from _ya_asignados a join public.paciente p on p.id = a.id
   where p.profesional_id is distinct from a.profesional_id;
  if n <> 0 then raise exception '% pacientes ya asignados cambiaron: se cancela', n; end if;
  -- Nadie quedó asignado a un recurso de agenda por este script.
  select count(*) into n from _plan where profesional_id in (select id from _recurso);
  if n <> 0 then raise exception '% asignaciones a recursos de agenda', n; end if;
end $$;

commit;

-- Verificación (solo lectura): pacientes asignados por profesional.
-- select pr.nombre, count(*) from paciente p join profesional pr on pr.id = p.profesional_id
--  group by 1 order by 2 desc;
-- Pendientes sin asignar (sin turnos, o solo con recursos):
-- select count(*) from paciente where profesional_id is null;
-- Trazabilidad: select count(*), min(creado_en) from auditoria
--  where tabla = 'paciente' and operacion = 'UPDATE' and creado_en > now() - interval '1 hour';
