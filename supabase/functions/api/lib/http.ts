// Errores tipados. En Hono, lanzar dentro de un handler va a app.onError,
// que los formatea como JSON (ver index.ts). No hace falta asyncHandler.

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export const httpError = (status: number, message: string) => new HttpError(status, message)

/** Traduce un error de Supabase a un HttpError. */
export const throwDb = (error: { message?: string } | null, status = 400) => {
  if (error) throw new HttpError(status, error.message ?? 'Error de base de datos.')
}
