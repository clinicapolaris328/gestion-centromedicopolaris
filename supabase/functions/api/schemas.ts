import { z } from './deps.ts'

/* Esquemas de validación por recurso. Enums y formatos coinciden con el frontend
   (src/data/mock.js) y con el esquema de la base (schema.sql). Mismos que Express. */

const ESTADOS_TURNO = ['agendado', 'confirmado', 'en_sala', 'atendido', 'ausente', 'cancelado'] as const
const SEXOS = ['F', 'M', 'X'] as const

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD).')
const hora = z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM).')
// Texto requerido: recorta y colapsa espacios internos (forma canónica), así
// "  Juan   Pérez " → "Juan Pérez". Aplica a nombres, apellidos, catálogos, etc.
const texto = (min = 1, msg?: string) => z.string().trim().min(min, msg).transform((s) => s.replace(/\s+/g, ' '))
const opcional = (s: z.ZodTypeAny) => s.optional().or(z.literal(''))

/* Catálogos */
export const catalogoCreate = z.object({ nombre: texto(1, 'El nombre es requerido.') })
// Familias de HC válidas (misma lista que la restricción chk_especialidad_familia).
export const FAMILIAS_HC = [
  'cardiologia', 'clinica', 'obesidad', 'psicologia', 'neumonologia', 'reumatologia', 'infectologia',
  'neurologia', 'endocrino', 'traumatologia', 'ecografia', 'pediatria', 'cirugia', 'nutricion',
  'ginecologia', 'kinesiologia', 'psiquiatria', 'oftalmologia',
] as const
// Edición de un catálogo: renombrar y/o (solo especialidades) asignar la familia de HC.
export const catalogoUpdate = z.object({
  nombre: texto(1, 'El nombre es requerido.').optional(),
  familia: z.enum(FAMILIAS_HC).nullable().optional(), // null = formulario general
}).refine((d) => d.nombre !== undefined || d.familia !== undefined, { message: 'No hay datos para actualizar.' })

/* Profesionales */
// Franja del horario de atención (dia 0=domingo … 6=sábado; horas "HH:MM").
const franjaHorario = z.object({
  dia: z.number().int().min(0).max(6),
  inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM).'),
  fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM).'),
})
export const profesionalCreate = z.object({
  nombre: texto(1, 'El nombre es requerido.'),
  especialidad: texto(1, 'La especialidad es requerida.'),
  matricula: opcional(z.string().trim()),
  horario: z.array(franjaHorario).optional(),
})
export const profesionalUpdate = z
  .object({
    nombre: z.string().trim().min(1),
    especialidad: z.string().trim().min(1),
    matricula: z.string().trim(),
    estado: z.enum(['activo', 'suspendido']),
    horario: z.array(franjaHorario),
  })
  .partial()

/* Pacientes */
const pacienteBase = {
  apellido: texto(1, 'El apellido es requerido.'),
  nombre: texto(1, 'El nombre es requerido.'),
  dni: texto(1, 'El DNI es requerido.'),
  fechaNac: opcional(fechaISO),
  sexo: z.enum(SEXOS).optional(),
  telefono: opcional(z.string().trim()),
  email: opcional(z.string().trim().email('Email inválido.')),
  obraSocial: opcional(z.string().trim()),
  afiliado: opcional(z.string().trim()),
  derivacion: opcional(z.string().trim()),
  // Profesional al que se asigna el paciente ('' = genérico). Para el rol
  // 'profesional' el backend lo fuerza a su propia ficha.
  profesionalAsignado: opcional(z.string().uuid('Profesional inválido.')),
}
export const pacienteCreate = z.object(pacienteBase)
export const pacienteUpdate = z.object(pacienteBase).partial()

/* Observación clínica: variable numérica estructurada (alimenta los gráficos). */
const observacionInput = z.object({
  variable: z.string().trim().min(1),
  valor: z.number().nullable().optional(),
  valorTexto: opcional(z.string().trim()),
  unidad: opcional(z.string().trim()),
})

/* Evoluciones (Historia Clínica) — append-only: se crean y se leen, no se editan/borran.
   `datos` guarda el formulario específico de la especialidad (JSONB) y
   `observaciones` las variables numéricas estructuradas. */
export const evolucionCreate = z.object({
  pacienteId: z.string().uuid('Paciente inválido.'),
  profId: z.string().uuid('Profesional inválido.'),
  especialidad: opcional(z.string().trim()),
  motivo: texto(1, 'El motivo es requerido.'),
  subjetivo: opcional(z.string().trim()),
  objetivo: opcional(z.string().trim()),
  diagnostico: opcional(z.string().trim()),
  plan: opcional(z.string().trim()),
  medicacion: z.array(z.string()).optional(),
  estado: z.enum(['borrador', 'finalizada']).optional(),
  datos: z.record(z.unknown()).optional(),
  observaciones: z.array(observacionInput).optional(),
  // Si viene, esta evolución es una rectificación (addenda) de otra finalizada.
  rectificaA: opcional(z.string().uuid('Evolución a rectificar inválida.')),
})

