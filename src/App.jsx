import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'

// Carga diferida: el mapa (Leaflet), el importador (xlsx/jszip) y demás solo se
// descargan cuando el usuario realmente entra ahí, no al abrir la app.
const RelevamientoForm = lazy(() => import('./components/RelevamientoForm'))
const SistematizacionPanel = lazy(() => import('./components/SistematizacionPanel'))

function Cargando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
      Cargando...
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/relevamiento" element={<RelevamientoForm />} />
          <Route path="/sistematizacion" element={<SistematizacionPanel />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
