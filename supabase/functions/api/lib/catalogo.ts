import type { SupabaseClient } from '../deps.ts'
import { httpError } from './http.ts'

/**
 * Resuelve el id de un catálogo por su nombre; si no existe, lo crea (marcado
 * como personalizado). Habilita la opción "Otros" del frontend de forma
 * trazable. Devuelve el id o null si el nombre viene vacío.
 */
// Forma canónica para comparar: sin acentos, minúsculas, espacios colapsados.
const canon = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Busca el id de un catálogo por su nombre (forma canónica), SIN crearlo. null si no existe. */
export async function buscarCatalogo(db: SupabaseClient, tabla: string, nombre?: string): Promise<string | null> {
  const n = (nombre ?? '').replace(/\s+/g, ' ').trim()
  if (!n) return null
  const objetivo = canon(n)

  // Catálogos chicos: traemos todo y comparamos en forma canónica para no crear
  // gemelos ("Cardiología" vs "cardiologia" vs "Cardiología ").
  const { data: filas, error: e1 } = await db.from(tabla).select('id, nombre')
  if (e1) throw httpError(400, e1.message)
  const existente = (filas ?? []).find((f: { nombre: string }) => canon(f.nombre) === objetivo)
  return existente ? (existente as { id: string }).id : null
}

export async function resolverCatalogo(db: SupabaseClient, tabla: string, nombre?: string) {
  const n = (nombre ?? '').replace(/\s+/g, ' ').trim()
  if (!n) return null
  const existente = await buscarCatalogo(db, tabla, n)
  if (existente) return existente

  const { data: creado, error: e2 } = await db
    .from(tabla).insert({ nombre: n, personalizada: true }).select('id').single()
  if (e2) throw httpError(400, e2.message)
  return creado.id
}
