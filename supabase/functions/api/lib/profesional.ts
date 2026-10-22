import type { SupabaseClient } from '../deps.ts'
import { httpError } from './http.ts'

/**
 * Vincula un usuario con su ficha de profesional según la especialidad elegida.
 * Regla ÚNICA para Configuración → Usuarios y para "Mi cuenta".
 *
 * - '' / null → sin vínculo (null).
 * - Si el usuario ya está vinculado a un profesional:
 *     · misma especialidad → sin cambios;
 *     · otra especialidad → se actualiza la especialidad de SU ficha (la persona
 *       sigue siendo la misma: conserva pacientes, turnos y evoluciones). El
 *       historial no se altera: turno y evolución guardan su propia especialidad.
 *       Si ya existe otra ficha con su nombre en esa especialidad
 *       (ux_profesional_nombre_esp), se lo vincula a esa en lugar de duplicar.
 * - Sin vínculo previo → reutiliza la ficha (nombre + especialidad) o la crea.
 * Todo queda auditado (trg_audit en profesional y perfil).
 */
export async function vincularProfesional(
  svc: SupabaseClient,
  o: { actualId?: string | null; nombre: string; especialidadId: string | null; actor: string },
): Promise<string | null> {
  if (!o.especialidadId) return null

  if (o.actualId) {
    const { data: actual, error } = await svc.from('profesional')
      .select('id, nombre, especialidad_id').eq('id', o.actualId).maybeSingle()
    if (error) throw httpError(400, error.message)
    if (actual) {
      if (actual.especialidad_id === o.especialidadId) return actual.id
      const otra = await fichaPorNombre(svc, actual.nombre, o.especialidadId)
      if (otra) return otra
      const { error: eUpd } = await svc.from('profesional')
        .update({ especialidad_id: o.especialidadId, actualizado_por: o.actor }).eq('id', actual.id)
      if (eUpd) throw httpError(400, eUpd.message)
      return actual.id
    }
  }

  const nom = (o.nombre ?? '').trim()
  const existente = await fichaPorNombre(svc, nom, o.especialidadId)
  if (existente) return existente
  // Antes de crear: ¿ya hay una ficha de la MISMA PERSONA escrita distinto?
  // ("IMAZ" ↔ "Imaz Gerónimo Tomás", "Dr. Pauba Daniel" ↔ "Pauba Daniel").
  // Misma especialidad → se vincula esa (no se crea réplica). Otra especialidad →
  // se rechaza: una persona tiene UNA ficha; hay que elegirla explícitamente.
  const misma = await fichaMismaPersona(svc, nom)
  if (misma) {
    if (misma.especialidad_id === o.especialidadId) return misma.id
    throw httpError(409, `Ya existe la ficha «${misma.nombre}» (${misma.especialidad}) de esta persona. Elegila en «Ficha de profesional» en lugar de crear otra.`)
  }
  const { data: creado, error } = await svc.from('profesional')
    .insert({ nombre: nom, especialidad_id: o.especialidadId, creado_por: o.actor }).select('id').single()
  if (error || !creado) throw httpError(400, error?.message ?? 'No se pudo registrar el profesional.')
  return creado.id
}

// Ficha con ese nombre (sin distinguir mayúsculas) en esa especialidad, o null.
async function fichaPorNombre(svc: SupabaseClient, nombre: string, especialidadId: string): Promise<string | null> {
  const { data, error } = await svc.from('profesional').select('id')
    .ilike('nombre', nombre).eq('especialidad_id', especialidadId).limit(1)
  if (error) throw httpError(400, error.message)
  return data && data.length ? data[0].id : null
}

/* ---------------------------------------------------------------------------
 * Una persona = UNA ficha (decisión 22/10). Las réplicas nacían de escribir el
 * nombre distinto: con/sin tilde, con "Dr./Dra.", en otro orden o incompleto.
 * `mismaPersona` compara las PALABRAS del nombre (sin tildes, mayúsculas ni
 * títulos): es la misma persona si comparten 2+ palabras, o si todas las de uno
 * están en el otro (ej. "IMAZ" ⊂ "Imaz Gerónimo Tomás"). La usan el alta de
 * fichas (routes/profesionales.ts) y el vínculo de usuarios (vincularProfesional).
 * ------------------------------------------------------------------------- */
const TITULOS = new Set(['dr', 'dra', 'doctor', 'doctora', 'lic', 'de', 'la', 'del', 'y'])

export function palabrasNombre(nombre: string): Set<string> {
  return new Set(String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !TITULOS.has(w)))
}

export function mismaPersona(a: string, b: string): boolean {
  const A = palabrasNombre(a), B = palabrasNombre(b)
  const comunes = [...A].filter((w) => B.has(w)).length
  if (!comunes) return false
  if (comunes >= 2) return true
  return [...A].every((w) => B.has(w)) || [...B].every((w) => A.has(w))
}

/** Ficha existente de la misma persona (cualquier especialidad), o null. */
export async function fichaMismaPersona(svc: SupabaseClient, nombre: string, excluirId?: string) {
  const { data, error } = await svc.from('profesional').select('id, nombre, especialidad_id, especialidad(nombre)')
  if (error) throw httpError(400, error.message)
  const f = (data ?? []).find((p: any) => p.id !== excluirId && mismaPersona(p.nombre, nombre)) as any
  return f ? { id: f.id as string, nombre: f.nombre as string, especialidad_id: f.especialidad_id as string, especialidad: f.especialidad?.nombre ?? '' } : null
}
