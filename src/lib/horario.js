/* Horario de atención del profesional (profesional.horario = [{ dia, inicio, fin }]).
 * Soporta el filtro "En atención ahora" de la agenda. Solo lectura, lado front. */

/** ¿El profesional atiende el día (0=domingo … 6=sábado) a la hora "HH:MM"?
 *  Sin horario cargado → no se considera en atención. */
export const enAtencion = (profesional, dia, hora) =>
  (profesional?.horario || []).some(
    (f) => Number(f.dia) === dia
      && typeof f.inicio === 'string' && typeof f.fin === 'string'
      && f.inicio <= hora && hora <= f.fin,
  )
