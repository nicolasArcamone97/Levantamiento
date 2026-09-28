import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TIPOS, TIPO_KEYS } from '../utils/constants'
import { getCurrentPosition } from '../utils/geolocation'
import { reverseGeocode } from '../utils/reverseGeocode'
import { detectarRutaYCuadrante } from '../utils/geoLookup'
import { addRegistro } from '../services/db'
import PhotoCapture from './PhotoCapture'
import Toast from './Toast'

const initialState = {
  tipo: '',
  direccionManual: '',
  foto: null,
  relevador: '',
}

export default function RelevamientoForm() {
  const [form, setForm] = useState(initialState)
  const [fotoKey, setFotoKey] = useState(0) // fuerza que la foto se limpie después de guardar
  const [gps, setGps] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('buscando') // buscando | ok | error
  const [gpsError, setGpsError] = useState('')
  const [direccionGeo, setDireccionGeo] = useState(null)
  const [fueraDeHurlingham, setFueraDeHurlingham] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Geolocaliza apenas se abre el formulario, en paralelo con el resto de la carga
  useEffect(() => {
    buscarUbicacion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buscarUbicacion() {
    setGpsStatus('buscando')
    setGpsError('')
    setFueraDeHurlingham(null)
    try {
      const pos = await getCurrentPosition()
      setGps(pos)
      setGpsStatus('ok')
      // Resuelve la calle en paralelo; no bloquea el resto del formulario
      reverseGeocode(pos.lat, pos.lng).then((geo) => {
        setDireccionGeo(geo.direccion)
        setFueraDeHurlingham(geo.dentroDeHurlingham === false)
        // Autocompleta la dirección detectada; si el usuario ya escribió algo a mano, no lo pisa
        if (geo.direccion) {
          setForm((f) => (f.direccionManual ? f : { ...f, direccionManual: geo.direccion }))
        }
      })
    } catch (err) {
      setGpsError(err.message)
      setGpsStatus('error')
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function selectTipo(tipo) {
    setForm((f) => ({ ...f, tipo }))
  }

  const puedeGuardar = form.tipo && form.direccionManual.trim().length > 0 && form.foto

  async function handleSubmit(e) {
    e.preventDefault()
    if (!puedeGuardar) return
    setSaving(true)
    try {
      const { ruta, cuadrante } = detectarRutaYCuadrante(gps?.lat, gps?.lng)
      await addRegistro({
        tipo: form.tipo,
        subtipo: null, // lo termina de definir el administrador al revisar
        direccionManual: form.direccionManual.trim(),
        direccionGeolocalizada: direccionGeo,
        fotoBase64: form.foto,
        relevador: form.relevador.trim() || 'Sin identificar',
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
        accuracy: gps?.accuracy ?? null,
        ruta,
        cuadrante,
      })
      setForm({ ...initialState, relevador: form.relevador }) // mantiene cargado el nombre del relevador
      setFotoKey((k) => k + 1) // limpia la foto de verdad (remonta el componente)
      setDireccionGeo(null)
      setToast('Relevamiento cargado ✓')
      buscarUbicacion()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Toast message={toast} onDone={() => setToast(null)} />

      <header className="text-white px-4 pt-6 pb-5 rounded-b-3xl shadow-card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight">Hurlingham</h1>
            <p className="text-slate-300 text-xs">Levantamiento</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 mt-5 space-y-5">
        {/* Estado GPS */}
        <div
          className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
            gpsStatus === 'ok'
              ? 'bg-green-50 text-green-800'
              : gpsStatus === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <div>
            {gpsStatus === 'buscando' && 'Buscando ubicación GPS...'}
            {gpsStatus === 'ok' && (
              <>
                GPS OK · {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                <span className="block text-xs opacity-70">precisión ±{Math.round(gps.accuracy)}m</span>
              </>
            )}
            {gpsStatus === 'error' && gpsError}
          </div>
          <button
            type="button"
            onClick={buscarUbicacion}
            className="text-xs font-semibold underline shrink-0 ml-2"
          >
            Reintentar
          </button>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de relevamiento</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPO_KEYS.map((key) => {
              const t = TIPOS[key]
              const active = form.tipo === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectTipo(key)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold border-2 transition ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                  style={active ? { backgroundColor: t.color } : {}}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">El subtipo lo termina de definir el administrador al revisar.</p>
        </div>

        {/* Dirección manual, autocompletada por GPS */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
          <input
            type="text"
            value={form.direccionManual}
            onChange={(e) => update('direccionManual', e.target.value)}
            placeholder="Ej: Av. Vergara 1234"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            {direccionGeo
              ? 'Se completó automáticamente por GPS · podés corregirla'
              : 'Buscando dirección por GPS...'}
          </p>
          {fueraDeHurlingham && (
            <p className="text-xs text-red-600 font-semibold mt-1">
              ⚠ El GPS indica que este punto está fuera de Hurlingham
            </p>
          )}
        </div>

        {/* Foto */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Foto</label>
          <PhotoCapture key={fotoKey} onCapture={(b64) => update('foto', b64)} />
        </div>

        {/* Relevador */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Relevador (opcional)</label>
          <input
            type="text"
            value={form.relevador}
            onChange={(e) => update('relevador', e.target.value)}
            placeholder="Nombre y apellido"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </form>

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={!puedeGuardar || saving}
          className="w-full bg-brand-600 disabled:bg-gray-300 text-white font-semibold rounded-xl py-3.5 text-sm active:bg-brand-700 transition"
        >
          {saving ? 'Guardando...' : 'Cargar relevamiento'}
        </button>
      </div>
    </div>
  )
}
