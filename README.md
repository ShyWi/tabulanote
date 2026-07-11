# TabulaNote

Tablero de post-its infinito construido con React, TypeScript y Vite. Se van agregando funcionalidades paso a paso.

## Stack

- **React 19** + **TypeScript** + **Vite**
- Sin librerías externas de drag/zoom/pan: todo implementado a mano con Pointer Events y `transform: translate()/scale()`
- Persistencia en `localStorage` (sin backend)

## Funcionalidades actuales

- **Post-its**: crear, escribir texto dentro, arrastrar (agarradera superior) y redimensionar (esquina inferior derecha, ícono estilo `<textarea>`), eliminar.
- **Zoom**: botones +/-, `Ctrl`/`Cmd` + rueda del mouse, atajos `Ctrl +`/`Ctrl -`/`Ctrl 0`. Bloquea el zoom nativo del navegador (pinch-zoom y `Ctrl`+rueda) para no interferir.
- **Pan**: arrastrar con el botón central del mouse para moverte por el canvas.
- **Límites del canvas**: el área navegable se ajusta (crece o se encoge) según dónde estén las notas, con un margen mínimo alrededor de cada una y un tamaño base por defecto. El ajuste ocurre solo al soltar una nota (no en cada frame mientras se arrastra).
- **Scrollbars propias**: barra horizontal y vertical que indican cuánta área del canvas está visible y permiten navegar haciendo click o arrastrando el thumb.
- **Persistencia**: notas, posición y zoom se guardan en `localStorage` y se restauran al recargar.

## Estructura

```
src/
  types.ts              # Tipo Note (posición, tamaño, texto, color)
  storage.ts             # Carga/guardado de notas y viewport en localStorage
  bounds.ts               # Cálculo de límites del canvas, clamp de pan, y métricas de scrollbar
  components/
    Board.tsx              # Componente principal: estado de notas/pan/zoom/bounds
    PostIt.tsx               # Nota individual: arrastre, resize, edición de texto
    Scrollbar.tsx             # Barra de scroll reutilizable (horizontal/vertical)
```

## Próximos pasos (pendiente)

- Carpetas virtuales para organizar notas
- Dibujar dentro de una nota
- Insertar imágenes

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # tsc -b && vite build
npm run preview
```
