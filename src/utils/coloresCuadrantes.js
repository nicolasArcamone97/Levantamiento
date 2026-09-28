// Paleta de colores bien diferenciados para pintar cada cuadrante de forma distinta en el mapa.
const PALETA = [
  '#2563eb', // azul
  '#dc2626', // rojo
  '#16a34a', // verde
  '#d97706', // ámbar
  '#7c3aed', // violeta
  '#0891b2', // cian
  '#db2777', // rosa
  '#65a30d', // lima
  '#ea580c', // naranja
  '#0d9488', // teal
  '#9333ea', // púrpura
]

/** Devuelve un color estable para un cuadrante según su número (o su nombre si no tiene). */
export function colorDeCuadrante(numero, nombreFallback = '') {
  if (numero != null) return PALETA[(numero - 1) % PALETA.length]
  // fallback: hash simple del nombre para que sea estable
  let hash = 0
  for (let i = 0; i < nombreFallback.length; i++) hash = (hash * 31 + nombreFallback.charCodeAt(i)) | 0
  return PALETA[Math.abs(hash) % PALETA.length]
}
