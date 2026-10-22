/* Estudios (archivos del paciente): categorías y reglas de carga.
 * Son guía para el usuario; la validación real la hace la API (routes/estudios.ts). */
import { ESTUDIOS_CV } from '../data/hc/cardiologia'
import { CATEGORIAS_ESTUDIO_CM } from '../data/hc/clinica'
import { CATEGORIAS_ESTUDIO_PSI } from '../data/hc/psicologia'
import { CATEGORIAS_ESTUDIO_NEUMO } from '../data/hc/neumonologia'
import { CATEGORIAS_ESTUDIO_INFECTO } from '../data/hc/infectologia'
import { CATEGORIAS_ESTUDIO_NEURO } from '../data/hc/neurologia'
import { CATEGORIAS_ESTUDIO_ENDO } from '../data/hc/endocrino'
import { CATEGORIAS_ESTUDIO_ECO } from '../data/hc/ecografia'
import { CATEGORIAS_ESTUDIO_PED } from '../data/hc/pediatria'
import { CATEGORIAS_ESTUDIO_CX } from '../data/hc/cirugia'
import { CATEGORIAS_ESTUDIO_NUTRI } from '../data/hc/nutricion'
import { CATEGORIAS_ESTUDIO_GINE } from '../data/hc/ginecologia'
import { CATEGORIAS_ESTUDIO_KINE } from '../data/hc/kinesiologia'
import { CATEGORIAS_ESTUDIO_PSQ } from '../data/hc/psiquiatria'
import { CATEGORIAS_ESTUDIO_OFT } from '../data/hc/oftalmologia'

// Categorías: las generales + las de Cardiología (cada especialidad suma las suyas).
// Sin duplicados: varias especialidades pueden sumar la misma categoría (ej. Polisomnografía).
export const TIPOS_ESTUDIO = [...new Set([
  'Laboratorio', 'Radiografía', 'Ecografía', 'Tomografía', 'Resonancia',
  ...ESTUDIOS_CV,
  ...CATEGORIAS_ESTUDIO_CM,
  ...CATEGORIAS_ESTUDIO_PSI,
  ...CATEGORIAS_ESTUDIO_NEUMO,
  ...CATEGORIAS_ESTUDIO_INFECTO,
  ...CATEGORIAS_ESTUDIO_NEURO,
  ...CATEGORIAS_ESTUDIO_ENDO,
  ...CATEGORIAS_ESTUDIO_ECO,
  ...CATEGORIAS_ESTUDIO_PED,
  ...CATEGORIAS_ESTUDIO_CX,
  ...CATEGORIAS_ESTUDIO_NUTRI,
  ...CATEGORIAS_ESTUDIO_GINE,
  ...CATEGORIAS_ESTUDIO_KINE,
  ...CATEGORIAS_ESTUDIO_PSQ,
  ...CATEGORIAS_ESTUDIO_OFT,
  'Informe médico', 'Receta / Orden', 'Otro',
])]

export const FORMATOS_ESTUDIO = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'dcm', 'doc', 'docx', 'xls', 'xlsx']
export const ACCEPT_ESTUDIO = FORMATOS_ESTUDIO.map((f) => `.${f}`).join(',')
export const MAX_MB_ESTUDIO = 20
const VISIBLES = ['pdf', 'jpg', 'jpeg', 'png', 'webp'] // se pueden abrir en el navegador

export const extensionDe = (nombre) => (nombre.includes('.') ? nombre.split('.').pop().toLowerCase() : '')
export const esVisible = (formato) => VISIBLES.includes((formato || '').toLowerCase())

export const tamanoHumano = (bytes) => {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Devuelve el motivo por el que el archivo no se puede subir, o null si es válido. */
export const errorArchivo = (file) => {
  if (!FORMATOS_ESTUDIO.includes(extensionDe(file.name))) {
    return `"${file.name}": formato no admitido (${FORMATOS_ESTUDIO.join(', ')}).`
  }
  if (file.size > MAX_MB_ESTUDIO * 1024 * 1024) return `"${file.name}": supera el máximo de ${MAX_MB_ESTUDIO} MB.`
  if (file.size === 0) return `"${file.name}": el archivo está vacío.`
  return null
}
