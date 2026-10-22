-- ============================================================================
--  Especialidad → familia de HC (plantilla de C1, Resumen de C3, confidencialidad)
--  Ejecutar UNA vez en Supabase (SQL Editor → pegar → Run), ANTES del deploy de
--  la función que la usa (la API la lee en especialidades, profesionales, turnos
--  y evoluciones). Idempotente y ADITIVO: agrega una columna opcional y la
--  completa; no modifica ni borra ningún otro dato.
-- ----------------------------------------------------------------------------
--  Por qué: hasta hoy la plantilla de cada especialidad se deducía del NOMBRE con
--  patrones escritos en el código (ej. /^cardiolog/), en dos lugares distintos
--  (front y confidencialidad del backend). Un cambio de nombre o una especialidad
--  nueva cambiaba el comportamiento sin que nadie lo decidiera. Ahora la familia
--  es un DATO de la especialidad, administrable desde Configuración y auditado.
--  - familia = clave de la plantilla de HC (lista cerrada abajo).
--  - NULL = sin plantilla propia → formulario general (como hoy).
--  - Los valores se calcularon con los MISMOS reconocedores vigentes sobre el
--    catálogo real (22/10): el comportamiento no cambia en nada.
-- ============================================================================

begin;

set local request.jwt.claim.sub = '7323a9a4-9724-44cb-b922-475008fb143f'; -- autor en auditoría: eliangonzi

alter table public.especialidad add column if not exists familia text;

alter table public.especialidad drop constraint if exists chk_especialidad_familia;
alter table public.especialidad add constraint chk_especialidad_familia check (familia is null or familia in (
  'cardiologia', 'clinica', 'obesidad', 'psicologia', 'neumonologia', 'reumatologia', 'infectologia', 'neurologia', 'endocrino', 'traumatologia', 'ecografia', 'pediatria', 'cirugia', 'nutricion', 'ginecologia', 'kinesiologia', 'psiquiatria', 'oftalmologia'
));

-- Familia vigente de cada especialidad (22 con plantilla; 7 quedan con el formulario general).
update public.especialidad set familia = 'cardiologia' where id = '8075b908-4bb8-4601-af7c-22dfd1c9f16b'; -- Cardiología
update public.especialidad set familia = 'cardiologia' where id = '0dbd39b2-97b6-40a2-aa5d-98b5385999f2'; -- Cardiología (imágenes cardiovasculares)
update public.especialidad set familia = 'cardiologia' where id = '663c13cd-fc39-4a52-be92-6c4e2b1068f6'; -- Cardiología Clínica
update public.especialidad set familia = 'cirugia' where id = '0c606c62-84fe-4e55-b84d-4c9060d79443'; -- Cirugía
update public.especialidad set familia = 'clinica' where id = '40a07b25-8396-40f6-aee8-4515ef169c5a'; -- Clínica Médica
update public.especialidad set familia = 'obesidad' where id = '7fce9547-05d9-4e7f-9c5a-5b3334989a00'; -- Clínica Médica (obesidad)
update public.especialidad set familia = 'ecografia' where id = '95e4fb20-9b3c-4c59-aebc-3b7c38abbfe1'; -- Ecografista
update public.especialidad set familia = 'endocrino' where id = '860828ce-e40f-4249-8f7c-480bdcfa07b6'; -- Endocrinología, Diabetología y Ginecoendocrinología
update public.especialidad set familia = 'ginecologia' where id = '697f3ab6-f29d-4d43-93fd-25a7a3b9878b'; -- Ginecología
update public.especialidad set familia = 'infectologia' where id = 'b7fdc781-1de9-4aa5-98b5-413a006a9dc8'; -- Infectología
update public.especialidad set familia = 'kinesiologia' where id = '86e2ee58-ed97-4146-88a9-a9557cdacedc'; -- Kinesiología
update public.especialidad set familia = 'neumonologia' where id = '2901b3ea-a217-4980-b67a-95deda19490a'; -- NEUMONOLOGIA
update public.especialidad set familia = 'neurologia' where id = '57ff697f-bbfc-4354-943f-2fdf66a6e45c'; -- Neurología
update public.especialidad set familia = 'nutricion' where id = '21dbf5f3-4c18-41f9-90ff-4a84f51015b2'; -- Nutrición
update public.especialidad set familia = 'oftalmologia' where id = '8c86a3f5-8868-4122-94b1-508128e71564'; -- Oftalmologia
update public.especialidad set familia = 'traumatologia' where id = '1d9c8a83-7dbf-4215-a568-ac6ae33985f8'; -- Ortopedia y Traumatología infantil/general
update public.especialidad set familia = 'pediatria' where id = 'df967223-2e81-4779-bb6a-845f7460cdd3'; -- Pediatría
update public.especialidad set familia = 'psicologia' where id = '3506f568-fbfc-4d06-94ed-9cd01df1d8bd'; -- Psicología
update public.especialidad set familia = 'psicologia' where id = 'eee2fb45-4d41-409b-84c2-fb43fdc006e1'; -- Psicología (orientación psicoanalítica)
update public.especialidad set familia = 'psiquiatria' where id = '31b8a160-c7b0-4936-8979-3341b86d3837'; -- PSIQUIATRIA
update public.especialidad set familia = 'reumatologia' where id = '1c1f5a34-f05d-4c56-bab5-ab43269ee660'; -- REUMATOLOGIA
update public.especialidad set familia = 'traumatologia' where id = '8294b8ce-7070-4801-821a-2b8ca4237056'; -- Traumatología

do $$
declare n int;
begin
  select count(*) into n from public.especialidad where familia is not null;
  if n < 22 then raise exception 'Se esperaban al menos 22 especialidades con familia, hay %', n; end if;
end $$;

commit;

-- Verificación (solo lectura):
-- select nombre, familia from especialidad order by familia nulls last, nombre;
