import cuadrantesData from '../data/cuadrantes.json'
import rutasData from '../data/rutas.json'

function nombresOrdenados(coleccion) {
  return coleccion.features
    .map((f) => f.properties)
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    .map((p) => p.name)
}

export const CUADRANTES_DISPONIBLES = nombresOrdenados(cuadrantesData)
export const RUTAS_DISPONIBLES = nombresOrdenados(rutasData)
