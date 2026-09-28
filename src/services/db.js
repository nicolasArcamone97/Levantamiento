import { openDB } from 'idb'

const DB_NAME = 'levantamiento-hurlingham'
const DB_VERSION = 1
const STORE = 'registros'

const listeners = new Set()

function notify() {
  listeners.forEach((cb) => cb())
}

/** Suscribirse a cambios en la base (para refrescar mapa/tabla en vivo). */
export function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('tipo', 'tipo')
        store.createIndex('fecha', 'fecha')
      }
    },
  })
}

/**
 * Punto del sistema de sistematización. Columnas del listado:
 * FECHA · ORIGEN · DIRECCION · ENTRE CALLES · TIPO · OBS · FOTO ·
 * RUTA · CUAD · CUADRILLA MUNICIPAL · COOPERATIVA · CH 1 · HU · HU 2 · CH 6
 *
 * {
 *   id, fecha (ISO), origen ('RELEVAMIENTO' | otros a futuro),
 *   tipo, subtipo,
 *   direccionManual, direccionGeolocalizada, entreCalles, obs,
 *   lat, lng, accuracy,
 *   fotoBase64,
 *   ruta, cuadrante,           // detectados automáticamente contra el KML, según lat/lng
 *   cuadrillaMunicipal, cooperativa, ch1, hu, hu2, ch6,  // booleanos, los carga sistematización
 *   relevador, syncEstado
 * }
 */
export async function addRegistro(registro) {
  const db = await getDb()
  const record = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    origen: 'RELEVAMIENTO',
    entreCalles: '',
    obs: '',
    ruta: null,
    cuadrante: null,
    cuadrillaMunicipal: false,
    cooperativa: false,
    levantamientoMecanico: false,
    ch1: false,
    hu: false,
    hu2: false,
    ch6: false,
    finalizado: false, // true = el ciclo (fecha+cuadrante) se cerró; pasa a Histórico esté resuelto o no
    syncEstado: 'LOCAL', // LOCAL | SINCRONIZADO | ERROR -> se actualiza al conectar un backend real
    ...registro,
  }
  await db.add(STORE, record)
  notify()
  return record
}

export async function getRegistros() {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

/**
 * El administrador corrige la clasificación cargada (por si el relevador
 * marcó un tipo/subtipo que no corresponde).
 */
export async function updateClasificacion(id, { tipo, subtipo }) {
  const db = await getDb()
  const record = await db.get(STORE, id)
  if (!record) return
  record.tipo = tipo
  record.subtipo = subtipo || null
  await db.put(STORE, record)
  notify()
}

/**
 * Actualiza un único campo del punto (usado desde la tabla de sistematización:
 * ENTRE CALLES, OBS, FOTO CITYMIS, y los toggles de cuadrilla/cooperativa).
 */
export async function updateCampo(id, campo, valor) {
  const db = await getDb()
  const record = await db.get(STORE, id)
  if (!record) return
  record[campo] = valor
  await db.put(STORE, record)
  notify()
}

/**
 * Marca qué servicio resolvió el punto. Solo uno puede quedar activo a la vez
 * (al activar uno se apagan los demás).
 */
export async function marcarServicio(id, campoServicio, keysServicios) {
  const db = await getDb()
  const record = await db.get(STORE, id)
  if (!record) return
  const activar = !record[campoServicio]
  keysServicios.forEach((k) => { record[k] = k === campoServicio ? activar : false })
  await db.put(STORE, record)
  notify()
}

export async function deleteRegistro(id) {
  const db = await getDb()
  await db.delete(STORE, id)
  notify()
}

/**
 * Cierra el ciclo de un lote de puntos (por fecha + cuadrante): quedan
 * marcados como `finalizado` y pasan a Histórico sin importar si alguien
 * los resolvió o no. Los que sigan sin resolver quedan igual identificables
 * ahí (finalizado=true, ningún servicio en true) para el reclamo a Panizza.
 */
export async function finalizarPuntos(ids) {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  await Promise.all(
    ids.map(async (id) => {
      const record = await tx.store.get(id)
      if (!record) return
      record.finalizado = true
      await tx.store.put(record)
    })
  )
  await tx.done
  notify()
}

/**
 * Importación masiva desde una planilla (CSV/XLSX) ya mapeada a los campos
 * del sistema. Cada item de `registrosNuevos` es un objeto parcial (lo que
 * el usuario decidió mapear); se completa con los mismos valores por defecto
 * que un punto de relevamiento y se guarda en una sola transacción.
 */
export async function importarRegistros(registrosNuevos) {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  await Promise.all(
    registrosNuevos.map((r) =>
      tx.store.add({
        id: crypto.randomUUID(),
        fecha: new Date().toISOString(),
        origen: 'IMPORTADO',
        entreCalles: '',
        obs: '',
        ruta: null,
        cuadrante: null,
        cuadrillaMunicipal: false,
        cooperativa: false,
        levantamientoMecanico: false,
        ch1: false,
        hu: false,
        hu2: false,
        ch6: false,
        syncEstado: 'LOCAL',
        ...r,
      })
    )
  )
  await tx.done
  notify()
}

/**
 * Punto de integración con un backend real (Google Apps Script Web App o Firebase).
 * Por ahora todo queda en IndexedDB del dispositivo. Cuando el municipio tenga
 * el endpoint definitivo, reemplazar este stub por el fetch/POST correspondiente
 * y actualizar syncEstado a 'SINCRONIZADO'.
 */
export async function syncToBackend(_record) {
  // Ejemplo de integración futura con Apps Script:
  // await fetch('https://script.google.com/macros/s/XXXX/exec', {
  //   method: 'POST',
  //   body: JSON.stringify(_record),
  // })
  return { ok: false, reason: 'Backend no configurado todavía' }
}
