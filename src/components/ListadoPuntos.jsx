import { useEffect, useMemo, useState } from 'react'
import { TIPOS, TIPO_KEYS, CUADRILLAS } from '../utils/constants'
import { CUADRANTES_DISPONIBLES, RUTAS_DISPONIBLES } from '../utils/geoOpciones'
import { updateCampo, updateClasificacion, marcarServicio, finalizarPuntos } from '../services/db'
import { estaResuelto } from '../utils/estadoPunto'
import { exportarReclamoPanizza } from '../utils/exportarPanizza'
import { Filter, Download, AlertTriangle, ChevronLeft, ChevronRight, FlagOff } from 'lucide-react'

const ORIGENES = ['RELEVAMIENTO']
const KEYS_SERVICIOS = CUADRILLAS.map((c) => c.key)
const N_COLS = 7 + CUADRILLAS.length

function Badge({ children, className = '', style, title }) {
  return (
    <span
      style={style}
      title={title}
      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  )
}

function faltaClasificacion(r) {
  return !r.tipo || (!!TIPOS[r.tipo]?.subtipos && !r.subtipo)
}

function formatFechaCorta(fecha) {
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export default function ListadoPuntos({ registros, titulo = 'Listado de Puntos', subtitulo = 'Consulta y filtrado de puntos relevados', mostrarAlertaFaltantes = true, permitirFinalizar = false }) {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [cuadranteFiltro, setCuadranteFiltro] = useState('')
  const [rutaFiltro, setRutaFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [subtipoFiltro, setSubtipoFiltro] = useState('')
  const [origenFiltro, setOrigenFiltro] = useState('')
  const [cuadrillaFiltro, setCuadrillaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('') // '' | 'PENDIENTE' | 'RESUELTO'
  const [zoomFoto, setZoomFoto] = useState(null)
  const [editandoTipoId, setEditandoTipoId] = useState(null)
  const [editandoGeoId, setEditandoGeoId] = useState(null)
  const [verFaltantes, setVerFaltantes] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  // Finalizar ciclo (fecha + cuadrante): cierra el lote y arma el reclamo a Panizza con lo que no se resolvió
  const [fechaFinalizar, setFechaFinalizar] = useState('')
  const [cuadranteFinalizar, setCuadranteFinalizar] = useState('')
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false)
  const [confirmeRevision, setConfirmeRevision] = useState(false)
  const [procesandoFinalizar, setProcesandoFinalizar] = useState(false)

  const subtiposDisponibles = tipoFiltro ? TIPOS[tipoFiltro]?.subtipos : null

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      const fechaCarga = r.fecha?.slice(0, 10)
      if (fechaDesde && fechaCarga < fechaDesde) return false
      if (fechaHasta && fechaCarga > fechaHasta) return false
      if (cuadranteFiltro && r.cuadrante !== cuadranteFiltro) return false
      if (rutaFiltro && r.ruta !== rutaFiltro) return false
      if (tipoFiltro && r.tipo !== tipoFiltro) return false
      if (subtipoFiltro && r.subtipo !== subtipoFiltro) return false
      if (origenFiltro && r.origen !== origenFiltro) return false
      if (cuadrillaFiltro && !r[cuadrillaFiltro]) return false
      if (estadoFiltro === 'PENDIENTE' && estaResuelto(r)) return false
      if (estadoFiltro === 'RESUELTO' && !estaResuelto(r)) return false
      return true
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) // más viejo primero: lo pendiente de días anteriores aparece arriba
  }, [registros, fechaDesde, fechaHasta, cuadranteFiltro, rutaFiltro, tipoFiltro, subtipoFiltro, origenFiltro, cuadrillaFiltro, estadoFiltro])

  const conteoFiltrado = useMemo(() => ({
    pendientes: filtrados.filter((r) => !estaResuelto(r)).length,
    resueltos: filtrados.filter(estaResuelto).length,
  }), [filtrados])

  const faltantes = useMemo(() => filtrados.filter(faltaClasificacion), [filtrados])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const itemsPagina = useMemo(
    () => filtrados.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina),
    [filtrados, paginaSegura, porPagina]
  )

  useEffect(() => {
    setPagina(1)
  }, [fechaDesde, fechaHasta, cuadranteFiltro, rutaFiltro, tipoFiltro, subtipoFiltro, origenFiltro, cuadrillaFiltro, estadoFiltro, porPagina])

  function limpiarFiltros() {
    setFechaDesde(''); setFechaHasta(''); setCuadranteFiltro(''); setRutaFiltro('')
    setTipoFiltro(''); setSubtipoFiltro(''); setOrigenFiltro(''); setCuadrillaFiltro('')
    setEstadoFiltro('')
  }

  // Puntos que entrarían en el cierre de ciclo elegido (misma fecha + mismo cuadrante)
  const puntosDelLote = useMemo(() => {
    if (!permitirFinalizar || !fechaFinalizar || !cuadranteFinalizar) return []
    return registros.filter((r) => r.fecha?.slice(0, 10) === fechaFinalizar && r.cuadrante === cuadranteFinalizar)
  }, [registros, permitirFinalizar, fechaFinalizar, cuadranteFinalizar])

  // Los que todavía no tienen tipo/subtipo NO se pueden finalizar (quedarían trabados):
  // se excluyen del cierre y siguen en Activo hasta que alguien los complete.
  const puntosSinClasificarEnLote = useMemo(() => puntosDelLote.filter(faltaClasificacion), [puntosDelLote])
  const puntosAFinalizar = useMemo(() => puntosDelLote.filter((r) => !faltaClasificacion(r)), [puntosDelLote])
  const sinResolverAFinalizar = useMemo(() => puntosAFinalizar.filter((r) => !estaResuelto(r)), [puntosAFinalizar])

  async function confirmarFinalizarCiclo() {
    setProcesandoFinalizar(true)
    try {
      await finalizarPuntos(puntosAFinalizar.map((r) => r.id))
      if (sinResolverAFinalizar.length > 0) {
        await exportarReclamoPanizza(sinResolverAFinalizar, { fecha: fechaFinalizar, cuadrante: cuadranteFinalizar })
      }
      setConfirmandoFinalizar(false)
      setConfirmeRevision(false)
      setFechaFinalizar('')
      setCuadranteFinalizar('')
    } finally {
      setProcesandoFinalizar(false)
    }
  }

  function exportarExcel() {
    const cols = ['FECHA', 'ORIGEN', 'DIRECCION', 'ENTRE CALLES', 'TIPO', 'SUBTIPO', 'OBS', 'RUTA', 'CUAD', ...CUADRILLAS.map((c) => c.label)]
    const filasCsv = filtrados.map((r) => [
      new Date(r.fecha).toLocaleString('es-AR'), r.origen, r.direccionManual, r.entreCalles || '',
      TIPOS[r.tipo]?.label || r.tipo, r.subtipo || '', r.obs || '', r.ruta || '', r.cuadrante || '',
      ...CUADRILLAS.map((c) => (r[c.key] ? 'SI' : 'NO')),
    ])
    const csv = [cols, ...filasCsv].map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `puntos_relevamiento_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">{titulo}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{subtitulo}</p>
        </div>
        {mostrarAlertaFaltantes && faltantes.length > 0 && (
          <button
            onClick={() => setVerFaltantes(true)}
            className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-xs font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            {faltantes.length} sin tipo/subtipo
          </button>
        )}
      </div>

      {/* Finalizar ciclo: cierra fecha+cuadrante y manda el reclamo a Panizza de lo que no se resolvió */}
      {permitirFinalizar && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200">
          <div className="px-4 md:px-5 py-3 border-b border-amber-100 flex items-center gap-2 bg-amber-50 rounded-t-xl">
            <FlagOff className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-amber-800 text-sm">Finalizar ciclo (fecha + cuadrante)</h2>
          </div>
          <div className="p-4 md:p-5 flex flex-wrap items-end gap-3">
            <Campo label="Fecha del relevamiento">
              <input type="date" value={fechaFinalizar} onChange={(e) => setFechaFinalizar(e.target.value)} className="campo" />
            </Campo>
            <Campo label="Cuadrante">
              <select value={cuadranteFinalizar} onChange={(e) => setCuadranteFinalizar(e.target.value)} className="campo">
                <option value="">Elegir cuadrante...</option>
                {CUADRANTES_DISPONIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <button
              onClick={() => { setConfirmeRevision(false); setConfirmandoFinalizar(true) }}
              disabled={!fechaFinalizar || !cuadranteFinalizar || puntosDelLote.length === 0}
              className="bg-amber-600 disabled:bg-slate-300 text-white font-semibold rounded-lg px-4 py-2.5 text-sm"
            >
              {fechaFinalizar && cuadranteFinalizar
                ? `Revisar y finalizar (${puntosDelLote.length} puntos)`
                : 'Elegí fecha y cuadrante'}
            </button>
          </div>
          <p className="px-4 md:px-5 pb-4 text-xs text-slate-500">
            Cierra los puntos de esa fecha y cuadrante (pasan a Histórico aunque no estén resueltos). Los que todavía no tengan tipo/subtipo NO se cierran — quedan en Activo hasta completarlos. Si queda alguno sin resolver, se descarga el reclamo para Panizza (Excel + fotos).
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-5 py-3 flex items-center gap-2 bg-brand-600">
          <Filter className="w-4 h-4 text-white" />
          <h2 className="font-semibold text-white text-sm">Filtros de Búsqueda</h2>
        </div>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Campo label="Fecha Desde"><input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="campo" /></Campo>
            <Campo label="Fecha Hasta"><input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="campo" /></Campo>
            <Campo label="Cuadrante">
              <select value={cuadranteFiltro} onChange={(e) => setCuadranteFiltro(e.target.value)} className="campo">
                <option value="">Todos</option>
                {CUADRANTES_DISPONIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo label="Ruta">
              <select value={rutaFiltro} onChange={(e) => setRutaFiltro(e.target.value)} className="campo">
                <option value="">Todas</option>
                {RUTAS_DISPONIBLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Campo>
            <Campo label="Tipo">
              <select value={tipoFiltro} onChange={(e) => { setTipoFiltro(e.target.value); setSubtipoFiltro('') }} className="campo">
                <option value="">Todos</option>
                {TIPO_KEYS.map((k) => <option key={k} value={k}>{TIPOS[k].label}</option>)}
              </select>
            </Campo>
            <Campo label="Subtipo">
              <select value={subtipoFiltro} onChange={(e) => setSubtipoFiltro(e.target.value)} disabled={!subtiposDisponibles} className="campo disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">{subtiposDisponibles ? 'Todos' : 'Sin subtipo'}</option>
                {subtiposDisponibles?.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Campo>
            <Campo label="Origen">
              <select value={origenFiltro} onChange={(e) => setOrigenFiltro(e.target.value)} className="campo">
                <option value="">Todos</option>
                {ORIGENES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
            <Campo label="Servicio">
              <select value={cuadrillaFiltro} onChange={(e) => setCuadrillaFiltro(e.target.value)} className="campo">
                <option value="">Todos</option>
                {CUADRILLAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Campo>
            <Campo label="Estado">
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="campo">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="RESUELTO">Resuelto</option>
              </select>
            </Campo>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button onClick={limpiarFiltros} className="btn-outline">Limpiar Filtros</button>
            <button onClick={exportarExcel} className="btn-outline sm:ml-auto flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* Una sola tabla, sin agrupar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-slate-800 text-sm">
            Resultados ({filtrados.length} de {registros.length} puntos)
          </h2>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="bg-red-50 text-red-600 rounded-full px-2.5 py-1">{conteoFiltrado.pendientes} pendientes</span>
            <span className="bg-green-50 text-green-700 rounded-full px-2.5 py-1">{conteoFiltrado.resueltos} resueltos</span>
          </div>
        </div>
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '4%' }} />
            {CUADRILLAS.map((c) => <col key={c.key} style={{ width: `${44 / CUADRILLAS.length}%` }} />)}
          </colgroup>
          <thead className="bg-brand-600">
            <tr>
              {['Fecha', 'Cuad.', 'Ruta', 'Dirección', 'Tipo', 'Subtipo', 'Foto', ...CUADRILLAS.map((c) => c.corto)].map((h) => (
                <th key={h} className="px-1.5 py-2 text-left font-semibold whitespace-nowrap text-[9.5px] overflow-hidden text-ellipsis text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itemsPagina.length === 0 && (
              <tr>
                <td colSpan={N_COLS} className="text-center text-slate-400 py-10">No se encontraron puntos con los filtros aplicados</td>
              </tr>
            )}

            {itemsPagina.map((r) => {
              const incompleto = faltaClasificacion(r)
              const habilitado = !incompleto
              return (
                <tr key={r.id} className={`align-top ${incompleto ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-1.5 py-2 whitespace-nowrap text-slate-600">{formatFechaCorta(r.fecha)}</td>

                  <td className="px-1.5 py-2 whitespace-nowrap overflow-hidden">
                    {editandoGeoId === `${r.id}-cuadrante` ? (
                      <select
                        autoFocus
                        defaultValue={r.cuadrante || ''}
                        onChange={(e) => { updateCampo(r.id, 'cuadrante', e.target.value || null); setEditandoGeoId(null) }}
                        onBlur={() => setEditandoGeoId(null)}
                        className="text-[9px] rounded border border-slate-200 px-1 py-0.5 w-full"
                      >
                        <option value="">Sin cuadrante</option>
                        {CUADRANTES_DISPONIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEditandoGeoId(`${r.id}-cuadrante`)} title={r.cuadrante || 'Sin detectar'}>
                        {r.cuadrante ? <Badge className="bg-blue-100 text-blue-700">{r.cuadrante.replace('CUADRANTE ', 'C')}</Badge> : <Badge className="bg-slate-100 text-slate-400">Corregir</Badge>}
                      </button>
                    )}
                  </td>

                  <td className="px-1.5 py-2 whitespace-nowrap overflow-hidden">
                    {editandoGeoId === `${r.id}-ruta` ? (
                      <select
                        autoFocus
                        defaultValue={r.ruta || ''}
                        onChange={(e) => { updateCampo(r.id, 'ruta', e.target.value || null); setEditandoGeoId(null) }}
                        onBlur={() => setEditandoGeoId(null)}
                        className="text-[9px] rounded border border-slate-200 px-1 py-0.5 w-full"
                      >
                        <option value="">Sin ruta</option>
                        {RUTAS_DISPONIBLES.map((r2) => <option key={r2} value={r2}>{r2}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEditandoGeoId(`${r.id}-ruta`)} title={r.ruta || 'Sin detectar'}>
                        {r.ruta ? <Badge className="bg-purple-100 text-purple-700">{r.ruta.replace('RUTA ', 'R')}</Badge> : <Badge className="bg-slate-100 text-slate-400">Corregir</Badge>}
                      </button>
                    )}
                  </td>

                  <td className="px-1.5 py-2 overflow-hidden">
                    <p className="font-medium text-slate-800 truncate" title={r.direccionManual}>{r.direccionManual}</p>
                    {r.direccionGeolocalizada && (
                      <p className="text-[9px] text-slate-400 truncate" title={r.direccionGeolocalizada}>📍 {r.direccionGeolocalizada}</p>
                    )}
                  </td>

                  {/* Tipo: SOLO tipo, nada de subtipo acá */}
                  <td className="px-1.5 py-2 overflow-hidden">
                    {editandoTipoId === r.id ? (
                      <select
                        autoFocus
                        defaultValue={r.tipo}
                        onChange={async (e) => { await updateClasificacion(r.id, { tipo: e.target.value, subtipo: null }); setEditandoTipoId(null) }}
                        onBlur={() => setEditandoTipoId(null)}
                        className="text-[9px] rounded border border-slate-200 px-1 py-0.5 w-full"
                      >
                        {TIPO_KEYS.map((k) => <option key={k} value={k}>{TIPOS[k].label}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEditandoTipoId(r.id)}>
                        <Badge className="text-white" style={{ backgroundColor: TIPOS[r.tipo]?.color }}>{TIPOS[r.tipo]?.label}</Badge>
                      </button>
                    )}
                  </td>

                  {/* Subtipo: desplegable propio, según el tipo */}
                  <td className="px-1.5 py-2 overflow-hidden">
                    {TIPOS[r.tipo]?.subtipos ? (
                      <select
                        value={r.subtipo || ''}
                        onChange={(e) => updateCampo(r.id, 'subtipo', e.target.value || null)}
                        className={`text-[9.5px] rounded px-1 py-1 w-full border ${!r.subtipo ? 'border-red-300 bg-white text-red-600 font-semibold' : 'border-slate-200 text-slate-600'}`}
                      >
                        <option value="">Elegir...</option>
                        {TIPOS[r.tipo].subtipos.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="text-slate-300">N/A</span>
                    )}
                  </td>

                  <td className="px-1.5 py-2">
                    {r.fotoBase64 ? (
                      <img src={r.fotoBase64} alt="" onClick={() => setZoomFoto(r.fotoBase64)} className="w-8 h-8 object-cover rounded-md cursor-pointer border border-slate-200" />
                    ) : <span className="text-slate-300">—</span>}
                  </td>

                  {/* Estado por servicio: desplegable nativo (Pendiente/Resuelto); se ve
                      "Finalizado" cuando el ciclo ya se cerró y ese servicio no fue el que lo resolvió. */}
                  {CUADRILLAS.map((c) => {
                    const resuelto = !!r[c.key]
                    const mostrarFinalizado = !resuelto && r.finalizado
                    const colorClase = resuelto
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : mostrarFinalizado
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    return (
                      <td key={c.key} className="px-1 py-2 overflow-hidden">
                        <select
                          disabled={!habilitado}
                          title={!habilitado ? 'Completá tipo y subtipo primero' : ''}
                          value={resuelto ? 'RESUELTO' : 'PENDIENTE'}
                          onChange={() => marcarServicio(r.id, c.key, KEYS_SERVICIOS)}
                          className={`text-[9px] font-bold rounded px-1 py-1 w-full border disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 ${colorClase}`}
                        >
                          <option value="PENDIENTE">{mostrarFinalizado ? 'FINALIZADO' : 'PENDIENTE'}</option>
                          <option value="RESUELTO">RESUELTO</option>
                        </select>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Filas por página</span>
            <select
              value={porPagina}
              onChange={(e) => setPorPagina(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
            >
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Página {paginaSegura} de {totalPaginas} · {filtrados.length} puntos
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaSegura <= 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura >= totalPaginas}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {zoomFoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-6" onClick={() => setZoomFoto(null)}>
          <img src={zoomFoto} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {verFaltantes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4" onClick={() => setVerFaltantes(false)}>
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-slate-800">{faltantes.length} puntos sin tipo o subtipo</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {faltantes.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.direccionManual}</p>
                    <p className="text-xs text-slate-400">{formatFechaCorta(r.fecha)} · {r.cuadrante || 'sin cuadrante'}</p>
                  </div>
                  <Badge className="text-white shrink-0" style={{ backgroundColor: TIPOS[r.tipo]?.color || '#94a3b8' }}>
                    {TIPOS[r.tipo]?.label || 'Sin tipo'}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100">
              <button onClick={() => setVerFaltantes(false)} className="btn-outline w-full">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {confirmandoFinalizar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4" onClick={() => !procesandoFinalizar && setConfirmandoFinalizar(false)}>
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <FlagOff className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800">Finalizar {cuadranteFinalizar} · {formatFechaCorta(fechaFinalizar)}</h3>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-slate-600 overflow-y-auto">
              <p>Se van a cerrar <strong>{puntosAFinalizar.length}</strong> puntos y pasan a Histórico.</p>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="bg-green-50 text-green-700 rounded-full px-2.5 py-1">{puntosAFinalizar.length - sinResolverAFinalizar.length} resueltos</span>
                <span className="bg-red-50 text-red-600 rounded-full px-2.5 py-1">{sinResolverAFinalizar.length} sin resolver</span>
              </div>

              {puntosSinClasificarEnLote.length > 0 && (
                <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
                  <p className="font-semibold">⚠ {puntosSinClasificarEnLote.length} puntos NO se van a cerrar todavía — les falta tipo o subtipo.</p>
                  <p>Quedan en Activo hasta que alguien los complete:</p>
                  <ul className="space-y-0.5">
                    {puntosSinClasificarEnLote.map((r) => (
                      <li key={r.id} className="truncate">• {r.direccionManual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sinResolverAFinalizar.length > 0 && (
                <>
                  <p className="text-amber-700 bg-amber-50 rounded-lg p-3 text-xs">
                    Ojo: revisá esta lista antes de confirmar. Puede que a alguno de estos se les haya olvidado cargar el resuelto/pendiente. Los que queden así se van a incluir en el reclamo a Panizza.
                  </p>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {sinResolverAFinalizar.map((r) => (
                      <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{r.direccionManual}</p>
                          <p className="text-[10px] text-slate-400">{formatFechaCorta(r.fecha)}</p>
                        </div>
                        <Badge className="text-white shrink-0" style={{ backgroundColor: TIPOS[r.tipo]?.color || '#94a3b8' }}>
                          {TIPOS[r.tipo]?.label || 'Sin tipo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-start gap-2 text-xs font-medium text-slate-700 pt-1">
                    <input
                      type="checkbox"
                      checked={confirmeRevision}
                      onChange={(e) => setConfirmeRevision(e.target.checked)}
                      className="mt-0.5 accent-amber-600"
                    />
                    Revisé esta lista y confirmo que estos puntos quedan sin resolver.
                  </label>
                </>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2 shrink-0">
              <button onClick={() => setConfirmandoFinalizar(false)} disabled={procesandoFinalizar} className="btn-outline flex-1">Cancelar</button>
              <button
                onClick={confirmarFinalizarCiclo}
                disabled={procesandoFinalizar || puntosAFinalizar.length === 0 || (sinResolverAFinalizar.length > 0 && !confirmeRevision)}
                className="flex-1 bg-amber-600 disabled:bg-slate-300 text-white font-semibold rounded-lg text-sm"
              >
                {procesandoFinalizar ? 'Procesando...' : puntosAFinalizar.length === 0 ? 'Nada para cerrar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .campo { width: 100%; font-size: 0.8rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; padding: 0.45rem 0.6rem; background: white; }
        .campo:focus { outline: none; box-shadow: 0 0 0 2px #16a34a; border-color: #16a34a; }
        .btn-outline { font-size: 0.8rem; font-weight: 600; border: 1px solid #e2e8f0; color: #475569; border-radius: 0.5rem; padding: 0.5rem 0.9rem; background: white; }
        .btn-outline:hover { background: #f8fafc; }
      `}</style>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}
