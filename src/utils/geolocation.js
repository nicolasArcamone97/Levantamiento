/**
 * Obtiene la ubicación actual del dispositivo, afinando la lectura: en vez de
 * quedarse con la primera respuesta (que suele ser la más imprecisa), escucha
 * varias actualizaciones durante unos segundos y se queda con la de mejor
 * precisión. Devuelve { lat, lng, accuracy } o rechaza con un mensaje legible.
 */
export function getCurrentPosition({ ventanaMs = 6000, precisionObjetivoM = 15 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este dispositivo no soporta geolocalización'))
      return
    }

    let mejor = null
    let watchId = null
    let resuelto = false

    const finalizar = () => {
      if (resuelto) return
      resuelto = true
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
      if (mejor) {
        resolve(mejor)
      } else {
        reject(new Error('No se pudo obtener la ubicación'))
      }
    }

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lectura = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        if (!mejor || lectura.accuracy < mejor.accuracy) mejor = lectura
        // Si ya logramos buena precisión, no hace falta seguir esperando
        if (lectura.accuracy <= precisionObjetivoM) finalizar()
      },
      (err) => {
        if (mejor) {
          finalizar()
          return
        }
        let msg = 'No se pudo obtener la ubicación'
        if (err.code === err.PERMISSION_DENIED) msg = 'Permiso de ubicación denegado'
        if (err.code === err.TIMEOUT) msg = 'Tiempo de espera agotado buscando ubicación'
        resuelto = true
        if (watchId != null) navigator.geolocation.clearWatch(watchId)
        reject(new Error(msg))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )

    setTimeout(finalizar, ventanaMs)
  })
}
