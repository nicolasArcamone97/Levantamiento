import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import { TIPOS, HURLINGHAM_CENTER, HURLINGHAM_DEFAULT_ZOOM } from '../utils/constants'
import { getHurlinghamBoundary } from '../utils/georef'
import { buildMaskPositions } from '../utils/mapMask'
import { colorDeCuadrante } from '../utils/coloresCuadrantes'
import cuadrantesData from '../data/cuadrantes.json'
import rutasData from '../data/rutas.json'

/** Encuadra el mapa: prioriza los cuadrantes activos (los que tienen puntos relevados);
 * si no hay ninguno, encuadra el contorno completo de Hurlingham. */
function Enfocar({ boundary, cuadrantesActivosGeoJSON }) {
  const map = useMap()
  useEffect(() => {
    const objetivo = cuadrantesActivosGeoJSON?.features?.length ? cuadrantesActivosGeoJSON : boundary
    if (!objetivo) return
    const layer = L.geoJSON(objetivo)
    const bounds = layer.getBounds()
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 })
      if (boundary) {
        const boundsPartido = L.geoJSON(boundary).getBounds()
        if (boundsPartido.isValid()) map.setMaxBounds(boundsPartido.pad(0.15))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary, cuadrantesActivosGeoJSON?.features?.length])
  return null
}

/** Cada cuadrante/ruta muestra su nombre siempre visible (label) y color propio. */
function crearEtiqueta(claseCss) {
  return (feature, layer) => {
    if (feature?.properties?.name) {
      layer.bindTooltip(feature.properties.name, { permanent: true, direction: 'center', className: claseCss })
    }
  }
}

export default function MapaRelevamiento({ registros, onSelect, mostrarCuadrantes, mostrarRutas }) {
  const [boundary, setBoundary] = useState(null)

  useEffect(() => {
    getHurlinghamBoundary().then(setBoundary)
  }, [])

  const conUbicacion = registros.filter((r) => r.lat && r.lng)
  const maskPositions = boundary ? buildMaskPositions(boundary) : null

  // Cuadrantes "activos" = donde ya se está cargando relevamiento (tienen al menos un punto)
  const nombresActivos = useMemo(
    () => new Set(registros.map((r) => r.cuadrante).filter(Boolean)),
    [registros]
  )

  const cuadrantesActivosGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: cuadrantesData.features.filter((f) => nombresActivos.has(f.properties.name)),
  }), [nombresActivos])

  function estiloCuadrante(feature) {
    const activo = nombresActivos.has(feature.properties.name)
    const color = colorDeCuadrante(feature.properties.numero, feature.properties.name)
    return activo
      ? { color, weight: 3, fillColor: color, fillOpacity: 0.22, opacity: 1 }
      : { color: '#94a3b8', weight: 1, fillColor: '#94a3b8', fillOpacity: 0.03, opacity: 0.4, dashArray: '3 4' }
  }

  return (
    <MapContainer
      center={HURLINGHAM_CENTER}
      zoom={HURLINGHAM_DEFAULT_ZOOM}
      minZoom={12}
      className="w-full h-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Enfocar boundary={boundary} cuadrantesActivosGeoJSON={mostrarCuadrantes ? cuadrantesActivosGeoJSON : null} />

      {/* Oscurece todo lo que queda fuera del partido */}
      {maskPositions && (
        <Polygon
          positions={maskPositions}
          pathOptions={{ color: 'transparent', fillColor: '#000000', fillOpacity: 0.35, stroke: false }}
          interactive={false}
        />
      )}

      {/* Cuadrantes: cada uno con su color, los activos (con puntos cargados) resaltados y el resto apagado */}
      {mostrarCuadrantes && (
        <GeoJSON
          key={`cuadrantes-${nombresActivos.size}`}
          data={cuadrantesData}
          style={estiloCuadrante}
          onEachFeature={crearEtiqueta('etiqueta-cuadrante')}
        />
      )}

      {/* Rutas de recorrido (21) */}
      {mostrarRutas && (
        <GeoJSON
          data={rutasData}
          style={{ color: '#9333ea', weight: 1.5, fillColor: '#a855f7', fillOpacity: 0.08 }}
          onEachFeature={crearEtiqueta('etiqueta-cuadrante')}
        />
      )}

      {/* Contorno del partido, bien marcado */}
      {boundary && (
        <GeoJSON
          data={boundary}
          style={{ color: '#000000', weight: 4, opacity: 1, fillOpacity: 0, lineJoin: 'round' }}
        />
      )}

      {conUbicacion.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={9}
          pathOptions={{
            color: TIPOS[r.tipo]?.color || '#333',
            fillColor: TIPOS[r.tipo]?.color || '#333',
            fillOpacity: r.ch6 ? 0.25 : 0.85,
            weight: r.ch6 ? 1 : 2,
          }}
          eventHandlers={{ click: () => onSelect?.(r) }}
        >
          <Popup>
            <div className="text-xs space-y-1">
              <p className="font-semibold">{TIPOS[r.tipo]?.label} {r.subtipo ? `· ${r.subtipo}` : ''}</p>
              <p>{r.direccionManual}</p>
              {r.direccionGeolocalizada && (
                <p className="text-gray-500">📍 GPS: {r.direccionGeolocalizada}</p>
              )}
              <p className="text-gray-500">{new Date(r.fecha).toLocaleString('es-AR')}</p>
              <p className="font-semibold" style={{ color: r.ch6 ? '#16a34a' : '#f59e0b' }}>
                {r.ch6 ? 'RESUELTO (CH6)' : 'PENDIENTE'}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
