// API pública de datos.gob.ar (GeoRef Argentina) para obtener límites municipales.
// Doc: https://datosgobar.github.io/georef-ar-api/
// Se pide el municipio de Hurlingham con geometría en GeoJSON.

const GEOREF_URL =
  'https://apis.datos.gob.ar/georef/api/municipios?nombre=Hurlingham&provincia=Buenos%20Aires&campos=geometria,nombre,centroide&formato=json&max=1'

let cachedGeometry = null

/**
 * Devuelve la geometría (GeoJSON) del límite de Hurlingham.
 * Se cachea en memoria para no pegarle a la API en cada render.
 */
export async function getHurlinghamBoundary() {
  if (cachedGeometry) return cachedGeometry

  try {
    const res = await fetch(GEOREF_URL)
    if (!res.ok) throw new Error('Error consultando GeoRef')
    const data = await res.json()
    const municipio = data?.municipios?.[0]
    if (!municipio?.geometria) throw new Error('Sin geometría disponible')

    cachedGeometry = {
      type: 'Feature',
      properties: { nombre: municipio.nombre },
      geometry: municipio.geometria,
    }
    return cachedGeometry
  } catch (err) {
    console.warn('No se pudo obtener el límite de Hurlingham desde GeoRef:', err.message)
    return null
  }
}
