import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { TIPOS } from './constants'

function base64AExtension(base64) {
  if (base64?.startsWith('data:image/png')) return 'png'
  return 'jpg'
}

function base64AArrayBuffer(base64) {
  const limpio = base64.split(',')[1] || base64
  const binario = atob(limpio)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

/**
 * Arma y descarga un .zip con:
 *  - listado.xlsx: los puntos que quedaron sin resolver al finalizar el ciclo
 *  - fotos/<id>.jpg: la foto de cada uno de esos puntos
 * Pensado para mandarle a Panizza el reclamo de lo que no llegaron a resolver.
 */
export async function exportarReclamoPanizza(puntosSinResolver, { fecha, cuadrante }) {
  const filas = puntosSinResolver.map((r) => ({
    ID: r.id,
    FECHA: new Date(r.fecha).toLocaleDateString('es-AR'),
    CUADRANTE: r.cuadrante || '',
    RUTA: r.ruta || '',
    DIRECCION: r.direccionManual,
    'ENTRE CALLES': r.entreCalles || '',
    TIPO: TIPOS[r.tipo]?.label || r.tipo || '',
    SUBTIPO: r.subtipo || '',
    OBS: r.obs || '',
    FOTO: r.fotoBase64 ? `fotos/${r.id}.jpg` : 'sin foto',
  }))

  const hoja = XLSX.utils.json_to_sheet(filas)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Reclamo Panizza')
  const xlsxArrayBuffer = XLSX.write(libro, { type: 'array', bookType: 'xlsx' })

  const zip = new JSZip()
  zip.file('listado.xlsx', xlsxArrayBuffer)
  const carpetaFotos = zip.folder('fotos')
  puntosSinResolver.forEach((r) => {
    if (r.fotoBase64) {
      carpetaFotos.file(`${r.id}.${base64AExtension(r.fotoBase64)}`, base64AArrayBuffer(r.fotoBase64))
    }
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const fechaTexto = fecha ? fecha.replaceAll('-', '') : 'todas'
  const cuadranteTexto = (cuadrante || 'todos').replace(/\s+/g, '_')
  a.href = url
  a.download = `reclamo_panizza_${cuadranteTexto}_${fechaTexto}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
