// Geocodificación inversa: a partir de lat/lng devuelve la calle+altura aproximada.
// Nominatim (OpenStreetMap) resuelve la calle; la API de GeoRef (datos.gob.ar) se usa
// además para confirmar que el punto cae dentro del partido de Hurlingham.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const GEOREF_UBICACION_URL = 'https://apis.datos.gob.ar/georef/api/ubicacion'

/**
 * Devuelve { direccion, municipio, dentroDeHurlingham } a partir de lat/lng.
 * Nunca revienta: si alguna de las dos APIs falla, devuelve lo que haya podido resolver.
 */
export async function reverseGeocode(lat, lng) {
  const resultado = { direccion: null, municipio: null, dentroDeHurlingham: null }

  // 1) Calle aproximada vía Nominatim
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    )
    if (res.ok) {
      const data = await res.json()
      const a = data.address || {}
      const calle = a.road || a.pedestrian || a.residential || ''
      const altura = a.house_number ? ` ${a.house_number}` : ''
      resultado.direccion = calle ? `${calle}${altura}` : data.display_name || null
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode falló:', err.message)
  }

  // 2) Confirmación de partido vía GeoRef (datos.gob.ar)
  try {
    const res = await fetch(`${GEOREF_UBICACION_URL}?lat=${lat}&lon=${lng}&campos=municipio&formato=json`)
    if (res.ok) {
      const data = await res.json()
      const municipio = data?.ubicacion?.municipio?.nombre || null
      resultado.municipio = municipio
      resultado.dentroDeHurlingham = municipio ? /hurlingham/i.test(municipio) : null
    }
  } catch (err) {
    console.warn('GeoRef ubicación falló:', err.message)
  }

  return resultado
}

/**
 * Geocodificación directa: a partir de una dirección escrita, devuelve
 * { lat, lng } aproximados (gratis, vía Nominatim/OpenStreetMap, sin API key).
 * Devuelve null si no encuentra nada o falla la consulta.
 */
export async function forwardGeocode(direccion) {
  if (!direccion || direccion.trim().length < 3) return null
  try {
    const consulta = `${direccion}, Hurlingham, Buenos Aires, Argentina`
    const res = await fetch(
      `${NOMINATIM_SEARCH_URL}?format=json&q=${encodeURIComponent(consulta)}&countrycodes=ar&limit=1`,
      { headers: { 'Accept-Language': 'es' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch (err) {
    console.warn('Geocodificación de dirección falló:', err.message)
    return null
  }
}
