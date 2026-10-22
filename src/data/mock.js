/* ============================================================
   Datos de muestra (MVP) — Centro Médico Polaris
   Modela el dominio extraído de las notas iniciales:
   pacientes, turnero, historia clínica trazable y estudios.
   En producción esto vendría de la API / backend.
   ============================================================ */

// Plantel real de Centro Médico Polaris (fuente: centromedicopolaris landing).
// El frontend obtiene estos datos del backend en runtime; esto queda como
// referencia del dominio, en el mismo formato (nombre + una especialidad).
export const ESPECIALIDADES = [
  'Clínica Médica',
  'Clínica Médica (obesidad)',
  'Cardiología Clínica',
  'Cardiología (imágenes cardiovasculares)',
  'Hemodinamia',
  'Cirugía',
  'Traumatología',
  'Ortopedia y Traumatología infantil/general',
  'Neurología',
  'Endocrinología, Diabetología y Ginecoendocrinología',
  'Oncohematología',
  'Infectología',
  'Pediatría',
  'Nutrición',
  'Obesidad y medicina deportiva',
  'Psicología',
  'Psicología (orientación psicoanalítica)',
]

export const PROFESIONALES = [
  { id: 'prof-1', nombre: 'Darío Fernández Martínez', especialidad: 'Cirugía' },
  { id: 'prof-2', nombre: 'Daniel Pauba', especialidad: 'Traumatología' },
  { id: 'prof-3', nombre: 'Rolando Ojeda', especialidad: 'Neurología' },
  { id: 'prof-4', nombre: 'César Nascimento', especialidad: 'Endocrinología, Diabetología y Ginecoendocrinología' },
  { id: 'prof-5', nombre: 'Verónica Cobo', especialidad: 'Oncohematología' },
  { id: 'prof-6', nombre: 'Liu Wei Ting', especialidad: 'Infectología' },
  { id: 'prof-7', nombre: 'Matías Adrián Bianciotto', especialidad: 'Cardiología Clínica' },
  { id: 'prof-8', nombre: 'Rita Verónica Correa', especialidad: 'Ortopedia y Traumatología infantil/general' },
  { id: 'prof-9', nombre: 'Itatí Cáceres Cammarata', especialidad: 'Obesidad y medicina deportiva' },
  { id: 'prof-10', nombre: 'Gustavo Aguirre', especialidad: 'Clínica Médica' },
  { id: 'prof-11', nombre: 'Araceli Kalyn', especialidad: 'Cardiología Clínica' },
  { id: 'prof-12', nombre: 'Candela Dorrego Franco', especialidad: 'Nutrición' },
  { id: 'prof-13', nombre: 'Vanesa Guillen', especialidad: 'Psicología' },
  { id: 'prof-14', nombre: 'Antonella Arévalo', especialidad: 'Psicología (orientación psicoanalítica)' },
  { id: 'prof-15', nombre: 'Alejandra Enriquez', especialidad: 'Psicología' },
  { id: 'prof-16', nombre: 'Gisel Lingiardi', especialidad: 'Psicología' },
  { id: 'prof-17', nombre: 'Hernán González', especialidad: 'Clínica Médica' },
  { id: 'prof-18', nombre: 'Dra. Alvarenga Andrea', especialidad: 'Cardiología (imágenes cardiovasculares)' },
  { id: 'prof-19', nombre: 'Gerónimo Tomás Imaz', especialidad: 'Cardiología (imágenes cardiovasculares)' },
  { id: 'prof-20', nombre: 'Melina Victoria Armoa', especialidad: 'Cardiología (imágenes cardiovasculares)' },
  { id: 'prof-21', nombre: 'César Villalba', especialidad: 'Cardiología (imágenes cardiovasculares)' },
  { id: 'prof-22', nombre: 'Silvana Copponi', especialidad: 'Clínica Médica (obesidad)' },
  { id: 'prof-23', nombre: 'Leila Olmedo', especialidad: 'Nutrición' },
  { id: 'prof-24', nombre: 'Dra. Alejandra Vega', especialidad: 'Hemodinamia' },
  { id: 'prof-25', nombre: 'Dra. Dahiana Calas', especialidad: 'Pediatría' },
]

export const OBRAS_SOCIALES = [
  'OSDE', 'Swiss Medical', 'Galeno', 'IOMA', 'PAMI', 'OSECAC', 'Particular',
]

