-- ============================================================================
--  Profesional · Horario de atención  (filtro "En atención ahora" de la agenda)
--  Ejecutar una vez en Supabase (SQL Editor → pegar → Run). Idempotente y ADITIVO:
--  NO modifica ni borra datos existentes.
-- ----------------------------------------------------------------------------
--  profesional.horario : JSONB = arreglo de franjas de atención
--      [{ "dia": 1, "inicio": "16:00", "fin": "20:00" }, ...]
--      dia: 0=domingo … 6=sábado (igual que JS getDay()).
--  Default '[]' → los profesionales existentes quedan sin horario (no rompe nada).
--  Queda auditado por el trigger trg_audit de `profesional` (quién/cuándo lo cambió),
--  igual que el resto del dominio → trazable.
-- ============================================================================

alter table profesional
  add column if not exists horario jsonb not null default '[]'::jsonb;

-- Verificación (solo lectura):
-- select nombre, horario from profesional where horario <> '[]'::jsonb;
