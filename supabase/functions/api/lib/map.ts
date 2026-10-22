/* Mappers fila-de-DB (snake_case) → forma que consume el frontend (camelCase),
   idéntica a src/data/mock.js. Mismos mappers que el backend Express. */

const soloFecha = (v: any) => (v ? String(v).slice(0, 10) : null)
const horaCorta = (v: any) => (v ? String(v).slice(0, 5) : null)

export const edadDesde = (fechaNac: any) => {
  if (!fechaNac) return null
  const ms = Date.now() - new Date(fechaNac).getTime()
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000))
}

export const mapCatalogo = (r: any) => ({
  id: r.id,
  nombre: r.nombre,
  personalizada: r.personalizada,
  // Solo especialidades: familia de HC (plantilla de C1 / Resumen / confidencialidad).
  ...(r.familia !== undefined ? { familia: r.familia } : {}),
})

export const mapProfesional = (r: any) => ({
  id: r.id,
  nombre: r.nombre,
  matricula: r.matricula ?? null,
  especialidad: r.especialidad?.nombre ?? null,
  familia: r.especialidad?.familia ?? null, // familia de HC de su especialidad (dato, no nombre)
  estado: r.estado,
  horario: r.horario ?? [],
})

export const mapPaciente = (r: any) => ({
  id: r.id,
  apellido: r.apellido,
  nombre: r.nombre,
  dni: r.dni,
  fechaNac: soloFecha(r.fecha_nac),
  edad: edadDesde(r.fecha_nac),
  sexo: r.sexo,
  telefono: r.telefono,
  email: r.email,
  obraSocial: r.obra_social?.nombre ?? null,
  afiliado: r.afiliado,
  derivacion: r.derivacion,
  profId: r.profesional_id ?? null,
  profesional: r.profesional?.nombre ?? null,
  // Profesionales vinculados al paciente (dueño ∪ agenda ∪ evolución). La lista
  // (GET /pacientes) lo completa con la unión real; acá queda el dueño como base
  // para los demás usos (ej. GET /pacientes/:id).
  profIds: r.profIds ?? (r.profesional_id ? [r.profesional_id] : []),
  creado: soloFecha(r.creado_en),
})

export const mapEvolucion = (r: any) => ({
  id: r.id,
  pacienteId: r.paciente_id,
  fecha: soloFecha(r.fecha),
  profId: r.profesional_id,
  especialidad: r.especialidad?.nombre ?? null,
  especialidadFamilia: r.especialidad?.familia ?? null,
  estado: r.estado ?? 'finalizada',
  motivo: r.motivo,
  subjetivo: r.subjetivo,
  objetivo: r.objetivo,
  diagnostico: r.diagnostico,
  plan: r.plan,
  datos: r.datos ?? null,
  rectificaA: r.rectifica_a ?? null,
  finalizadaEn: r.finalizada_en ?? null,
  finalizadaPor: r.finalizada_por ?? null,
  medicacion: (r.indicacion ?? []).map((i: any) => i.texto),
  adjuntos: (r.estudio ?? []).map((e: any) => e.id),
})

export const mapObservacion = (r: any) => ({
  id: r.id,
  pacienteId: r.paciente_id,
  evolucionId: r.evolucion_id,
  profId: r.profesional_id,
  variable: r.variable,
  valor: r.valor,
  valorTexto: r.valor_texto,
  unidad: r.unidad,
  fecha: soloFecha(r.fecha),
  fuente: r.fuente,
})

export const mapTurno = (r: any) => ({
  id: r.id,
  fecha: soloFecha(r.fecha),
  hora: horaCorta(r.hora),
  pacienteId: r.paciente_id,
  profId: r.profesional_id,
  especialidad: r.especialidad?.nombre ?? null,
  especialidadFamilia: r.especialidad?.familia ?? null,
  estado: r.estado,
  motivo: r.motivo,
})

export const mapEstudio = (r: any) => ({
  id: r.id,
  pacienteId: r.paciente_id,
  paciente: r.paciente ? { apellido: r.paciente.apellido, nombre: r.paciente.nombre } : null,
  evolucionId: r.evolucion_id,
  profId: r.profesional_id,
  profesional: r.profesional?.nombre ?? null,
  tipo: r.tipo,
  nombre: r.nombre_archivo,
  formato: r.formato,
  tamano: r.tamano_bytes,
  fecha: soloFecha(r.fecha),
  creado: soloFecha(r.creado_en),
})

export const mapAlertaRegla = (r: any) => ({
  id: r.id,
  variable: r.variable,
  ambito: r.profesional_id ? 'profesional' : 'especialidad',
  especialidadId: r.especialidad_id ?? null,
  especialidad: r.especialidad?.nombre ?? null,
  profId: r.profesional_id ?? null,
  profesional: r.profesional?.nombre ?? null,
  minimo: r.minimo ?? null,
  maximo: r.maximo ?? null,
  mensaje: r.mensaje ?? null,
  activo: r.activo,
  actualizado: r.actualizado_en ?? null,
})

export const mapPacienteAlerta = (r: any) => ({
  id: r.id,
  pacienteId: r.paciente_id,
  tipo: r.tipo,
  detalle: r.detalle ?? null,
  activo: r.activo,
  creado: soloFecha(r.creado_en),
})
