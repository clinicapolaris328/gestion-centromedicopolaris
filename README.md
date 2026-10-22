# Polaris · Sistema de Gestión Clínica (MVP frontend)

MVP de muestra del sistema de gestión interno para **Centro Médico Polaris**.
Objetivo de esta etapa: **ingeniería directa para validar la idea** antes de la
propuesta formal (alcance, tiempos, metodología y costos).

Construido con la identidad de marca de la landing (`centromedicopolaris`):
paleta navy / brand / cyan y tipografía Poppins.

## Stack

- **Vite + React 19**
- **React Router** (navegación entre módulos)
- **Bootstrap + React-Bootstrap** (grillas, formularios, modales, tablas)
- **CSS propio con tokens de marca** (`src/index.css`, `src/styles/`)
- **lucide-react** (íconos)
- Datos de muestra en `src/data/mock.js` (en producción vendrían de la API)

## Módulos incluidos

| Módulo | Qué valida |
|---|---|
| **Panel** | KPIs operativos, próximos turnos, actividad clínica reciente |
| **Turnero** | Agenda del día, estados de turno (agendado→confirmado→en sala→atendido/ausente), alta de turno |
| **Agenda** | Grilla de ocupación por profesional y franja horaria |
| **Pacientes** | Listado con búsqueda, alta con datos generales (DNI, edad, obra social, derivación) |
| **Ficha de paciente** | Datos + **Historia Clínica trazable** (evoluciones SOAP por especialidad) + Estudios + Turnos |
| **Historia Clínica** | Vista transversal: todas las especialidades comparten la misma HC del paciente |
| **Estudios** | Carga de archivos (drag & drop, múltiples formatos) asignables a paciente |
| **Configuración** | Profesionales, especialidades, obras sociales, identidad de marca |

> Base tomada de `sis_ges-polaris/referencias/notasIniciales.txt` y del manual de
> buenas prácticas SIGO.

## Comandos

```bash
npm install       # dependencias
npm run dev       # entorno de desarrollo (http://localhost:5173)
npm run build     # build de producción
npm run lint      # oxlint
npm run deploy:api  # despliega el backend (Edge Function `api`) a Supabase
```

## Backend (Supabase Edge Function `api`)

- Código en `supabase/functions/api` (Deno + Hono). Base: versión **20** en
  producción, descargada el 2026-09-30. La carpeta `supabase/` no viaja por git:
  antes de tocar el backend en otra máquina, bajar la versión de producción
  (`npx supabase functions download api`) para no pisar cambios.
- El front nunca habla con Supabase: `/api/*` lo proxea `worker.js` (prod) o
  `vite.config.js` (dev) hacia la función.
- **`verify_jwt = false`** (en `supabase/config.toml`, igual que el backend
  original): la API autentica con cookies httpOnly propias, no con el JWT de
  Supabase. Sin eso, todas las rutas responden 401. Deploy:
  `npx supabase functions deploy api` desde la raíz (o `npm run deploy:api`,
  que además fuerza `--no-verify-jwt`).
- **Contraseñas**: se escriben a mano (sin generación automática). La política
  única está en `lib/password.ts` (10+ caracteres, mayúscula, minúscula, número
  y símbolo, sin espacios); "Mi cuenta" además pide la contraseña actual. Aplica al crear o
  cambiar contraseñas; el login no la valida, así que las existentes siguen
  funcionando. `src/lib/password.js` es solo su espejo visual.

- **SQL** en `supabase/sql/`: los numerados son migraciones pendientes (se
  corren en orden en el SQL Editor; son idempotentes y aditivas), `aplicados/`
  guarda las ya ejecutadas y `esquema-produccion.sql` es el volcado de referencia.

## Historia clínica (niveles C)

- **Una HC por paciente**, una línea de tiempo. La plantilla de la consulta se
  elige por la especialidad del profesional; Cardiología es la primera
  (`src/data/hc/cardiologia.js`) y el molde para las demás.
- **Inmutabilidad (Ley 26.529)**: una evolución se guarda como *borrador*
  (editable) o se *firma* (queda fija). Una firmada no se edita ni se borra: se
  corrige con una *rectificación* vinculada a la original. Lo garantizan la API
  y un trigger en la base.
- **C1** · consulta estructurada: `evolucion.datos` (formulario de la
  especialidad, tipo consulta/derivación) + `observacion_clinica` (signos
  vitales numéricos, base de los gráficos).
- **C4** · estudios: archivos en el bucket privado `estudios` de Storage y
  metadatos en la tabla `estudio`. El navegador sube y descarga solo a través de
  `/api/estudios`; un estudio adjunto a una evolución firmada no se elimina.
- Pendientes: C2 (gráficos), C3 (panel médico), C5 (recetas/órdenes).
