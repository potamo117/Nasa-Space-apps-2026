# Créditos de recursos

Todo lo que hay en esta carpeta es de uso libre y gratuito (también comercial) y se sirve desde el propio proyecto: el juego no descarga íconos ni tipografías de Google ni de ningún otro servidor externo.

| Recurso | Carpeta | Autor | Licencia |
|---|---|---|---|
| Íconos (Fluent Emoji, estilo *flat*) | `iconos/` | Microsoft Corporation — https://github.com/microsoft/fluentui-emoji (empaquetado npm `fluentui-emoji`) | MIT |
| Tipografía Fredoka | `fuentes/` | The Fredoka Project Authors (vía Fontsource) | SIL Open Font License 1.1 |
| Tipografía Orbitron | `fuentes/` | The Orbitron Project Authors (vía Fontsource) | SIL Open Font License 1.1 |
| Tipografía Chakra Petch | `fuentes/` | Cadson Demak (vía Fontsource) | SIL Open Font License 1.1 |

Los textos completos de las licencias están en `licencias/`. Las licencias MIT y OFL permiten usar, copiar y redistribuir los archivos gratis; la única condición es conservar estos avisos de licencia junto con los archivos.

## Cómo agregar un ícono nuevo

1. Copia el `.svg` a `recursos/iconos/` (de una fuente con licencia libre).
2. Añade una línea en `js/ui/iconos.js` (`ICONOS`) que relacione el símbolo con el nombre del archivo.
