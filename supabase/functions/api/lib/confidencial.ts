/* Notas confidenciales de Psicología / Psiquiatría (spec §26 y §27).
 *
 * Por defecto toda la HC se comparte entre especialidades. Excepción: una
 * evolución de Psicología o Psiquiatría marcada como confidencial
 * (`datos.confidencial = true`) solo la LEE completa:
 *   - el profesional tratante (usuario vinculado a evolucion.profesional_id), o
 *   - quien la cargó (evolucion.creado_por).
 * Para el resto (secretaría, otras especialidades, admin) la evolución sigue
 * apareciendo en la línea de tiempo (fecha, profesional, especialidad → trazable)
 * pero SIN contenido clínico. El dato se guarda completo: solo se oculta al leer. */

// deno-lint-ignore no-explicit-any
type Fila = any

// Por FAMILIA de HC (dato de la especialidad, columna especialidad.familia), no por
// el nombre: un cambio de nombre en el catálogo ya no altera la confidencialidad.
const FAMILIAS_CONFIDENCIALES = new Set(['psicologia', 'psiquiatria'])

/** ¿La familia de HC admite notas confidenciales? (Psicología, Psiquiatría) */
export const admiteConfidencial = (familia?: string | null) => FAMILIAS_CONFIDENCIALES.has(familia ?? '')

export const esConfidencial = (r: Fila) => r?.datos?.confidencial === true

/** ¿Este usuario puede leer el contenido de la evolución? */
export function puedeVerContenido(r: Fila, viewer: { userId: string; profesionalId: string | null }) {
  if (!esConfidencial(r)) return true
  if (viewer.profesionalId && r.profesional_id === viewer.profesionalId) return true
  return !!r.creado_por && r.creado_por === viewer.userId
}

/** Versión sin contenido clínico de una evolución confidencial (para quien no puede leerla). */
export function redactar(r: Fila): Fila {
  return {
    ...r,
    motivo: 'Contenido confidencial',
    subjetivo: null,
    objetivo: null,
    diagnostico: null,
    plan: null,
    indicacion: [],
    datos: { confidencial: true, restringida: true, plantilla: r.datos?.plantilla ?? null, tipo: r.datos?.tipo ?? null },
  }
}

/** Deja `confidencial` solo si la especialidad lo admite (si no, lo quita). */
export function normalizarConfidencial(datos: Fila, familia?: string | null) {
  if (!datos || typeof datos !== 'object') return datos
  const { confidencial, ...resto } = datos
  return admiteConfidencial(familia) && confidencial === true ? { ...resto, confidencial: true } : resto
}
