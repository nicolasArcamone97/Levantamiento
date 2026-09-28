import { useRef, useState } from 'react'

export default function PhotoCapture({ onCapture }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result)
      onCapture(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function reset() {
    setPreview(null)
    onCapture(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        id="photo-input"
      />
      {!preview ? (
        <label
          htmlFor="photo-input"
          className="flex flex-col items-center justify-center gap-2 w-full h-40 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 text-brand-700 active:bg-brand-100 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l1.5-2h7L17 7h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
            <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-medium text-sm">Sacar foto</span>
        </label>
      ) : (
        <div className="relative">
          <img src={preview} alt="Foto del relevamiento" className="w-full h-48 object-cover rounded-xl" />
          <button
            type="button"
            onClick={reset}
            className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full"
          >
            Cambiar
          </button>
        </div>
      )}
    </div>
  )
}
