import { booleanPointInPolygon, point } from '@turf/turf'
import cuadrantesData from '../data/cuadrantes.json'
import rutasData from '../data/rutas.json'

function buscarEnColeccion(lat, lng, coleccion) {
  const pt = point([lng, lat])
  const match = coleccion.features.find((f) => {
    try {
      return booleanPointInPolygon(pt, f)
    } catch {
      return false
    }
  })
  return match?.properties?.name || null
}

/**
 * Dado un lat/lng, devuelve { ruta, cuadrante } según los polígonos
 * cargados desde CUADRANTES_2026.kml. Si el punto no cae en ninguno
 * (fuera de cobertura o límites), devuelve null en el campo que no matchea.
 */
export function detectarRutaYCuadrante(lat, lng) {
  if (lat == null || lng == null) return { ruta: null, cuadrante: null }
  return {
    ruta: buscarEnColeccion(lat, lng, rutasData),
    cuadrante: buscarEnColeccion(lat, lng, cuadrantesData),
  }
}
