// Shared demo state for the restyle mockups: same content in every style so they compare fairly.
import { SCENES, SCENE } from '../../js/catalog.js';
import { icon } from '../../js/icons.js';

export { SCENES, SCENE, icon };

if (location.search.includes('shot')) document.documentElement.classList.add('shot');

export const NOW = SCENE.ocean;
const VOLS = { boat: 0.35, waves: 0.62, gulls: 0.24, surf: 0.16, underwater: 0, whales: 0.1 };
export const LAYERS = NOW.layers.map(l => ({ ...l, v: VOLS[l.id] ?? l.vol }));
export const MASTER = 0.8;
export const TIMER = '45:00';
export const MIXES = ['Cabaña con lluvia', 'Foco profundo', 'Dormir junto al mar', 'Cafetería tranquila', 'Bosque bajo la tormenta'];

export const pct = v => Math.round(v * 100);
export const pad = n => String(n).padStart(2, '0');
export const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
export const meta = s => s.layers?.length ? `${s.layers.length} capas` : s.variants ? `${s.variants.length} tipos` : 'tus audios';
export const html = (sel, markup) => { document.querySelector(sel).innerHTML = markup; };
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
