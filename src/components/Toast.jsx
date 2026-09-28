import { useEffect } from 'react'

/**
 * Alerta flotante arriba de la pantalla, tipo toast, que avisa que el
 * relevamiento ya se cargó. Se cierra sola a los 2.5s.
 */
export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-[2000] flex justify-center pointer-events-none">
      <div className="bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-[toast-in_0.25s_ease-out]">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  )
}
