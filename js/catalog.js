// Soundscapes. Each recorded layer lives at sounds/<scene>/<layer>.m4a
// `vol` is the default slider position (0..1).

export const SCENES = [
  {
    id: 'ocean', name: 'Océano', icon: 'ship', mood: 'waves',
    colors: ['#06233a', '#0b5a78', '#2aa3bd'],
    layers: [
      { id: 'boat', name: 'Velero', icon: 'sailboat', vol: 0.35 },
      { id: 'waves', name: 'Olas', icon: 'waves', vol: 0.55 },
      { id: 'gulls', name: 'Gaviotas', icon: 'gulls', vol: 0.08 },
      { id: 'surf', name: 'Rompientes', icon: 'surf', vol: 0.1 },
      { id: 'underwater', name: 'Bajo el agua', icon: 'bubbles', vol: 0 },
      // Extra over Momentum's five
      { id: 'whales', name: 'Ballenas', icon: 'whale', vol: 0 },
    ],
  },
  {
    id: 'rain', name: 'Lluvia', icon: 'cloudRain', mood: 'rain',
    colors: ['#0f2a33', '#1f4d58', '#4f8794'],
    layers: [
      { id: 'rain', name: 'Lluvia', icon: 'cloudRain', vol: 0.5 },
      { id: 'umbrella', name: 'Paraguas', icon: 'umbrella', vol: 0.35 },
    ],
  },
  {
    id: 'noise', name: 'Ruido', icon: 'tv', mood: 'grain', type: 'noise',
    colors: ['#0b0b0d', '#26262b', '#55555c'],
    vol: 0.6, variant: 'brown',
    variants: [
      { id: 'brown', name: 'Marrón', icon: 'noiseBrown', hint: 'Grave y envolvente. El favorito para concentrarse.' },
      { id: 'pink', name: 'Rosa', icon: 'noisePink', hint: 'Equilibrado, como lluvia constante.' },
      { id: 'grey', name: 'Gris', icon: 'noiseGrey', hint: 'Percibido igual de fuerte en todas las frecuencias.' },
      { id: 'white', name: 'Blanco', icon: 'noiseWhite', hint: 'Brillante. Tapa bien los ruidos agudos.' },
      { id: 'plane', name: 'Avión', icon: 'plane', hint: 'Cabina de avión en crucero.' },
      { id: 'voices', name: 'Tapa voces', icon: 'earOff', hint: 'Centrado en la banda de la voz para enmascarar conversaciones.' },
    ],
  },
  {
    id: 'binaural', name: 'Binaural', icon: 'binaural', mood: 'lines', type: 'binaural',
    colors: ['#14052b', '#3b0f73', '#8b3dff'],
    vol: 0.45, variant: 'alpha',
    variants: [
      { id: 'delta', name: 'Delta', glyph: 'δ', beat: 2, carrier: 180, hint: 'δ 2 Hz · sueño profundo. Usa auriculares.' },
      { id: 'theta', name: 'Theta', glyph: 'θ', beat: 6, carrier: 196, hint: 'θ 6 Hz · meditación y creatividad. Usa auriculares.' },
      { id: 'alpha', name: 'Alfa', glyph: 'α', beat: 10, carrier: 210, hint: 'α 10 Hz · calma alerta. Usa auriculares.' },
      { id: 'beta', name: 'Beta', glyph: 'β', beat: 16, carrier: 220, hint: 'β 16 Hz · foco activo. Usa auriculares.' },
      { id: 'gamma', name: 'Gamma', glyph: 'γ', beat: 40, carrier: 240, hint: 'γ 40 Hz · concentración intensa. Usa auriculares.' },
      { id: 'music', name: 'Música', icon: 'music', beat: 10, carrier: 220, hint: 'Alfa 10 Hz sobre un pad ambiental generativo que no se repite.' },
    ],
  },
  {
    id: 'campfire', name: 'Fogata', icon: 'campfire', mood: 'embers',
    colors: ['#1c0703', '#5c1a07', '#d9541a'],
    layers: [
      { id: 'fire', name: 'Fuego', icon: 'flame', vol: 0.8 },
      { id: 'night', name: 'Noche', icon: 'tent', vol: 0.2 },
    ],
  },
  {
    id: 'beach', name: 'Playa', icon: 'palm', mood: 'beach',
    colors: ['#2a2014', '#7a6343', '#d4b98c'],
    layers: [
      { id: 'waves', name: 'Olas', icon: 'waves', vol: 0.5 },
      { id: 'wind', name: 'Brisa', icon: 'wind', vol: 0.15 },
      { id: 'gulls', name: 'Gaviotas', icon: 'gulls', vol: 0.08 },
    ],
  },
  {
    id: 'train', name: 'Tren', icon: 'train', mood: 'motion',
    colors: ['#151619', '#3d3f46', '#8d909a'],
    layers: [
      { id: 'tracks', name: 'Vías', icon: 'tracks', vol: 0.7 },
      { id: 'wind', name: 'Viento', icon: 'wind', vol: 0.1 },
    ],
  },
  {
    id: 'forest', name: 'Bosque', icon: 'trees', mood: 'fireflies',
    colors: ['#06180e', '#15452a', '#3e8a55'],
    layers: [
      { id: 'birds', name: 'Pájaros', icon: 'bird', vol: 0.55 },
      { id: 'wind', name: 'Viento', icon: 'wind', vol: 0.12 },
      { id: 'insects', name: 'Insectos', icon: 'bug', vol: 0.06 },
    ],
  },
  {
    id: 'garden', name: 'Jardín', icon: 'lotus', mood: 'pollen',
    colors: ['#0f1f0c', '#34501f', '#93a84a'],
    layers: [
      { id: 'chimes', name: 'Campanillas', icon: 'chimes', vol: 0.75 },
      { id: 'insects', name: 'Insectos', icon: 'bug', vol: 0.12 },
      { id: 'wind', name: 'Viento', icon: 'wind', vol: 0.2 },
    ],
  },
  {
    id: 'cafe', name: 'Café', icon: 'coffee', mood: 'bokeh',
    colors: ['#1d130c', '#4d3524', '#a5815f'],
    layers: [
      { id: 'chatter', name: 'Murmullo', icon: 'chat', vol: 0.7 },
      { id: 'espresso', name: 'Cafetera', icon: 'espresso', vol: 0.12 },
    ],
  },
  {
    id: 'storm', name: 'Tormenta', icon: 'cloudBolt', mood: 'storm',
    colors: ['#0b0e18', '#262d45', '#5b6688'],
    layers: [
      { id: 'thunder', name: 'Truenos', icon: 'bolt', vol: 0.7 },
      { id: 'rain', name: 'Aguacero', icon: 'drops', vol: 0.55 },
      { id: 'wind', name: 'Viento', icon: 'wind', vol: 0.45 },
      { id: 'umbrella', name: 'Paraguas', icon: 'umbrella', vol: 0.22 },
    ],
  },
  {
    id: 'creek', name: 'Arroyo', icon: 'creek', mood: 'flow',
    colors: ['#06201f', '#145049', '#4fa08a'],
    layers: [
      { id: 'stream', name: 'Agua', icon: 'creek', vol: 0.6 },
      { id: 'wind', name: 'Viento', icon: 'wind', vol: 0.1 },
    ],
  },
  {
    id: 'office', name: 'Oficina', icon: 'building', mood: 'bokehCool',
    colors: ['#141a22', '#2f3b4b', '#6f8299'],
    layers: [
      { id: 'chatter', name: 'Voces', icon: 'speech', vol: 0.55 },
      { id: 'printer', name: 'Impresora', icon: 'printer', vol: 0.2 },
      { id: 'ac', name: 'Climatizador', icon: 'airVent', vol: 0.3 },
      { id: 'copier', name: 'Fotocopiadora', icon: 'copier', vol: 0.1 },
      { id: 'keyboard', name: 'Teclado', icon: 'keyboard', vol: 0.18 },
    ],
  },
  {
    id: 'custom', name: 'Personal', icon: 'music', mood: 'lines', type: 'custom',
    colors: ['#0c2a30', '#1e5a66', '#4aa0ad'],
    layers: [],
  },
];

