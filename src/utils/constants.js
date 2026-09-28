// Tipos de relevamiento y sus subtipos (null = no tiene subtipo)
export const TIPOS = {
  BASURA: {
    label: 'Basura',
    color: '#d97706', // amber
    subtipos: ['MANUAL', 'MAQUINARIA +2', 'MAQUINARIA -2'],
  },
  RESTOSVERDES: {
    label: 'Restos Verdes',
    color: '#16a34a', // green
    subtipos: ['MANUAL', 'MAQUINARIA +2', 'MAQUINARIA -2'],
  },
  ESCOMBROS: {
    label: 'Escombros',
    color: '#78716c', // stone
    subtipos: ['EMBOLSADOS', 'SIN EMBOLSAR'],
  },
  MICROBASURAL: {
    label: 'Microbasural',
    color: '#dc2626', // red
    subtipos: null,
  },
}

export const TIPO_KEYS = Object.keys(TIPOS)

export const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: '#f59e0b' },
  RESUELTO: { label: 'Resuelto', color: '#16a34a' },
}

// Cuadrillas/entidades que intervienen en la resolución del punto.
// Se marcan desde el panel de sistematización, no desde el relevamiento.
// CH 1 = Panizza (no se listan separado, CH1 ya lo representa).
export const CUADRILLAS = [
  { key: 'cuadrillaMunicipal', label: 'CUADRILLA MUNICIPAL', corto: 'C.MUNICIPAL' },
  { key: 'cooperativa', label: 'COOPERATIVA', corto: 'COOPERATIVA' },
  { key: 'levantamientoMecanico', label: 'LEVANTAMIENTO MECÁNICO', corto: 'LEV.MECÁNICO' },
  { key: 'ch1', label: 'CH 1', corto: 'CH 1' },
  { key: 'hu', label: 'HU', corto: 'HU' },
  { key: 'hu2', label: 'HU 2', corto: 'HU 2' },
  { key: 'ch6', label: 'CH 6', corto: 'CH 6' },
]

// Centro aproximado de Hurlingham, Buenos Aires, Argentina
export const HURLINGHAM_CENTER = [-34.6089, -58.6372]
export const HURLINGHAM_DEFAULT_ZOOM = 13
