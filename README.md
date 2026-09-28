# Levantamiento - Municipio de Hurlingham

App mobile-first en React + Vite + Tailwind para relevamiento de puntos de basura/restos verdes/escombros/microbasural, con foto + dirección manual + geolocalización GPS, y un panel de administración con mapa (límite real de Hurlingham vía API GeoRef de datos.gob.ar) y tabla.

## Instalación

```bash
npm i
npm run dev
```

Abre `http://localhost:5173`. Para probar la cámara/GPS en el celular real, conectate a la misma red y entrá a `http://<IP-de-tu-PC>:5173` (Vite ya está configurado con `host: true`), o desplegalo en Vercel.

## Build de producción

```bash
npm run build
npm run preview
```

## Estructura

- `/relevamiento` — formulario para el personal en campo (foto con cámara, tipo, dirección con autocompletado por GPS, geolocalización).
- `/sistematizacion` — panel del equipo de sistematización/moderación: listado de puntos que va nutriendo el relevamiento, con las columnas FECHA, ORIGEN, DIRECCION, ENTRE CALLES, TIPO, OBS, FOTO, FOTO CITYMIS, RUTA, CUAD, CUADRILLA MUNICIPAL, COOPERATIVA, CH 1, HU, HU 2 y CH 6 — más una vista de mapa con cuadrantes y rutas.

## Flujo de datos

1. El relevador carga el punto desde `/relevamiento`: fecha, origen (fijo en "RELEVAMIENTO"), dirección, tipo y foto quedan completos automáticamente. RUTA y CUAD se calculan solos comparando el GPS del punto contra los polígonos de `CUADRANTES_2026.kml` (ya convertidos a `src/data/rutas.json` y `src/data/cuadrantes.json`).
2. El punto aparece de inmediato en `/sistematizacion`, con ENTRE CALLES, OBS, FOTO CITYMIS, y las cuadrillas/entidades (CUADRILLA MUNICIPAL, COOPERATIVA, CH 1, HU, HU 2, CH 6) vacíos — el equipo de sistematización los completa ahí mismo, editando directo sobre la tabla.
3. El tipo/subtipo también se puede corregir desde sistematización si el relevador cargó algo que no corresponde.

## Dónde vive la información

Por ahora los registros se guardan en **IndexedDB del propio dispositivo** (`src/services/db.js`), para que el formulario funcione incluso con mala señal en la calle. Esto significa que hoy el celular del relevador y la PC del administrador **no comparten datos automáticamente** entre sí (cada dispositivo tiene su propia base local).

Para que el "levantamiento en campo" y el "panel de administración" vean los mismos datos en tiempo real, falta conectar un backend central. Dos caminos típicos con tu stack:

1. **Google Apps Script + Sheets** (como tus otros sistemas): armar un Web App de Apps Script que reciba `POST` con el JSON del registro (incluida la foto en base64, o subirla a Drive y guardar solo el link) y lo escriba en una hoja. El panel admin haría `GET` a ese mismo Web App para traer todos los registros.
2. **Firebase** (Firestore + Storage): Firestore para los registros, Storage para las fotos. Más cómodo para tiempo real (`onSnapshot`), pero es otro ecosistema fuera de Sheets.

El archivo `src/services/db.js` ya tiene un stub `syncToBackend()` marcado con un ejemplo comentado de cómo sería el `fetch` a un Web App de Apps Script — ahí se engancha cuando definas el endpoint.

## Límite geográfico de Hurlingham

Se usa la API pública de GeoRef (`apis.datos.gob.ar/georef/api/municipios`) para traer el polígono real del partido y dibujarlo en el mapa (`src/utils/georef.js`). Si la API no responde, el mapa igual funciona, solo que sin el contorno dibujado.

## Personalización rápida

- Tipos y subtipos: `src/utils/constants.js`
- Colores de marca: `tailwind.config.js`