export const SCENE = Object.fromEntries(SCENES.map(s => [s.id, s]));

export const soundUrl = (sceneId, layerId) => `sounds/${sceneId}/${layerId}.m4a`;

export const allSoundUrls = () =>
  SCENES.filter(s => !s.type).flatMap(s => s.layers.map(l => soundUrl(s.id, l.id)));

// Curated starting points. `vols` override layer defaults, missing layers keep theirs.
export const PRESET_MIXES = [
  {
    id: 'p-cabin', name: 'Cabaña con lluvia', preset: true,
    active: ['rain', 'campfire'],
    vols: { 'rain/rain': 0.5, 'rain/umbrella': 0, 'campfire/fire': 0.55, 'campfire/night': 0 },
  },
  {
    id: 'p-deep', name: 'Foco profundo', preset: true,
    active: ['noise', 'binaural'],
    variants: { noise: 'brown', binaural: 'beta' },
    sceneVols: { noise: 0.45, binaural: 0.18 },
  },
  {
    id: 'p-sleep', name: 'Dormir junto al mar', preset: true,
    active: ['beach', 'noise'],
    vols: { 'beach/waves': 0.6, 'beach/wind': 0.08, 'beach/gulls': 0 },
    variants: { noise: 'brown' }, sceneVols: { noise: 0.22 },
  },
  {
    id: 'p-library', name: 'Cafetería tranquila', preset: true,
    active: ['cafe', 'rain'],
    vols: { 'cafe/chatter': 0.45, 'cafe/espresso': 0.05, 'rain/rain': 0.35, 'rain/umbrella': 0 },
  },
  {
    id: 'p-wildrain', name: 'Bosque bajo la tormenta', preset: true,
    active: ['forest', 'storm'],
    vols: { 'forest/birds': 0.3, 'forest/wind': 0.15, 'forest/insects': 0, 'storm/thunder': 0.5, 'storm/rain': 0.45, 'storm/wind': 0.2, 'storm/umbrella': 0 },
  },
];
