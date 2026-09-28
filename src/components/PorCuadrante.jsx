import { useMemo, useState } from 'react'
import { TIPOS, TIPO_KEYS, CUADRILLAS } from '../utils/constants'
import { estaResuelto } from '../utils/estadoPunto'
import { colorDeCuadrante } from '../utils/coloresCuadrantes'
import { MapPin, AlertTriangle } from 'lucide-react'

export default function PorCuadrante({ registros }) {
  const [cuadranteAbierto, setCuadranteAbierto] = useState(null)

  // Los cuadrantes van apareciendo solos a medida que entra relevamiento con ese cuadrante detectado
  const datosPorCuadrante = useMemo(() => {
    const mapa = new Map()
    registros.forEach((r) => {
      const nombre = r.cuadrante || 'Sin cuadrante detectado'
      if (!mapa.has(nombre)) mapa.set(nombre, [])
      mapa.get(nombre).push(r)
    })

    return Array.from(mapa.entries())
      .map(([nombre, puntos]) => {
        const resueltos = puntos.filter(estaResuelto)
        const pendientes = puntos.length - resueltos.length
        const porcentajeResuelto = puntos.length ? (resueltos.length / puntos.length) * 100 : 0

        const porCuadrilla = CUADRILLAS.map((c) => ({
          ...c,
          cantidad: puntos.filter((p) => p[c.key]).length,
        })).filter((c) => c.cantidad > 0)

        const porTipo = TIPO_KEYS.map((k) => {
          const deEsteTipo = puntos.filter((p) => p.tipo === k)
          const subtipos = {}
          deEsteTipo.forEach((p) => {
            const s = p.subtipo || 'Sin subtipo'
            subtipos[s] = (subtipos[s] || 0) + 1
          })
          return {
            key: k,
            label: TIPOS[k].label,
            color: TIPOS[k].color,
            total: deEsteTipo.length,
            resueltos: deEsteTipo.filter(estaResuelto).length,
            subtipos,
          }
        }).filter((t) => t.total > 0)

        return { nombre, total: puntos.length, resueltos: resueltos.length, pendientes, porcentajeResuelto, porCuadrilla, porTipo }
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }))
  }, [registros])

  // Tabla general: una fila por combinación cuadrante + tipo + subtipo
  const filasTabla = useMemo(() => {
    const mapa = new Map()
    registros.forEach((r) => {
      const cuadrante = r.cuadrante || 'Sin cuadrante detectado'
      const tipo = r.tipo || 'SIN_TIPO'
      const subtipo = r.subtipo || (TIPOS[tipo]?.subtipos ? 'Sin subtipo' : 'N/A')
      const key = `${cuadrante}|${tipo}|${subtipo}`
      if (!mapa.has(key)) mapa.set(key, { cuadrante, tipo, subtipo, relevados: 0, resueltos: 0, fechas: [] })
      const g = mapa.get(key)
      g.relevados++
      g.fechas.push(r.fecha)
      if (estaResuelto(r)) g.resueltos++
    })
    return Array.from(mapa.values())
      .map((g) => ({
        ...g,
        pendientes: g.relevados - g.resueltos,
        ultimaFecha: g.fechas.sort().slice(-1)[0],
      }))
      .sort((a, b) => a.cuadrante.localeCompare(b.cuadrante, undefined, { numeric: true }))
  }, [registros])

  const totalGeneral = registros.length
  const cuadranteMasCritico = [...datosPorCuadrante].sort((a, b) => b.pendientes - a.pendientes)[0]
  const cuadranteMejor = [...datosPorCuadrante].filter((c) => c.total > 0).sort((a, b) => b.porcentajeResuelto - a.porcentajeResuelto)[0]

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Incidencias por Cuadrante</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Se muestran solo los cuadrantes donde ya se cargó relevamiento — aparecen solos a medida que se releva.
        </p>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TarjetaKpi label="Cuadrantes con relevamiento" valor={datosPorCuadrante.length} color="border-blue-500" />
        <TarjetaKpi label="Total puntos" valor={totalGeneral} color="border-slate-400" />
        <TarjetaKpi label="Cuadrante más crítico" valor={cuadranteMasCritico?.nombre || '—'} sub={cuadranteMasCritico ? `${cuadranteMasCritico.pendientes} pendientes` : ''} color="border-red-500" />
        <TarjetaKpi label="Mejor cumplimiento" valor={cuadranteMejor?.nombre || '—'} sub={cuadranteMejor ? `${cuadranteMejor.porcentajeResuelto.toFixed(0)}% resuelto` : ''} color="border-green-500" />
      </div>

      {/* Cards por cuadrante */}
      {datosPorCuadrante.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
          Todavía no hay relevamiento cargado en ningún cuadrante
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {datosPorCuadrante.map((c) => {
            const color = colorDeCuadrante(null, c.nombre)
            const abierto = cuadranteAbierto === c.nombre
            return (
              <div key={c.nombre} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderLeft: `5px solid ${color}` }}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color }} />
                    <span className="font-bold text-slate-800">{c.nombre}</span>
                  </div>
                  {c.pendientes > 0 && c.porcentajeResuelto < 50 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </div>

                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Total relevado</p>
                      <p className="text-xl font-bold text-slate-800">{c.total}</p>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[11px] text-slate-500">Resueltos</p>
                        <p className="text-lg font-bold text-green-600">{c.resueltos}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Pendientes</p>
                        <p className="text-lg font-bold text-red-500">{c.pendientes}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Resuelto</span>
                      <span className="font-semibold">{c.porcentajeResuelto.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${c.porcentajeResuelto}%` }} />
                    </div>
                  </div>

                  {/* Tipos y subtipos */}
                  <div className="flex flex-wrap gap-1.5">
                    {c.porTipo.map((t) => (
                      <span key={t.key} title={Object.entries(t.subtipos).map(([s, n]) => `${s}: ${n}`).join(' · ')}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: t.color }}>
                        {t.label} {t.total}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setCuadranteAbierto(abierto ? null : c.nombre)}
                    className="w-full text-xs font-semibold text-brand-700 bg-brand-50 rounded-lg py-2 hover:bg-brand-100"
                  >
                    {abierto ? 'Ocultar detalle' : 'Ver detalle por cuadrilla'}
                  </button>

                  {abierto && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      {c.porCuadrilla.length === 0 && <p className="text-[11px] text-slate-400 pt-2">Todavía nadie resolvió puntos acá</p>}
                      {c.porCuadrilla.map((cu) => (
                        <div key={cu.key} className="flex items-center justify-between text-xs pt-1.5">
                          <span className="text-slate-600">{cu.label}</span>
                          <span className="font-bold text-slate-800">{cu.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla general por cuadrante + tipo + subtipo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm">Tabla general por tipo y subtipo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <tr>
                {['Última fecha', 'Cuadrante', 'Tipo', 'Subtipo', 'Relevados', 'Pendientes', 'Resueltos'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filasTabla.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-400 py-8">Sin datos todavía</td></tr>
              )}
              {filasTabla.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                    {new Date(f.ultimaFecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{f.cuadrante}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {TIPOS[f.tipo] ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: TIPOS[f.tipo].color }}>
                        {TIPOS[f.tipo].label}
                      </span>
                    ) : <span className="text-slate-400">Sin tipo</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{f.subtipo}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{f.relevados}</td>
                  <td className="px-3 py-2 font-semibold text-red-500">{f.pendientes}</td>
                  <td className="px-3 py-2 font-semibold text-green-600">{f.resueltos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TarjetaKpi({ label, valor, sub, color }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} border-t border-r border-b border-slate-200 p-3`}>
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5 truncate">{valor}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  )
}
