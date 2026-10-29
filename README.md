# Domentum

Paisajes sonoros para concentrarte, relajarte o dormir. Es una web estática que se instala en el móvil como app (PWA) y funciona sin conexión.

En línea: https://davidosuna1987.github.io/domentum/

- 13 paisajes: Océano, Lluvia, Ruido, Binaural, Fogata, Playa, Tren, Bosque, Jardín, Café, Tormenta, Arroyo y Oficina. Además, «Personal», con tus propios audios.
- Volumen independiente por capa y sin límite de tiempo. Los bucles se encadenan con fundido cruzado, así que no se oye el corte.
- Puedes sumar hasta 4 paisajes a la vez, guardar mezclas y usar un temporizador opcional con fundido final.
- El ruido (marrón, rosa, gris, blanco, avión, tapa voces) y los binaurales (δ θ α β γ y música generativa) se generan en tiempo real.
- Grabaciones de campo CC0 de [Freesound](https://freesound.org). Los créditos están en `sounds/credits.json` y en la app (menú ⋯ → Créditos).

## Desarrollo

```bash
python3 .claude/serve.py 5180
```

Abre http://localhost:5180. En localhost el service worker está desactivado para que no sirva código viejo; actívalo con `?sw`.

## Publicar

Es una carpeta estática: sirve en GitHub Pages, Vercel, Netlify o Cloudflare Pages sin compilar nada. Hace falta HTTPS para instalarla como app y para el modo sin conexión.
