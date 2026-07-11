# TabulaNote

Tablero de post-its infinito construido con React, TypeScript y Vite. Se van agregando funcionalidades paso a paso.

🔗 Deploy: [shywi.github.io/tabulanote](https://shywi.github.io/tabulanote/)

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (`@tailwindcss/vite`) para todo el diseño estático; las posiciones/tamaños dinámicos (notas, canvas, scrollbars) siguen como estilos inline calculados en JS
- Sin librerías externas de drag/zoom/pan: todo implementado a mano con Pointer Events y `transform: translate()/scale()`
- Persistencia en `localStorage` (sin backend)
- Responsivo: pensado para funcionar tanto con mouse (desktop) como con dedo (mobile/touch)

## Funcionalidades actuales

- **Barra de herramientas**: arriba de todo. Por ahora tiene el ícono de "crear nota" — se arrastra desde ahí hacia el canvas para soltar una nota nueva justo donde la sueltes. Pensada para ir agregando más herramientas ahí con el tiempo.
- **Post-its**: escribir texto dentro, arrastrar (agarradera superior) y redimensionar (esquina inferior derecha, ícono estilo `<textarea>`), eliminar.
- **Zoom**: botones +/-, `Ctrl`/`Cmd` + rueda del mouse, atajos `Ctrl +`/`Ctrl -`/`Ctrl 0`. Bloquea el zoom nativo del navegador (pinch-zoom y `Ctrl`+rueda) para no interferir.
- **Pan**: arrastrar con el botón central del mouse, o con un dedo sobre el canvas vacío (no hay botón central en celular).
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
    Toolbar.tsx             # Barra superior con las herramientas (crear nota, arrastrable)
    Board.tsx                # Componente principal: estado de notas/pan/zoom/bounds
    PostIt.tsx                 # Nota individual: arrastre, resize, edición de texto
    Scrollbar.tsx               # Barra de scroll reutilizable (horizontal/vertical)
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

## Deploy

```bash
npm run deploy   # build + publica dist/ en la rama gh-pages con gh-pages
```

El `base` en `vite.config.ts` está seteado a `/tabulanote/`, coincidiendo con el nombre del repo en GitHub Pages.
