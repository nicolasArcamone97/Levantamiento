// Arma los "agujeros" que Leaflet necesita para poder oscurecer todo el mapa
// excepto el partido de Hurlingham. Recibe una Feature de GeoJSON (Polygon o
// MultiPolygon, en [lng, lat]) y devuelve los anillos en formato Leaflet [lat, lng].

const MUNDO = [
  [85, -180],
  [85, 180],
  [-85, 180],
  [-85, -180],
]

function anillosDe(geometry) {
  if (!geometry) return []
  const anillos = []
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
  polys.forEach((poly) => {
    // El primer anillo de cada polígono es el contorno exterior
    const exterior = poly[0]
    anillos.push(exterior.map(([lng, lat]) => [lat, lng]))
  })
  return anillos
}

/**
 * Devuelve las "positions" para un <Polygon> de react-leaflet: el rectángulo
 * del mundo entero como anillo exterior, y el contorno de Hurlingham como
 * agujero — el resultado visual es todo oscurecido menos el partido.
 */
export function buildMaskPositions(boundaryFeature) {
  const huecos = anillosDe(boundaryFeature?.geometry)
  if (huecos.length === 0) return null
  return [MUNDO, ...huecos]
}
