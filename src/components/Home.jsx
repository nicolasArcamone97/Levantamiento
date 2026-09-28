import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 bg-slate-50">
      <div className="text-center mb-4">
        <h1 className="font-display text-2xl font-bold text-slate-800">Hurlingham</h1>
        <p className="text-gray-500 text-sm">Levantamiento</p>
      </div>

      <Link
        to="/relevamiento"
        className="w-full max-w-xs bg-brand-600 text-white font-semibold rounded-2xl py-4 text-center shadow-card"
      >
        Cargar relevamiento
      </Link>
      <Link
        to="/sistematizacion"
        className="w-full max-w-xs bg-white text-slate-700 font-semibold rounded-2xl py-4 text-center border-2 border-slate-200"
      >
        Sistematización
      </Link>
    </div>
  )
}
