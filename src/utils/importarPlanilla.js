import { TIPOS, TIPO_KEYS } from './constants'
import { normalizar } from './camposSistema'

/** Interpreta valores tipo "SI"/"NO"/"TRUE"/"1"/"X" como booleano. */
export function aBooleano(valor) {
  const norm = normalizar(valor)
  return ['si', 'sí', 'true', '1', 'x', 'resuelto'].includes(norm)
}

/** Intenta reconocer el tipo por su texto (label), sin importar mayúsculas/acentos. */
export function matchTipo(texto) {
  const norm = normalizar(texto)
  const key = TIPO_KEYS.find((k) => normalizar(TIPOS[k].label) === norm || normalizar(k) === norm)
  return key || null
}

/** Intenta parsear una fecha en varios formatos comunes de planilla (dd/mm/yyyy, ISO, serial de Excel). */
export function parsearFecha(valor) {
  if (valor == null || valor === '') return new Date().toISOString()
  if (typeof valor === 'number') {
    // Serial de fecha de Excel (días desde 1899-12-30)
    const ms = Math.round((valor - 25569) * 86400 * 1000)
    return new Date(ms).toISOString()
  }
  const texto = String(valor).trim()
  const ddmmyyyy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy
    const anio = y.length === 2 ? `20${y}` : y
    const fecha = new Date(`${anio}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00`)
    if (!isNaN(fecha)) return fecha.toISOString()
  }
  const fecha = new Date(texto)
  return isNaN(fecha) ? new Date().toISOString() : fecha.toISOString()
}

/**
 * Construye el objeto de registro final a partir de una fila de la planilla
 * y el mapeo columna→campo elegido por el usuario.
 */
export function construirRegistro(fila, encabezados, mapeo) {
  const valores = {}
  encabezados.forEach((enc, i) => {
    const campo = mapeo[enc]
    if (campo) valores[campo] = fila[i]
  })

  const tipoKey = valores.tipoTexto ? matchTipo(valores.tipoTexto) : null

  const registro = {
    fecha: parsearFecha(valores.fecha),
    origen: valores.origen ? String(valores.origen).toUpperCase() : 'IMPORTADO',
    direccionManual: valores.direccionManual ? String(valores.direccionManual) : '(sin dirección)',
    entreCalles: valores.entreCalles ? String(valores.entreCalles) : '',
    tipo: tipoKey,
    subtipo: valores.subtipo ? String(valores.subtipo).toUpperCase() : null,
    obs: valores.obs ? String(valores.obs) : '',
    ruta: valores.ruta ? String(valores.ruta) : null,
    cuadrante: valores.cuadrante ? String(valores.cuadrante) : null,
  }
  ;['cuadrillaMunicipal', 'cooperativa', 'levantamientoMecanico', 'ch1', 'hu', 'hu2', 'ch6'].forEach((k) => {
    if (valores[k] !== undefined) registro[k] = aBooleano(valores[k])
  })

  return registro
}
