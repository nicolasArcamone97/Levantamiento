import { useState } from 'react'
import * as XLSX from 'xlsx'
import { CAMPOS_SISTEMA, sugerirCampo } from '../utils/camposSistema'
import { construirRegistro } from '../utils/importarPlanilla'
import { importarRegistros } from '../services/db'
import { Upload, FileSpreadsheet, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ImportarDatos() {
  const [paso, setPaso] = useState(1) // 1: subir | 2: mapear | 3: listo
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [encabezados, setEncabezados] = useState([])
  const [filas, setFilas] = useState([])
  const [mapeo, setMapeo] = useState({}) // { encabezado: campoSistemaKey }
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  function handleArchivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setNombreArchivo(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: false })
        const hoja = wb.Sheets[wb.SheetNames[0]]
        const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: '' })
        if (matriz.length < 2) throw new Error('La planilla no tiene filas de datos')

        const [encFila, ...resto] = matriz
        const encs = encFila.map((h, i) => String(h || `Columna ${i + 1}`).trim())
        setEncabezados(encs)
        setFilas(resto.filter((f) => f.some((v) => v !== '')))

        // Auto-match: sugiere el campo del sistema según el nombre de cada columna
        const mapeoInicial = {}
        encs.forEach((enc) => { mapeoInicial[enc] = sugerirCampo(enc) })
        setMapeo(mapeoInicial)
        setPaso(2)
      } catch (err) {
        setError('No se pudo leer el archivo: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function cambiarMapeo(encabezado, campo) {
    setMapeo((m) => ({ ...m, [encabezado]: campo }))
  }

  async function confirmarImportacion() {
    setImportando(true)
    try {
      const registros = filas.map((fila) => construirRegistro(fila, encabezados, mapeo))
      await importarRegistros(registros)
      setResultado(registros.length)
      setPaso(3)
    } finally {
      setImportando(false)
    }
  }

  function reiniciar() {
    setPaso(1); setNombreArchivo(''); setEncabezados([]); setFilas([]); setMapeo({}); setResultado(null); setError('')
  }

  const columnasUsadas = Object.values(mapeo).filter(Boolean)

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto h-full max-w-4xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Importar Planilla</h1>
        <p className="text-slate-500 text-sm mt-0.5">Cargá un Excel o CSV y elegí qué columna corresponde a cada dato del sistema.</p>
      </div>

      {paso === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-brand-300 bg-brand-50/40 rounded-xl py-12 cursor-pointer hover:bg-brand-50">
            <Upload className="w-8 h-8 text-brand-600" />
            <span className="font-semibold text-slate-700 text-sm">Hacé click para elegir un archivo .xlsx o .csv</span>
            <span className="text-xs text-slate-400">La primera fila debe tener los nombres de columna</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleArchivo} />
          </label>
          {error && <p className="text-red-600 text-sm mt-3 font-medium">{error}</p>}
        </div>
      )}

      {paso === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800 text-sm">{nombreArchivo}</h2>
            <span className="text-xs text-slate-400">· {filas.length} filas detectadas</span>
          </div>

          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-500">
              Para cada columna de tu planilla, elegí a qué campo del sistema corresponde. Las que dejes en "No importar" se ignoran.
            </p>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {encabezados.map((enc) => (
                <div key={enc} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{enc}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      ej: {String(filas[0]?.[encabezados.indexOf(enc)] ?? '—')}
                    </p>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-300 rotate-180 shrink-0" />
                  <select
                    value={mapeo[enc] || ''}
                    onChange={(e) => cambiarMapeo(enc, e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 w-48 shrink-0"
                  >
                    <option value="">No importar</option>
                    {CAMPOS_SISTEMA.map((c) => (
                      <option key={c.key} value={c.key} disabled={columnasUsadas.includes(c.key) && mapeo[enc] !== c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={reiniciar} className="btn-outline">Cancelar</button>
              <button
                onClick={confirmarImportacion}
                disabled={importando || columnasUsadas.length === 0}
                className="ml-auto bg-brand-600 disabled:bg-slate-300 text-white font-semibold rounded-lg px-4 py-2 text-sm"
              >
                {importando ? 'Importando...' : `Importar ${filas.length} filas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
          <p className="font-semibold text-slate-800">Se importaron {resultado} puntos correctamente</p>
          <p className="text-sm text-slate-500">Ya los podés ver en Activo o Histórico según su estado.</p>
          <button onClick={reiniciar} className="btn-outline mx-auto">Importar otra planilla</button>
        </div>
      )}

      <style>{`
        .btn-outline { font-size: 0.8rem; font-weight: 600; border: 1px solid #e2e8f0; color: #475569; border-radius: 0.5rem; padding: 0.5rem 0.9rem; background: white; }
        .btn-outline:hover { background: #f8fafc; }
      `}</style>
    </div>
  )
}