/* Estados de turno */
export const ESTADOS_TURNO = {
  agendado: { label: 'Agendado', tone: 'info' },
  confirmado: { label: 'Confirmado', tone: 'ok' },
  en_sala: { label: 'En sala', tone: 'warn' },
  atendido: { label: 'Atendido', tone: 'muted' },
  ausente: { label: 'Ausente', tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'muted' },
}

export const pacientes = [
  {
    id: 'pac-1',
    apellido: 'Gómez',
    nombre: 'María Laura',
    dni: '32.145.678',
    fechaNac: '1986-03-12',
    edad: 39,
    sexo: 'F',
    telefono: '+54 379 415-2233',
    email: 'ml.gomez@mail.com',
    obraSocial: 'OSDE',
    afiliado: '61-9988776-01',
    derivacion: 'Dr. Hernán González (Clínica)',
    creado: '2023-08-04',
  },
  {
    id: 'pac-2',
    apellido: 'Fernández',
    nombre: 'Roberto',
    dni: '20.998.114',
    fechaNac: '1969-11-02',
    edad: 55,
    sexo: 'M',
    telefono: '+54 379 466-1120',
    email: 'r.fernandez@mail.com',
    obraSocial: 'PAMI',
    afiliado: '150-2233445-6',
    derivacion: '—',
    creado: '2022-02-18',
  },
  {
    id: 'pac-3',
    apellido: 'Sosa',
    nombre: 'Camila',
    dni: '44.512.089',
    fechaNac: '2003-06-25',
    edad: 22,
    sexo: 'F',
    telefono: '+54 379 400-7781',
    email: 'cami.sosa@mail.com',
    obraSocial: 'Swiss Medical',
    afiliado: 'SM-77120933',
    derivacion: 'Guardia',
    creado: '2024-05-30',
  },
  {
    id: 'pac-4',
    apellido: 'Benítez',
    nombre: 'Jorge Aníbal',
    dni: '27.640.302',
    fechaNac: '1979-01-19',
    edad: 46,
    sexo: 'M',
    telefono: '+54 379 488-9002',
    email: 'jbenitez@mail.com',
    obraSocial: 'IOMA',
    afiliado: 'IOMA-3345021',
    derivacion: 'Dra. Verónica Cobo (Dermatología)',
    creado: '2023-11-11',
  },
  {
    id: 'pac-5',
    apellido: 'Ramírez',
    nombre: 'Lucía',
    dni: '39.201.556',
    fechaNac: '1995-09-08',
    edad: 29,
    sexo: 'F',
    telefono: '+54 379 421-5567',
    email: 'lucia.r@mail.com',
    obraSocial: 'Galeno',
    afiliado: 'GAL-8890231',
    derivacion: '—',
    creado: '2024-12-02',
  },
]

/* Turnos del día (turnero) */
const HOY = new Date().toISOString().slice(0, 10)
export const turnos = [
  { id: 't-1', fecha: HOY, hora: '08:30', pacienteId: 'pac-1', profId: 'prof-3', especialidad: 'Clínica Médica', estado: 'confirmado', motivo: 'Control anual' },
  { id: 't-2', fecha: HOY, hora: '09:00', pacienteId: 'pac-3', profId: 'prof-1', especialidad: 'Ginecología', estado: 'en_sala', motivo: 'Consulta' },
  { id: 't-3', fecha: HOY, hora: '09:30', pacienteId: 'pac-2', profId: 'prof-2', especialidad: 'Cardiología', estado: 'agendado', motivo: 'Seguimiento HTA' },
  { id: 't-4', fecha: HOY, hora: '10:00', pacienteId: 'pac-4', profId: 'prof-6', especialidad: 'Dermatología', estado: 'atendido', motivo: 'Control lesión' },
  { id: 't-5', fecha: HOY, hora: '10:30', pacienteId: 'pac-5', profId: 'prof-3', especialidad: 'Clínica Médica', estado: 'agendado', motivo: 'Primera consulta' },
  { id: 't-6', fecha: HOY, hora: '11:00', pacienteId: 'pac-1', profId: 'prof-2', especialidad: 'Cardiología', estado: 'ausente', motivo: 'Interconsulta' },
  { id: 't-7', fecha: HOY, hora: '11:30', pacienteId: 'pac-2', profId: 'prof-5', especialidad: 'Traumatología', estado: 'agendado', motivo: 'Dolor lumbar' },
]

