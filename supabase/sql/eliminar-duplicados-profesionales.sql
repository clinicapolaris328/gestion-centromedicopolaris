-- ============================================================================
--  Fichas de profesional DUPLICADAS: una sola ficha por persona (22/10)
--  Ejecutar UNA vez en Supabase (SQL Editor → pegar → Run).
--  Continúa a unificar-fichas-usuarios.sql (ya aplicado: los registros de César,
--  Imaz y Alvarenga ya están en la ficha de su usuario).
-- ----------------------------------------------------------------------------
--  Regla (decisión 22/10): una persona = UNA ficha.
--   - Con usuario → todo queda en la ficha del usuario.
--   - Sin usuario → queda la ficha con pacientes/turnos; si las dos tenían, todo
--     pasa a una sola.
--   - El duplicado vacío se ELIMINA. Las fichas vacías que NO son duplicado se
--     conservan (decisión anterior).
--  Seguridad:
--   - Por ID exacto. Antes de borrar se verifica que cada ficha tenga 0 turnos,
--     evoluciones, pacientes, estudios, observaciones, reglas de alerta y usuarios
--     (paciente/estudio/observación quedarían en NULL y alerta_regla se borraría
--     en cascada: por eso se exige 0 explícitamente). Si algo no coincide, se
--     cancela TODO.
--   - Ningún registro clínico se reescribe (las 6 fichas a borrar no tienen
--     evoluciones). Solo se mueven 4 turnos de Pauba (misma especialidad,
--     verificado: 0 choques de horario).
--   - Trazable: la auditoría (trg_audit) guarda cada fila movida y cada ficha
--     borrada completa (datos_anteriores), con Elian como autor.
--
--  Pares (se conserva → se elimina):
--   Imaz Gerónimo Tomás (usuario imaz)          ← IMAZ
--   Villalba Cesar Osvaldo (usuario cesarvi0)   ← César Villalba
--   Alvarenga Andrea (usuario andreaalva0)      ← Dra. Alvarenga Andrea
--   Bianciotto Matias (14 turnos)               ← Bianciotto Matías Adrián (Cardiología Clínica, vacía)
--   Vega Alejandra · Cardiología (4 turnos)     ← Vega Alejandra · Hemodinamia (vacía)
--   Pauba Daniel (2 turnos)                     ← Dr. Pauba Daniel (4 turnos → se mueven)
-- ============================================================================

begin;

set local request.jwt.claim.sub = '7323a9a4-9724-44cb-b922-475008fb143f'; -- autor: eliangonzi

-- Fichas a eliminar (todas deben quedar sin NINGÚN registro).
create temporary table _a_borrar (id uuid primary key, nombre text) on commit drop;
insert into _a_borrar values
  ('17f20bc2-88f3-4c71-bd99-220483698ecb', 'IMAZ'),
  ('6705f40c-55b5-4943-aec0-7eeac73f233f', 'César Villalba'),
  ('e9e3d9df-1dd2-46e0-9c7e-177815d08f8c', 'Dra. Alvarenga Andrea'),
  ('c15ff15e-4c3d-4b19-903f-51aad325d4a2', 'Bianciotto Matías Adrián'),
  ('f6f86d1e-5d47-4220-b65d-d466a6d522c0', 'Vega Alejandra (Hemodinamia)'),
  ('72f55cc7-6b10-4cab-a9c3-f4cbdb62224e', 'Dr. Pauba Daniel');

-- ---------------------------------------------------------------- ANTES ----
do $$
declare n int;
begin
  select count(*) into n from public.profesional where id in (select id from _a_borrar);
  if n <> 6 then raise exception 'Se esperaban 6 fichas a eliminar, existen %', n; end if;
  select count(*) into n from public.turno where profesional_id = '72f55cc7-6b10-4cab-a9c3-f4cbdb62224e';
  if n <> 4 then raise exception 'Pauba: se esperaban 4 turnos en "Dr. Pauba Daniel", hay %', n; end if;
  select count(*) into n from public.turno where profesional_id = '5c59dad1-85f3-48c7-a193-7ef24a120848';
  if n <> 2 then raise exception 'Pauba: se esperaban 2 turnos en "Pauba Daniel", hay %', n; end if;
  select count(*) into n from public.turno t where t.profesional_id in (select id from _a_borrar)
     and t.profesional_id <> '72f55cc7-6b10-4cab-a9c3-f4cbdb62224e';
  if n <> 0 then raise exception 'Hay % turnos en fichas que debían estar vacías', n; end if;
end $$;

-- ------------------------------------------------------------ CAMBIOS ----
-- Pauba: los 4 turnos pasan a la ficha que se conserva.
update public.turno
   set profesional_id = '5c59dad1-85f3-48c7-a193-7ef24a120848'  -- Pauba Daniel
 where profesional_id = '72f55cc7-6b10-4cab-a9c3-f4cbdb62224e'; -- Dr. Pauba Daniel

-- Control: ninguna ficha a eliminar tiene registros (de ningún tipo).
do $$
declare r record; n int;
begin
  for r in select * from _a_borrar loop
    select (select count(*) from public.turno               where profesional_id = r.id)
         + (select count(*) from public.evolucion           where profesional_id = r.id)
         + (select count(*) from public.paciente            where profesional_id = r.id)
         + (select count(*) from public.estudio             where profesional_id = r.id)
         + (select count(*) from public.observacion_clinica where profesional_id = r.id)
         + (select count(*) from public.alerta_regla        where profesional_id = r.id)
         + (select count(*) from public.perfil              where profesional_id = r.id)
      into n;
    if n <> 0 then raise exception 'La ficha "%" todavía tiene % registros: no se elimina nada', r.nombre, n; end if;
  end loop;
end $$;

delete from public.profesional where id in (select id from _a_borrar);

-- ------------------------------------------------------------ DESPUÉS ----
do $$
declare n int;
begin
  select count(*) into n from public.profesional where id in (select id from _a_borrar);
  if n <> 0 then raise exception 'Quedaron % fichas sin eliminar', n; end if;
  select count(*) into n from public.turno where profesional_id = '5c59dad1-85f3-48c7-a193-7ef24a120848';
  if n <> 6 then raise exception 'Pauba Daniel debería tener 6 turnos, tiene %', n; end if;
end $$;

commit;

-- Verificación (solo lectura): ya no debe haber pares de la misma persona.
-- select nombre, (select count(*) from turno t where t.profesional_id = p.id) turnos
--   from profesional p where nombre ~* '(imaz|villalba|alvarenga|bianciotto|vega alejandra|pauba)' order by 1;
-- Trazabilidad: select tabla, operacion, datos_anteriores->>'nombre', usuario, creado_en
--   from auditoria where tabla = 'profesional' and operacion = 'DELETE' order by id desc limit 10;
