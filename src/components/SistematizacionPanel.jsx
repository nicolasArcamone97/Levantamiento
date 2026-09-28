import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRegistros, subscribe } from '../services/db'
import { esActivo, esHistorico } from '../utils/estadoPunto'
import ListadoPuntos from './ListadoPuntos'
import PorCuadrante from './PorCuadrante'
import { Zap, Archive, Map as MapIcon, Upload, LayoutGrid, ArrowLeft } from 'lucide-react'

// Diferido: Leaflet (mapa) y xlsx/jszip (importador) son las dependencias más
// pesadas del proyecto; que solo se descarguen si el usuario entra a esas vistas.
const MapaRelevamiento = lazy(() => import('./MapaRelevamiento'))
const ImportarDatos = lazy(() => import('./ImportarDatos'))

function CargandoVista() {
  return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
}

const ITEMS = [
  { key: 'activo', label: 'Activo', icon: Zap },
  { key: 'historico', label: 'Histórico', icon: Archive },
  { key: 'cuadrantes', label: 'Por Cuadrante', icon: LayoutGrid },
  { key: 'mapa', label: 'Mapa', icon: MapIcon },
  { key: 'importar', label: 'Importar', icon: Upload },
]

export default function SistematizacionPanel() {
  const [registros, setRegistros] = useState([])
  const [vista, setVista] = useState('activo')
  const [mostrarCuadrantes, setMostrarCuadrantes] = useState(true)
  const [mostrarRutas, setMostrarRutas] = useState(false)

  useEffect(() => {
    cargar()
    return subscribe(cargar)
  }, [])

  async function cargar() {
    setRegistros(await getRegistros())
  }

  const activos = useMemo(() => registros.filter(esActivo), [registros])
  const historicos = useMemo(() => registros.filter(esHistorico), [registros])

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar: columna a la izquierda en desktop, barra horizontal arriba en mobile */}
      <aside
        className="shrink-0 border-b md:border-b-0 border-slate-200 md:w-56 md:flex md:flex-col text-white"
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <div className="px-4 py-4 hidden md:flex items-center gap-2 border-b border-white/10">
          <Link to="/" className="p-1 -ml-1 rounded-lg hover:bg-white/10 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Hurlingham</h1>
            <p className="text-slate-400 text-[11px] mt-0.5">Levantamiento</p>
          </div>
        </div>

        <nav className="flex items-center md:flex-col overflow-x-auto md:overflow-visible py-1">
          <Link to="/" className="flex md:hidden items-center justify-center px-3 py-3 shrink-0 text-slate-300 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          {ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium whitespace-nowrap shrink-0 md:shrink border-b-2 md:border-b-0 md:border-l-4 transition-colors ${
                vista === key
                  ? 'text-white border-brand-500 bg-brand-600/25'
                  : 'text-slate-400 border-transparent hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'activo' && <span className="ml-auto text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">{activos.length}</span>}
              {key === 'historico' && <span className="ml-auto text-[10px] bg-white/10 rounded-full px-1.5 py-0.5">{historicos.length}</span>}
            </button>
          ))}
        </nav>

        {vista === 'mapa' && (
          <div className="hidden md:flex flex-col gap-2 px-4 py-4 mt-auto border-t border-white/10">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Capas del mapa</p>
            <button
              onClick={() => setMostrarCuadrantes((v) => !v)}
              className={`text-xs font-semibold rounded-lg px-3 py-2 text-left border ${
                mostrarCuadrantes ? 'bg-brand-600/25 text-white border-brand-500/40' : 'bg-white/5 text-slate-400 border-transparent'
              }`}
            >
              ▭ Cuadrantes
            </button>
            <button
              onClick={() => setMostrarRutas((v) => !v)}
              className={`text-xs font-semibold rounded-lg px-3 py-2 text-left border ${
                mostrarRutas ? 'bg-brand-600/25 text-white border-brand-500/40' : 'bg-white/5 text-slate-400 border-transparent'
              }`}
            >
              〰 Rutas
            </button>
          </div>
        )}
      </aside>

      {/* Toggle de capas para mobile, cuando estamos en Mapa */}
      {vista === 'mapa' && (
        <div className="flex md:hidden gap-2 px-4 py-2.5 bg-white border-b border-slate-100 overflow-x-auto shrink-0">
          <button
            onClick={() => setMostrarCuadrantes((v) => !v)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 shrink-0 border ${
              mostrarCuadrantes ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-transparent'
            }`}
          >
            ▭ Cuadrantes
          </button>
          <button
            onClick={() => setMostrarRutas((v) => !v)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 shrink-0 border ${
              mostrarRutas ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-transparent'
            }`}
          >
            〰 Rutas
          </button>
        </div>
      )}

      <main className="flex-1 min-h-0 min-w-0">
        {vista === 'activo' && (
          <ListadoPuntos
            registros={activos}
            titulo="Puntos Activos"
            subtitulo="Todavía les falta algo: resolverlos o completar tipo/subtipo"
            mostrarAlertaFaltantes
            permitirFinalizar
          />
        )}
        {vista === 'historico' && (
          <ListadoPuntos
            registros={historicos}
            titulo="Histórico"
            subtitulo="Puntos resueltos y con datos completos"
            mostrarAlertaFaltantes={false}
          />
        )}
        {vista === 'mapa' && (
          <Suspense fallback={<CargandoVista />}>
            <MapaRelevamiento
              registros={activos}
              mostrarCuadrantes={mostrarCuadrantes}
              mostrarRutas={mostrarRutas}
            />
          </Suspense>
        )}
        {vista === 'cuadrantes' && <PorCuadrante registros={registros} />}
        {vista === 'importar' && (
          <Suspense fallback={<CargandoVista />}>
            <ImportarDatos />
          </Suspense>
        )}
      </main>
    </div>
  )
}