// Edición de una evolución (solo permitida mientras está en borrador). Al enviar
// estado='finalizada' se firma (cierre inmutable).
export const evolucionUpdate = z.object({
  motivo: z.string().trim().min(1),
  subjetivo: z.string().trim(),
  objetivo: z.string().trim(),
  diagnostico: z.string().trim(),
  plan: z.string().trim(),
  medicacion: z.array(z.string()),
  datos: z.record(z.unknown()),
  observaciones: z.array(observacionInput),
  estado: z.enum(['borrador', 'finalizada']),
}).partial()

/* Estudios (archivos del paciente). El archivo viaja como multipart; estos son
   sus metadatos. `tipo` es la categoría (ECG, Ecocardiograma, Laboratorio…). */
export const estudioMeta = z.object({
  pacienteId: z.string().uuid('Paciente inválido.'),
  tipo: texto(1, 'El tipo de estudio es requerido.'),
  fecha: opcional(fechaISO),
  evolucionId: opcional(z.string().uuid('Evolución inválida.')),
  profId: opcional(z.string().uuid('Profesional inválido.')),
})
export const estudioUpdate = z.object({
  tipo: z.string().trim().min(1),
  fecha: fechaISO,
  evolucionId: z.string().uuid('Evolución inválida.').or(z.literal('')),
}).partial()

/* Usuarios del sistema (gestión por admin, vía service_role) */
const ROLES = ['administrador', 'asistente', 'profesional', 'dios'] as const
const username = z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres.')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Usuario inválido (solo letras, números, . _ -).')
const passwordFuerte = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.')
export const usuarioCreate = z.object({
  nombre: texto(1, 'El nombre es requerido.'),
  username,
  email: z.string().trim().email('Email inválido.'),
  password: passwordFuerte,
  telefono: opcional(z.string().trim()),
  rol: z.enum(ROLES),
  // Especialidad del profesional (nombre; '' = sin vínculo). El backend resuelve/
  // crea el registro de profesional y vincula perfil.profesional_id (trazable).
  especialidad: opcional(z.string().trim()),
  // Ficha de profesional EXISTENTE elegida en Configuración (evita réplicas por
  // grafía distinta del nombre). Si viene, manda sobre `especialidad`.
  profId: opcional(z.string().uuid('Ficha de profesional inválida.')),
})
export const usuarioUpdate = z.object({
  nombre: z.string().trim().min(1),
  username,
  email: z.string().trim().email('Email inválido.'),
  password: passwordFuerte,
  telefono: z.string().trim(),
  rol: z.enum(ROLES),
  especialidad: z.string().trim(), // '' = sin vínculo
  profId: z.string().uuid('Ficha de profesional inválida.'), // ficha existente elegida
  activo: z.boolean(),
}).partial()

/* Turnos */
const turnoBase = {
  fecha: fechaISO.optional(),
  hora,
  pacienteId: z.string().uuid('Paciente inválido.'),
  profId: z.string().uuid('Profesional inválido.'),
  motivo: opcional(z.string().trim()),
  estado: z.enum(ESTADOS_TURNO).optional(),
}
export const turnoCreate = z.object(turnoBase)
export const turnoUpdate = z.object(turnoBase).partial()

/* Alertas (C3). Reglas sobre variables numéricas que pauta cada profesional o
   especialidad, y alertas de condición del paciente. Orientativas: nunca bloquean. */
const umbral = z.number().finite().nullable().optional()
const conUmbral = (d: { minimo?: number | null; maximo?: number | null }) => d.minimo != null || d.maximo != null
const ordenOk = (d: { minimo?: number | null; maximo?: number | null }) => d.minimo == null || d.maximo == null || d.minimo <= d.maximo
export const alertaReglaCreate = z.object({
  variable: z.string().trim().min(1).regex(/^[a-z0-9_]+$/, 'Variable inválida.'),
  ambito: z.enum(['especialidad', 'profesional']),
  especialidad: opcional(z.string().trim()),
  profId: opcional(z.string().uuid('Profesional inválido.')),
  minimo: umbral,
  maximo: umbral,
  mensaje: opcional(z.string().trim().max(200)),
  activo: z.boolean().optional(),
})
  .refine(conUmbral, { message: 'Indicá un mínimo o un máximo.', path: ['minimo'] })
  .refine(ordenOk, { message: 'El mínimo no puede ser mayor que el máximo.', path: ['minimo'] })
export const alertaReglaUpdate = z.object({
  minimo: umbral,
  maximo: umbral,
  mensaje: z.string().trim().max(200),
  activo: z.boolean(),
}).partial()
export const pacienteAlertaCreate = z.object({
  tipo: texto(1, 'El tipo de alerta es requerido.').pipe(z.string().max(60)),
  detalle: opcional(z.string().trim().max(300)),
})
export const pacienteAlertaUpdate = z.object({
  detalle: z.string().trim().max(300),
  activo: z.boolean(),
}).partial()
