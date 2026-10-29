# Domentum

Paisajes sonoros para concentrarte, relajarte o dormir. Es una web estática que se instala en el móvil como app (PWA) y funciona sin conexión.

En línea: https://davidosuna1987.github.io/domentum/

- 13 paisajes: Océano, Lluvia, Ruido, Binaural, Fogata, Playa, Tren, Bosque, Jardín, Café, Tormenta, Arroyo y Oficina. Además, «Personal», con tus propios audios.
- Volumen independiente por capa y sin límite de tiempo. Los bucles se encadenan con fundido cruzado, así que no se oye el corte.
- Puedes sumar hasta 4 paisajes a la vez, guardar mezclas y usar un temporizador opcional con fundido final.
- El ruido (marrón, rosa, gris, blanco, avión, tapa voces) y los binaurales (δ θ α β γ y música generativa) se generan en tiempo real.
- Modo zen (botón de la cabecera, menú ⋯ o tecla Z): solo lo que suena, a pantalla completa en el ordenador y sin que se apague la pantalla mientras suena. Esc o Z para salir.
- Modo claro, oscuro o como el sistema (menú ⋯ → Apariencia), en todos los temas.
- «Todos los sonidos» (menú ⋯ o «Elegir sonidos» en Personal): elige sonidos sueltos de cualquier paisaje y júntalos con tus audios en una mezcla propia.
- Cada tema tiene sus propios menús, con su animación de entrada y salida (`?menus=clasico` muestra los de antes, para comparar).
- 11 temas para elegir en el menú ⋯ → Tema: Tinta zen (por defecto), Cristal, Editorial suizo, Consola hi-fi, Terminal, Cine, Atlas naturalista, Aurora orbital, Bento, Neumórfico y Pop neobrutal. Cada tema es `css/themes/<id>.css` más `js/themes/<id>.js`; cómo se hacen está en `design/THEMES.md`.
- Grabaciones de campo CC0 de [Freesound](https://freesound.org). Los créditos están en `sounds/credits.json` y en la app (menú ⋯ → Créditos).

## Estructura

- `/` es la landing, en inglés; `/es/`, `/ca/`, `/fr/`, `/it/`, `/pt/` y `/de/` son las demás versiones. Se generan con `node design/landing/build.mjs` a partir de los textos de `design/landing/i18n/<idioma>.mjs` (en `==así==` van las frases con subrayado de pincel). `node design/landing/check.mjs <idioma>` comprueba que una traducción tiene todo; `node design/landing/og.mjs` rehace las imágenes para redes.
- `/app/` es el reproductor (la app instalable). `app/?paisaje=rain` abre un paisaje concreto y `app/?theme=pop` un estilo.
- `sitemap.xml`, `robots.txt` y `llms.txt` se generan con la landing.
- `native/` son las apps de Android, iPhone y Mac: el mismo reproductor dentro de una app nativa (Capacitor y Swift). `node native/release.mjs <versión>` las genera y las publica con la extensión en una versión de GitHub, que es lo que enlaza la landing según el dispositivo. Detalles, firma y tiendas en `native/README.md`.
- `extension/` es la extensión de Chrome: cada pestaña nueva es el reproductor y el icono de la barra abre un mini reproductor; el sonido suena en un documento oculto, así que sigue al cerrar la ventanita o cambiar de pestaña. `node extension/build.mjs` la genera en `dist/extension/` (para «Cargar descomprimida») y `dist/domentum-chrome.zip` (para la Chrome Web Store o para adjuntarla a una versión de GitHub, que es lo que enlaza la landing). En Chrome, Brave o Edge de escritorio, la landing muestra el botón «Extensión para Chrome», que abre los pasos para instalar el `.zip`. Cuando esté en la Chrome Web Store, pon su dirección en `CHROME_STORE` (en `design/landing/build.mjs`) y vuelve a generar la landing: los botones pasarán a «Añadir a Chrome» y llevarán directo a la tienda.

## Desarrollo

```bash
python3 .claude/serve.py 5180
```

Abre http://localhost:5180 (landing) o http://localhost:5180/app/ (reproductor). En localhost el service worker está desactivado para que no sirva código viejo; actívalo con `?sw`. `?theme=<id>` abre un tema concreto.

## Publicar

Es una carpeta estática: sirve en GitHub Pages, Vercel, Netlify o Cloudflare Pages sin compilar nada. Hace falta HTTPS para instalarla como app y para el modo sin conexión.
