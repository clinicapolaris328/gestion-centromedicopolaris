-- ============================================================================
--  Unificación de fichas de profesional de los USUARIOS actuales (22/10)
--  Ejecutar UNA vez en Supabase (SQL Editor → pegar → Run).
-- ----------------------------------------------------------------------------
--  Problema: al crear el usuario, el sistema vinculaba la ficha por NOMBRE EXACTO
--  (lib/profesional.ts → fichaPorNombre). Como las asistentes ya habían cargado la
--  ficha con otra grafía, se creó una RÉPLICA vacía y el usuario quedó sin sus
--  pacientes/turnos. (La prevención —elegir la ficha existente al crear el
--  usuario— va en el código; esto corrige los 3 casos ya ocurridos.)
--
--  Criterios (bases del proyecto):
--   - NO se borra ninguna ficha (decisión 22/10: se conservan todas).
--   - NO se reescriben registros clínicos (evoluciones, estudios, observaciones):
--     la ficha PRINCIPAL es la que tiene la HC y/o el usuario; solo se mueven
--     datos administrativos (turnos, dueño del paciente) o el vínculo del usuario.
--   - Por ID exacto (no por nombre). Verificación ANTES y DESPUÉS: si algo no
--     coincide con lo esperado, se cancela TODO (no queda nada a medias).
--   - Trazable: la auditoría existente (trg_audit) guarda cada fila antes/después
--     y, con request.jwt.claim.sub, registra a Elian (eliangonzi) como autor.
--
--  Casos:
--   1) César Villalba — usuario cesarvi0 en "Villalba Cesar Osvaldo" (tiene sus
--      8 evoluciones, 3 estudios, 3 observaciones). Réplica "César Villalba"
--      tiene 29 turnos (todos pasados) → se MUEVEN los turnos a la principal.
--      Verificado: 0 choques de horario (índice turno_slot_unico).
--   2) Gerónimo Imaz — usuario imaz en "IMAZ" (vacía). La ficha real es
--      "Imaz Gerónimo Tomás" (24 turnos) → se REVINCULA el usuario. No se mueve nada.
--   3) Andrea Alvarenga — usuario andreaalva0 en "Alvarenga Andrea". La réplica
--      "Dra. Alvarenga Andrea" es dueña de 1 paciente → se MUEVE ese dueño.
-- ============================================================================

begin;

-- Autor en la auditoría (auth.uid() lee este valor): eliangonzi.
set local request.jwt.claim.sub = '7323a9a4-9724-44cb-b922-475008fb143f';

-- ---------------------------------------------------------------- ANTES ----
do $$
declare n int;
begin
  select count(*) into n from public.turno where profesional_id = '6705f40c-55b5-4943-aec0-7eeac73f233f'; -- César Villalba (réplica)
  if n <> 29 then raise exception 'Caso 1: se esperaban 29 turnos en la réplica de César, hay %', n; end if;

  select count(*) into n from public.perfil
   where id = '050ce4c4-fb32-4555-bf2f-f3dcb4580df3' and profesional_id = '17f20bc2-88f3-4c71-bd99-220483698ecb'; -- imaz → IMAZ
  if n <> 1 then raise exception 'Caso 2: el usuario imaz ya no está en la ficha IMAZ'; end if;

  select count(*) into n from public.paciente where profesional_id = 'e9e3d9df-1dd2-46e0-9c7e-177815d08f8c'; -- Dra. Alvarenga (réplica)
  if n <> 1 then raise exception 'Caso 3: se esperaba 1 paciente en la réplica de Alvarenga, hay %', n; end if;
end $$;

-- ------------------------------------------------------------ CAMBIOS ----
-- 1) César: turnos de la réplica → ficha principal (la de su usuario y su HC).
update public.turno
   set profesional_id = 'd7a71bec-044c-445c-9b8c-1ae4091372fc'  -- Villalba Cesar Osvaldo
 where profesional_id = '6705f40c-55b5-4943-aec0-7eeac73f233f'; -- César Villalba

-- 2) Imaz: el usuario pasa a su ficha real.
update public.perfil
   set profesional_id = '47aa6dad-bc94-4343-9a8f-42f303935ef5',  -- Imaz Gerónimo Tomás
       actualizado_por = '7323a9a4-9724-44cb-b922-475008fb143f'
 where id = '050ce4c4-fb32-4555-bf2f-f3dcb4580df3';               -- usuario imaz

-- 3) Alvarenga: dueño del paciente → ficha principal (la de su usuario).
update public.paciente
   set profesional_id = '403cbe84-ff33-42ed-812f-c269cf856e15'  -- Alvarenga Andrea
 where profesional_id = 'e9e3d9df-1dd2-46e0-9c7e-177815d08f8c'; -- Dra. Alvarenga Andrea

-- ------------------------------------------------------------ DESPUÉS ----
do $$
declare n int;
begin
  select count(*) into n from public.turno where profesional_id = '6705f40c-55b5-4943-aec0-7eeac73f233f';
  if n <> 0 then raise exception 'Caso 1: quedaron % turnos en la réplica', n; end if;
  select count(*) into n from public.turno where profesional_id = 'd7a71bec-044c-445c-9b8c-1ae4091372fc';
  if n <> 30 then raise exception 'Caso 1: la ficha principal de César debería tener 30 turnos, tiene %', n; end if;

  select count(*) into n from public.perfil where id = '050ce4c4-fb32-4555-bf2f-f3dcb4580df3' and profesional_id = '47aa6dad-bc94-4343-9a8f-42f303935ef5';
  if n <> 1 then raise exception 'Caso 2: el usuario imaz no quedó en Imaz Gerónimo Tomás'; end if;

  select count(*) into n from public.paciente where profesional_id = 'e9e3d9df-1dd2-46e0-9c7e-177815d08f8c';
  if n <> 0 then raise exception 'Caso 3: quedaron % pacientes en la réplica', n; end if;

  -- Nada clínico se tocó: las evoluciones siguen en su autor original.
  select count(*) into n from public.evolucion where profesional_id = 'd7a71bec-044c-445c-9b8c-1ae4091372fc';
  if n <> 8 then raise exception 'Control: las evoluciones de César deberían seguir siendo 8, hay %', n; end if;
end $$;

commit;

-- Verificación (solo lectura), después de correrlo:
-- select pr.nombre, (select count(*) from turno t where t.profesional_id = pr.id) turnos,
--        (select string_agg(username, ',') from perfil p where p.profesional_id = pr.id) usuarios
--   from profesional pr
--  where pr.id in ('6705f40c-55b5-4943-aec0-7eeac73f233f','d7a71bec-044c-445c-9b8c-1ae4091372fc',
--                  '17f20bc2-88f3-4c71-bd99-220483698ecb','47aa6dad-bc94-4343-9a8f-42f303935ef5',
--                  'e9e3d9df-1dd2-46e0-9c7e-177815d08f8c','403cbe84-ff33-42ed-812f-c269cf856e15');
-- Trazabilidad: select tabla, operacion, usuario, creado_en from auditoria order by id desc limit 40;
