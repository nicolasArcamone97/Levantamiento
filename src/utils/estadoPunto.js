import { TIPOS, CUADRILLAS } from './constants'

/** Un punto está resuelto si algún servicio quedó marcado como responsable. */
export function estaResuelto(r) {
  return CUADRILLAS.some((c) => !!r[c.key])
}

/** Clasificación completa = tiene tipo, y si ese tipo pide subtipo, también lo tiene. */
export function tieneClasificacionCompleta(r) {
  if (!r.tipo) return false
  const requiereSubtipo = !!TIPOS[r.tipo]?.subtipos
  return !requiereSubtipo || !!r.subtipo
}

/**
 * Activo = todavía tiene algo pendiente de completar: no está resuelto por
 * ningún servicio, o le falta tipo/subtipo. Es lo que el equipo tiene que
 * seguir trabajando. Un punto finalizado a mano (cierre de ciclo) deja de
 * ser activo aunque nadie lo haya resuelto.
 */
export function esActivo(r) {
  if (r.finalizado) return false
  return !estaResuelto(r) || !tieneClasificacionCompleta(r)
}

/**
 * Histórico = ya está resuelto por un servicio Y con la clasificación
 * completa, o fue cerrado manualmente ("finalizar puntos") aunque haya
 * quedado sin resolver.
 */
export function esHistorico(r) {
  return !esActivo(r)
}

/** Se cerró el ciclo (fecha+cuadrante finalizado) pero nadie lo resolvió: es el caso a reclamarle a Panizza. */
export function finalizadoSinResolver(r) {
  return !!r.finalizado && !estaResuelto(r)
}
