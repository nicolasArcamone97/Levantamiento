import { CUADRILLAS } from './constants'

// Cada campo del sistema al que se puede mapear una columna de la planilla.
// `alias` se usa para el auto-match por nombre de columna (normalizado).
export const CAMPOS_SISTEMA = [
  { key: 'fecha', label: 'Fecha', alias: ['fecha', 'fechacarga'] },
  { key: 'origen', label: 'Origen', alias: ['origen'] },
  { key: 'direccionManual', label: 'Dirección', alias: ['direccion', 'direccionmanual'] },
  { key: 'entreCalles', label: 'Entre calles', alias: ['entrecalles', 'entre calles'] },
  { key: 'tipoTexto', label: 'Tipo', alias: ['tipo'] },
  { key: 'subtipo', label: 'Subtipo', alias: ['subtipo'] },
  { key: 'obs', label: 'Observaciones', alias: ['obs', 'observaciones'] },
  { key: 'ruta', label: 'Ruta', alias: ['ruta'] },
  { key: 'cuadrante', label: 'Cuadrante', alias: ['cuad', 'cuadrante'] },
  ...CUADRILLAS.map((c) => ({ key: c.key, label: c.label, alias: [c.label.toLowerCase(), c.corto.toLowerCase()] })),
]

/** Normaliza texto para comparar encabezados: sin acentos, minúsculas, sin espacios/puntos. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Sugiere a qué campo del sistema corresponde un encabezado de columna, si hay match. */
export function sugerirCampo(encabezado) {
  const norm = normalizar(encabezado)
  const match = CAMPOS_SISTEMA.find((c) => c.alias.some((a) => normalizar(a) === norm))
  return match?.key || ''
}
