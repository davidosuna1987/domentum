// The themes people can pick. Each id has css/themes/<id>.css and js/themes/<id>.js;
// the picker shows icons/themes/<id>.jpg.
export const THEMES = [
  { id: 'zen', name: 'Tinta zen', desc: 'Papel, tinta y un ensō. El de por defecto.' },
  { id: 'original', name: 'Original', desc: 'Cristal oscuro sobre el paisaje animado.' },
  { id: 'editorial', name: 'Editorial suizo', desc: 'Papel, retícula y tipografía enorme.' },
  { id: 'consola', name: 'Consola hi-fi', desc: 'Faders, vúmetros y teclas de los 70.' },
  { id: 'terminal', name: 'Terminal', desc: 'Fósforo verde y texto monoespaciado.' },
  { id: 'cine', name: 'Cine', desc: 'El paisaje a pantalla completa.' },
  { id: 'naturalista', name: 'Atlas naturalista', desc: 'Láminas en verde bosque y oro.' },
  { id: 'aurora', name: 'Aurora orbital', desc: 'Capas que orbitan un orbe de luz.' },
  { id: 'bento', name: 'Bento', desc: 'Tarjetas claras de distintos tamaños.' },
  { id: 'neumorfico', name: 'Neumórfico', desc: 'Relieve suave, diales y ruedas.' },
  { id: 'pop', name: 'Pop neobrutal', desc: 'Amarillo, bordes gruesos y pegatinas.' },
];

export const THEME = Object.fromEntries(THEMES.map(t => [t.id, t]));
export const DEFAULT_THEME = 'zen';
