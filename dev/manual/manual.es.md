# Manual del Loudness Target Calculator

El Loudness Target Calculator te dice la **ganancia en dB** necesaria para llevar un archivo a un objetivo de loudness, con una **comprobación del true peak**. Es una aplicación web (PWA) gratuita de OnAir Garage que funciona sin conexión después de la primera visita y mide los archivos en tu navegador: no se sube nada.

## Abrir e instalar

Abre la calculadora en `https://onairgarage.com/apps/loudness-calculator/` (la página de la herramienta es `https://onairgarage.com/tools/loudness-calculator/`). Para usarla no se instala nada. También puedes instalarla como app:

- **Chrome, Edge y otros navegadores Chromium**: pulsa el botón *Instalar app* de arriba.
- **iPhone y iPad (Safari)**: toca el botón Compartir y luego «Añadir a pantalla de inicio».
- **Safari en Mac**: menú Archivo y luego «Añadir al Dock».

Una vez instalada funciona sin conexión. La app se abre siempre en inglés; cambia el idioma en la cabecera (English, Italiano, Español) y la elección se recuerda en el dispositivo. El tema puede ser claro, oscuro o seguir el sistema.

## Usar la calculadora

1. Introduce el **Loudness integrado** del archivo en LUFS, medido por cualquier medidor ITU-R BS.1770 (un valor entre −70 y 0). En un teléfono puedes escribirlo sin el signo menos: `18.4` cuenta como −18,4, porque el loudness nunca es positivo.
2. Opcionalmente introduce el **True peak** en dBTP (entre −70 y +12). Usa el botón ± para cambiar el signo.
3. Elige el **Estándar de destino** de la lista (Broadcast, Streaming, Podcast, Otro), o **Personalizado…** para dar tu propio **Objetivo personalizado** y tu propio **Límite de true peak personalizado** (deja vacío el límite para ningún límite).
4. Lee el resultado. La cifra grande es la **Ganancia a aplicar** = objetivo − loudness medido, en dB. Debajo ves la **Entrada**, el **Objetivo**, el loudness **Resultado** y el **True peak resultante** (el true peak medido más la ganancia).

Si la ganancia lleva el true peak por encima del límite del estándar, aparece un **aviso** («True peak por encima del límite») junto con la ganancia máxima que puedes aplicar sin un limitador. Si el archivo ya está dentro de la tolerancia del estándar, la ganancia es opcional, y si no has introducido el true peak se omite la comprobación de clipping.

## La escala

La escala muestra **IN** (medido), **OBJ.** con su banda de tolerancia, **OUT** (resultado tras la ganancia) y **MÁX** (el loudness máximo alcanzable bajo el límite de pico). Está centrada en el objetivo y funciona como una rueda: arrástrala a izquierda o derecha (también funcionan la rueda del ratón y las flechas) para cambiar el objetivo. Está bloqueada mientras hay un estándar predefinido seleccionado; el interruptor del candado la desbloquea y pasa a Personalizado, y elegir Personalizado la desbloquea automáticamente. Los marcadores fuera del intervalo visible se pegan al borde con una flecha y su valor.

## Medir desde un archivo

Si no conoces los valores, pulsa **Medir desde un archivo** y elige un archivo de audio. El loudness y el true peak se miden **en tu navegador** (el archivo no sale nunca de tu equipo) y se copian en los campos. La medición es el loudness del programa completo (ITU-R BS.1770) sin gating de diálogo; los límites son 800 MB y 90 minutos, y *Método, fuentes y límites* explica los detalles.

## Estándares y valores

La tabla enumera los objetivos incorporados. «Oficial» significa leído del documento primario; «Recomendado» significa que no se encontró documentación oficial, solo una sugerencia de uso habitual, y la app lo dice. Comprobado en septiembre de 2026.

| Estándar | Objetivo | Tolerancia | Límite de true peak | Estado |
|---|---|---|---|---|
| EBU R 128 | −23,0 LUFS | ±1,0 LU donde el objetivo no es alcanzable en la práctica (por ejemplo directos); ±0,2 LU en QC | −1 dBTP en producción | Oficial |
| ATSC A/85 | −24 LKFS (sin metadatos, sin otro acuerdo) | alrededor de ±2 dB | por debajo de −2 dBTP, medido antes de la codificación | Oficial |
| Spotify | −14 LUFS | — | −1 dBTP (con pérdida); −2 dBTP si es más fuerte que −14 LUFS | Oficial |
| Apple Podcasts | −16 LKFS | ±1 dB | −1 dB FS (true peak) | Oficial |
| BBC | −23 LUFS | ±1 LU | −1 dBTP | Recomendado |
| YouTube | −14 LUFS | — | −1 dBTP | Recomendado |
| Apple Music | −16 LUFS | — | −1 dBTP | Recomendado |
| Amazon Music | −14 LUFS | — | −2 dBTP | Recomendado |

La **Reproducción en la plataforma** muestra la ganancia que una plataforma de streaming aplicaría a tu archivo tal cual; donde el comportamiento no está documentado oficialmente, la app lo dice. Un objetivo personalizado es un valor tuyo: nada se compara con un documento publicado.

## Idioma y privacidad

Las elecciones (idioma, tema) se guardan solo en el dispositivo. Ningún dato sale del navegador y las fuentes se sirven en local. Una pequeña tarjeta de propina al final de la página tiene la hucha del sitio y un botón que abre en una pestaña nueva la página de apoyo de onairgarage.com en tu idioma; es el único sitio, y dentro de la calculadora no se pide nunca nada.

## Actualizaciones

La app se actualiza sola: cuando hay una versión nueva lista, un aviso ofrece recargar. Ignorarlo deja simplemente en marcha la versión actual.

## Límites

- No es un medidor ni una herramienta certificada: la medición desde un archivo es un loudness del programa completo sin gating de diálogo, así que confirma siempre las entregas importantes con tu propio medidor BS.1770.
- El valor del true peak de un archivo que mides aquí se calcula en el navegador; para una entrega usa las cifras de tu medidor.
- Los valores de los estándares «Recomendados» son sugerencias de uso habitual, no requisitos publicados.

## Solución de problemas

| Problema | Qué hacer |
|---|---|
| «Introduce un valor entre −70 y 0 LUFS.» | El loudness integrado nunca es positivo: revisa el valor (un `18.4` solo cuenta como −18,4). |
| La medición falló | Prueba con un archivo más corto (hasta 90 minutos, 800 MB) u otro navegador; hacen falta Web Audio y Web Workers. |
| No aparece el botón *Instalar app* | Puede que el navegador no lo ofrezca: en iPhone, iPad y Safari para Mac usa los pasos del capítulo Abrir e instalar. |
| La escala no se mueve | Un estándar predefinido la bloquea: desbloquéala con el interruptor del candado, que pasa a Personalizado. |

## Contactos

Graziano Melzi · OnAir Garage — `https://onairgarage.com` — `hello@onairgarage.com`. Página de la herramienta: `https://onairgarage.com/tools/loudness-calculator/`. Código fuente y versiones: `https://github.com/djgragra/loudness-calculator`. Licencia: MIT © 2026 Graziano Melzi.