/* Historia clínica: evoluciones trazables por especialidad.
   Cada entrada es un asiento firmado por un profesional. */
export const evoluciones = [
  {
    id: 'ev-1', pacienteId: 'pac-1', fecha: '2025-06-18', profId: 'prof-3',
    especialidad: 'Clínica Médica', motivo: 'Control anual',
    subjetivo: 'Refiere astenia leve, sin otra sintomatología.',
    objetivo: 'TA 120/80, FC 72, afebril. Buen estado general.',
    diagnostico: 'Control de salud sin hallazgos.',
    plan: 'Laboratorio de rutina. Reevaluar en 12 meses.',
    medicacion: ['Vitamina D 1000 UI/día'],
    adjuntos: ['est-1'],
  },
  {
    id: 'ev-2', pacienteId: 'pac-1', fecha: '2025-07-02', profId: 'prof-2',
    especialidad: 'Cardiología', motivo: 'Interconsulta por palpitaciones',
    subjetivo: 'Palpitaciones ocasionales, sin dolor precordial.',
    objetivo: 'ECG sin alteraciones agudas. TA 118/76.',
    diagnostico: 'Extrasístoles benignas.',
    plan: 'Holter 24hs. Control en 30 días.',
    medicacion: [],
    adjuntos: ['est-2'],
  },
  {
    id: 'ev-3', pacienteId: 'pac-2', fecha: '2025-07-10', profId: 'prof-2',
    especialidad: 'Cardiología', motivo: 'Seguimiento HTA',
    subjetivo: 'Buena adherencia al tratamiento.',
    objetivo: 'TA 140/90. Resto sin particularidades.',
    diagnostico: 'HTA esencial en tratamiento.',
    plan: 'Ajuste de dosis. MAPA. Control en 15 días.',
    medicacion: ['Enalapril 10 mg c/12h', 'Amlodipina 5 mg/día'],
    adjuntos: [],
  },
  {
    id: 'ev-4', pacienteId: 'pac-4', fecha: '2025-05-21', profId: 'prof-6',
    especialidad: 'Dermatología', motivo: 'Control lesión pigmentada',
    subjetivo: 'Lesión en espalda sin cambios referidos.',
    objetivo: 'Nevo de bordes regulares. Dermatoscopía sin criterios de alarma.',
    diagnostico: 'Nevo melanocítico benigno.',
    plan: 'Control dermatoscópico en 6 meses.',
    medicacion: [],
    adjuntos: ['est-3'],
  },
]

/* Estudios / archivos cargados */
export const estudios = [
  { id: 'est-1', pacienteId: 'pac-1', tipo: 'Laboratorio', nombre: 'Análisis de sangre completo.pdf', formato: 'PDF', tamano: '312 KB', fecha: '2025-06-18', cargadoPor: 'Dr. Hernán González' },
  { id: 'est-2', pacienteId: 'pac-1', tipo: 'ECG', nombre: 'Electrocardiograma.pdf', formato: 'PDF', tamano: '88 KB', fecha: '2025-07-02', cargadoPor: 'Dr. César Nascimento' },
  { id: 'est-3', pacienteId: 'pac-4', tipo: 'Dermatoscopía', nombre: 'Dermatoscopia-espalda.jpg', formato: 'JPG', tamano: '1.2 MB', fecha: '2025-05-21', cargadoPor: 'Dra. Verónica Cobo' },
  { id: 'est-4', pacienteId: 'pac-2', tipo: 'Imagen', nombre: 'Rx-torax.jpg', formato: 'JPG', tamano: '940 KB', fecha: '2025-07-10', cargadoPor: 'Dr. César Nascimento' },
]

/* ---- helpers ---- */
export const nombreCompleto = (p) => (p ? `${p.apellido}, ${p.nombre}`.toUpperCase() : '—')
export const getPaciente = (id) => pacientes.find((p) => p.id === id)
export const getProfesional = (id) => PROFESIONALES.find((p) => p.id === id)
export const evolucionesDe = (pacId) =>
  evoluciones.filter((e) => e.pacienteId === pacId).sort((a, b) => b.fecha.localeCompare(a.fecha))
export const estudiosDe = (pacId) =>
  estudios.filter((e) => e.pacienteId === pacId).sort((a, b) => b.fecha.localeCompare(a.fecha))
export const turnosDe = (pacId) => turnos.filter((t) => t.pacienteId === pacId)
