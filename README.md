# TabulaNote

Tablero de post-its infinito construido con React, TypeScript y Vite. Se van agregando funcionalidades paso a paso.

🔗 Deploy: [shywi.github.io/tabulanote](https://shywi.github.io/tabulanote/)

## Stack

- **React 19** + **TypeScript** + **Vite**
- **react-router-dom** para las carpetas virtuales (cada una es su propia ruta/canvas)
- **Tailwind CSS v4** (`@tailwindcss/vite`) para todo el diseño estático; las posiciones/tamaños dinámicos (notas, canvas, scrollbars) siguen como estilos inline calculados en JS
- Sin librerías externas de drag/zoom/pan: todo implementado a mano con Pointer Events y `transform: translate()/scale()`
- Persistencia en `localStorage` (sin backend)
- Responsivo: pensado para funcionar tanto con mouse (desktop) como con dedo (mobile/touch)

## Funcionalidades actuales

- **Barra de herramientas**: arriba de todo. Tiene los íconos de "crear nota" y "crear carpeta" — se arrastran desde ahí hacia el canvas para soltar el ítem justo donde lo sueltes. Pensada para ir agregando más herramientas ahí con el tiempo.
- **Post-its**: escribir texto dentro, arrastrar **desde cualquier parte de la nota** (incluso sobre el texto — un tap corto edita, un arrastre la mueve) y redimensionar (esquina inferior derecha, ícono estilo `<textarea>`), eliminar.
- **Carpetas virtuales**: un click (sin arrastrar) sobre una carpeta navega a su propio canvas independiente, en `/tabulanote/NombreDeLaCarpeta`. Cada carpeta tiene sus propias notas, sub-carpetas, pan, zoom y límites — todo separado en `localStorage` por nombre. Un botón "← NombreDeLaCarpeta" en la barra vuelve al canvas original.
- **Zoom**: botones +/-, `Ctrl`/`Cmd` + rueda del mouse, atajos `Ctrl +`/`Ctrl -`/`Ctrl 0`. Bloquea el zoom nativo del navegador (pinch-zoom y `Ctrl`+rueda) para no interferir.
- **Pan**: arrastrar con el botón central del mouse, o con un dedo sobre el canvas vacío (no hay botón central en celular).
- **Límites del canvas**: el área navegable se ajusta (crece o se encoge) según dónde estén las notas/carpetas, con un margen mínimo alrededor de cada una y un tamaño base por defecto. El ajuste ocurre solo al soltar un ítem (no en cada frame mientras se arrastra).
- **Scrollbars propias**: barra horizontal y vertical que indican cuánta área del canvas está visible y permiten navegar haciendo click o arrastrando el thumb.
- **Persistencia**: notas, carpetas, posición y zoom se guardan en `localStorage` (con clave por carpeta) y se restauran al recargar.

## Estructura

```
src/
  types.ts              # Tipos Note, Folder y PositionedItem
  storage.ts             # Carga/guardado de notas/carpetas/viewport en localStorage, con scope por carpeta
  bounds.ts               # Cálculo de límites del canvas, clamp de pan, y métricas de scrollbar
  App.tsx                  # Rutas: "/" (canvas raíz) y "/:folderName" (canvas de cada carpeta)
  components/
    Toolbar.tsx             # Barra superior: herramientas arrastrables + botón "volver"
    Board.tsx                # Componente principal: estado de notas/carpetas/pan/zoom/bounds para el scope actual
    PostIt.tsx                 # Nota individual: arrastre (toda la nota), resize, edición de texto
    Folder.tsx                  # Carpeta individual: arrastre, click para navegar a su canvas
    Scrollbar.tsx                 # Barra de scroll reutilizable (horizontal/vertical)
```

## Próximos pasos (pendiente)

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

Como las carpetas usan rutas reales (`/tabulanote/NombreCarpeta`) y GitHub Pages es hosting estático, un link directo o un refresh dentro de una carpeta daría 404. `public/404.html` + un pequeño script en `index.html` resuelven esto con el truco estándar de [spa-github-pages](https://github.com/rafgraph/spa-github-pages).
