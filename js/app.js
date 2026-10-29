import { SCENES, SCENE, PRESET_MIXES, allSoundUrls, soundUrl } from './catalog.js';
import { icon } from './icons.js';
import { Engine } from './engine.js';
import { Backdrop } from './bg.js';
import { loadState, saveState, putAudio, getAudio, deleteAudio } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SOUND_CACHE = 'domentum-sounds-v1';

const state = loadState({
  playing: false,
  master: 0.9,
  active: ['ocean'],
  focus: 'ocean',
  vols: {},
  variants: {},
  sceneVols: {},
  breathe: true,
  mixes: [],
  custom: [],
  tab: 'scenes',
});
state.timer = null;
state.active = state.active.filter(id => SCENE[id]);
if (!state.active.length) state.active = ['ocean'];
if (!SCENE[state.focus]) state.focus = state.active[0];

const engine = new Engine();
engine.customLoader = async id => {
  const blob = await getAudio(id);
  if (!blob) throw new Error('Archivo no encontrado');
  return blob.arrayBuffer();
};
const status = new Map();
engine.on((key, st) => {
  status.set(key, st);
  const el = document.querySelector(`[data-layer="${CSS.escape(key)}"]`);
  if (el) el.dataset.status = st;
  if (st === 'error') toast('No se pudo cargar un sonido. ¿Estás sin conexión?');
});
engine.apply(state);

const backdrop = new Backdrop($('#bg'));
const lastVol = new Map();

// ---------- helpers ----------
const vars = s => `--c0:${s.colors[0]};--c1:${s.colors[1]};--c2:${s.colors[2]}`;
const eq = () => '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
const layerVol = (sid, l) => state.vols[`${sid}/${l.id}`] ?? l.vol;
const sceneVol = s => state.sceneVols[s.id] ?? s.vol;
const variantOf = s => s.variants.find(v => v.id === (state.variants[s.id] || s.variant));

function sceneTitle(s) {
  if (s.type === 'noise') return `Ruido ${variantOf(s).name.toLowerCase()}`;
  if (s.type === 'binaural') return `Binaural ${variantOf(s).name.toLowerCase()}`;
  return s.name;
}

function sliderHTML(key, v, label) {
  return `<div class="slider" data-key="${esc(key)}" role="slider" tabindex="0" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v * 100)}" style="--v:${v}"><div class="track"><div class="fill"></div><div class="thumb"></div></div></div>`;
}

function commit(render_ = true) {
  saveState(state);
  engine.apply(state);
  if (render_) render();
  updateMedia();
}

// ---------- rendering ----------
function render() {
  renderNow();
  renderMixer();
  renderLibrary();
  const f = SCENE[state.focus];
  backdrop.set(f.mood, f.colors);
  $('meta[name="theme-color"]').setAttribute('content', f.colors[0]);
  document.title = state.playing ? `${state.active.map(id => sceneTitle(SCENE[id])).join(' + ')} · Domentum` : 'Domentum';
}

function renderNow() {
  const sc = state.active.map(id => SCENE[id]);
  const f = SCENE[state.focus];
  $('#now').innerHTML = `
    <div class="now-head">
      <div class="art" style="${vars(f)}">${icon(f.icon)}</div>
      <div class="now-text">
        <div class="eyebrow">${state.playing ? `${eq()} Sonando` : 'En pausa'}</div>
        <div class="now-title">${sc.map(s => esc(sceneTitle(s))).join('<span class="plus"> + </span>')}</div>
      </div>
      <button class="play ${state.playing ? 'on' : ''}" id="playBtn" aria-label="${state.playing ? 'Pausar' : 'Reproducir'}">${icon(state.playing ? 'pause' : 'play')}</button>
    </div>
    ${sc.length > 1 ? `<div class="chips">${sc.map(s => `
      <div class="chip ${s.id === state.focus ? 'on' : ''}" role="button" tabindex="0" data-focus="${s.id}">
        ${icon(s.icon)}<span>${esc(s.name)}</span>
        <button class="chip-x" data-remove="${s.id}" aria-label="Quitar ${esc(s.name)}">${icon('x')}</button>
      </div>`).join('')}</div>` : ''}
    <div class="master">
      <button class="icon-btn sm" id="muteBtn" aria-label="Silenciar todo">${icon(state.master > 0 ? 'volume' : 'volumeOff')}</button>
      ${sliderHTML('master', state.master, 'Volumen general')}
    </div>`;
}

function layerCell(s, l, removable = false) {
  const key = `${s.id}/${l.id}`;
  const v = layerVol(s.id, l);
  return `
    <div class="layer ${v === 0 ? 'off' : ''}" data-layer="${esc(key)}" data-status="${status.get(key) || ''}">
      <button class="layer-ico" data-toggle="${esc(key)}" aria-label="Silenciar o activar ${esc(l.name)}">${icon(l.icon)}</button>
      <div class="layer-name"><span>${esc(l.name)}</span>${removable ? `<button class="del" data-del-custom="${esc(l.id)}" aria-label="Eliminar ${esc(l.name)}">${icon('x')}</button>` : ''}</div>
      ${sliderHTML('layer:' + key, v, l.name)}
    </div>`;
}

function renderMixer() {
  const s = SCENE[state.focus];
  let body;
  if (s.type === 'noise' || s.type === 'binaural') {
    const cur = variantOf(s);
    body = `
      <div class="variants">${s.variants.map(x => `
        <button class="variant ${x.id === cur.id ? 'on' : ''}" data-variant="${x.id}" aria-pressed="${x.id === cur.id}">
          ${x.glyph ? `<span class="glyph">${x.glyph}</span>` : icon(x.icon)}<span class="vname">${esc(x.name)}</span>
        </button>`).join('')}
      </div>
      <p class="hint">${esc(cur.hint)}</p>
      <div class="layer wide">
        <div class="layer-name"><span>Volumen</span></div>
        ${sliderHTML('scene:' + s.id, sceneVol(s), 'Volumen de ' + s.name)}
      </div>`;
  } else if (s.type === 'custom') {
    body = `
      <div class="layers">
        ${state.custom.map(c => layerCell(s, { id: c.id, name: c.name, icon: 'music', vol: 0.5 }, true)).join('')}
        <label class="layer add">
          <input type="file" accept="audio/*" multiple id="fileIn" hidden>
          ${icon('upload')}<span>Importar audio</span>
        </label>
      </div>
      <p class="hint">Añade tus propios archivos (mp3, m4a, wav…). Se guardan solo en este dispositivo y suenan en bucle sin cortes.</p>`;
  } else {
    body = `<div class="layers">${s.layers.map(l => layerCell(s, l)).join('')}</div>`;
  }
  $('#mixer').innerHTML = `
    <div class="mix-head">
      <div class="art sm" style="${vars(s)}">${icon(s.icon)}</div>
      <h2>${esc(s.name)}</h2>
      <button class="icon-btn" data-scene-menu="${s.id}" aria-label="Opciones de ${esc(s.name)}">${icon('more')}</button>
    </div>
    ${body}`;
}

function tile(s) {
  const on = state.active.includes(s.id);
  return `
    <div class="tile ${on ? 'on' : ''}" role="button" tabindex="0" data-scene="${s.id}" aria-label="Reproducir ${esc(s.name)}">
      <div class="tile-art" style="${vars(s)}" data-mood="${s.mood}">
        ${icon(s.icon)}
        ${on && state.playing ? eq() : ''}
        <button class="tile-add" data-add="${s.id}" aria-label="${on ? 'Quitar de' : 'Añadir a'} la mezcla" title="${on ? 'Quitar de la mezcla' : 'Sumar a lo que suena'}">${icon(on ? 'check' : 'plus')}</button>
      </div>
      <div class="tile-name">${esc(s.name)}</div>
    </div>`;
}

function mixTile(m) {
  const sc = m.active.map(id => SCENE[id]).filter(Boolean);
  const a = sc[0], b = sc[1] || sc[0];
  return `
    <div class="tile mix" role="button" tabindex="0" data-mix="${esc(m.id)}" aria-label="Reproducir mezcla ${esc(m.name)}">
      <div class="tile-art" style="--c0:${a.colors[0]};--c1:${a.colors[1]};--c2:${b.colors[2]}">
        <div class="mix-icons">${sc.map(s => icon(s.icon)).join('')}</div>
        ${m.preset ? '' : `<button class="tile-add" data-del-mix="${esc(m.id)}" aria-label="Borrar mezcla">${icon('trash')}</button>`}
      </div>
      <div class="tile-name">${esc(m.name)}</div>
    </div>`;
}

function renderLibrary() {
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', b.dataset.tab === state.tab);
  const lib = $('#library');
  if (state.tab === 'mixes') {
    lib.innerHTML = `
      <div class="grid">
        <div class="tile" role="button" tabindex="0" data-save-mix>
          <div class="tile-art save">${icon('heart')}</div>
          <div class="tile-name">Guardar lo que suena</div>
        </div>
        ${state.mixes.map(mixTile).join('')}
        ${PRESET_MIXES.map(mixTile).join('')}
      </div>`;
  } else {
    lib.innerHTML = `<div class="grid">${SCENES.map(tile).join('')}</div>`;
  }
}

// ---------- actions ----------
function setPlaying(on) {
  state.playing = on;
  if (on) {
    engine.apply(state);
    engine.play();
  } else engine.pause();
  render();
  updateMedia();
}

function playScene(id) {
  if (!state.active.includes(id)) state.active = [id];
  state.focus = id;
  if (id === 'custom' && !state.custom.length) {
    commit();
    return;
  }
  state.playing = true;
  engine.apply(state);
  engine.play();
  commit();
}

function toggleInMix(id) {
  if (state.active.includes(id)) {
    if (state.active.length === 1) return toast('Es lo único que suena: elige otro paisaje antes de quitarlo.');
    state.active = state.active.filter(x => x !== id);
    if (state.focus === id) state.focus = state.active[0];
  } else {
    if (state.active.length >= 4) return toast('Máximo 4 paisajes a la vez.');
    state.active = [...state.active, id];
    state.focus = id;
    if (!state.playing) {
      state.playing = true;
      engine.apply(state);
      engine.play();
    }
  }
  commit();
}

function loadMix(m) {
  state.active = m.active.filter(id => SCENE[id]);
  state.focus = state.active[0];
  for (const id of state.active) for (const l of SCENE[id].layers) delete state.vols[`${id}/${l.id}`];
  Object.assign(state.vols, m.vols || {});
  Object.assign(state.variants, m.variants || {});
  Object.assign(state.sceneVols, m.sceneVols || {});
  state.playing = true;
  engine.apply(state);
  engine.play();
  commit();
  toast(`Mezcla «${m.name}»`);
}

function saveMix(name) {
  const vols = {};
  const variants = {};
  const sceneVols = {};
  for (const id of state.active) {
    const s = SCENE[id];
    if (s.type === 'noise' || s.type === 'binaural') {
      variants[id] = variantOf(s).id;
      sceneVols[id] = sceneVol(s);
    } else {
      const defs = s.type === 'custom' ? state.custom.map(c => ({ id: c.id, vol: 0.5 })) : s.layers;
      for (const l of defs) vols[`${id}/${l.id}`] = layerVol(id, l);
    }
  }
  state.mixes.unshift({ id: 'm' + Date.now(), name, active: [...state.active], vols, variants, sceneVols });
  state.tab = 'mixes';
  commit();
  toast('Mezcla guardada');
}

function onSlide(key, v) {
  if (key === 'master') {
    state.master = v;
    const b = $('#muteBtn');
    if (b) b.innerHTML = icon(v > 0 ? 'volume' : 'volumeOff');
  } else if (key.startsWith('layer:')) {
    const k = key.slice(6);
    state.vols[k] = v;
    document.querySelector(`[data-layer="${CSS.escape(k)}"]`)?.classList.toggle('off', v === 0);
  } else if (key.startsWith('scene:')) {
    state.sceneVols[key.slice(6)] = v;
  }
  engine.apply(state);
  saveState(state);
}

function toggleLayer(key) {
  const [sid, lid] = key.split('/');
  const s = SCENE[sid];
  const l = s.type === 'custom' ? { id: lid, vol: 0.5 } : s.layers.find(x => x.id === lid);
  const v = layerVol(sid, l);
  let nv;
  if (v > 0) {
    lastVol.set(key, v);
    nv = 0;
  } else nv = lastVol.get(key) || l.vol || 0.4;
  state.vols[key] = nv;
  const el = document.querySelector(`[data-layer="${CSS.escape(key)}"]`);
  el?.classList.toggle('off', nv === 0);
  const sl = el?.querySelector('.slider');
  if (sl) setSlider(sl, nv);
  if (nv > 0 && !state.playing) setPlaying(true);
  commit(false);
}

async function importFiles(files) {
  let n = 0;
  for (const f of files) {
    if (!f.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|caf|aiff?)$/i.test(f.name)) continue;
    if (f.size > 80 * 1024 * 1024) { toast(`«${f.name}» es demasiado grande (máx. 80 MB)`); continue; }
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await putAudio(id, f);
    state.custom.push({ id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 40) });
    n++;
  }
  if (!n) return;
  if (!state.active.includes('custom')) state.active = [...state.active.filter(x => x !== 'custom'), 'custom'].slice(-4);
  state.focus = 'custom';
  state.playing = true;
  engine.apply(state);
  engine.play();
  commit();
  toast(n === 1 ? 'Audio añadido' : `${n} audios añadidos`);
}

async function deleteCustom(id) {
  const c = state.custom.find(x => x.id === id);
  if (!c || !confirm(`¿Eliminar «${c.name}» de este dispositivo?`)) return;
  state.custom = state.custom.filter(x => x.id !== id);
  delete state.vols[`custom/${id}`];
  engine.forget(`custom/${id}`);
  await deleteAudio(id).catch(() => {});
  commit();
}

// ---------- slider interaction ----------
function setSlider(el, v) {
  el.style.setProperty('--v', v);
  el.setAttribute('aria-valuenow', Math.round(v * 100));
}

function slideTo(el, clientX) {
  const r = el.querySelector('.track').getBoundingClientRect();
  let v = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  if (v < 0.015) v = 0;
  setSlider(el, v);
  onSlide(el.dataset.key, v);
}

document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.slider');
  if (!el || e.button > 0) return;
  // Touch: only grab horizontal drags (or a clean tap), so scrolling the page never changes a volume.
  const x0 = e.clientX, y0 = e.clientY;
  let live = e.pointerType === 'mouse';
  let moved = false;
  try { el.setPointerCapture(e.pointerId); } catch {}
  if (live) { el.classList.add('drag'); slideTo(el, x0); }
  const move = ev => {
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    if (Math.hypot(dx, dy) > 6) moved = true;
    if (!live) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { live = true; el.classList.add('drag'); }
      else return;
    }
    slideTo(el, ev.clientX);
  };
  const end = ev => {
    if (ev.type === 'pointerup' && !live && !moved) slideTo(el, ev.clientX);
    el.classList.remove('drag');
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
});

document.addEventListener('keydown', e => {
  const el = e.target.closest?.('.slider');
  if (el) {
    const v = parseFloat(getComputedStyle(el).getPropertyValue('--v')) || 0;
    const step = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, PageUp: 0.2, PageDown: -0.2 }[e.key];
    let nv = step != null ? v + step : e.key === 'Home' ? 0 : e.key === 'End' ? 1 : null;
    if (nv == null) return;
    e.preventDefault();
    nv = Math.round(Math.min(1, Math.max(0, nv)) * 100) / 100;
    setSlider(el, nv);
    onSlide(el.dataset.key, nv);
    return;
  }
  if (e.key === 'Escape') return closeSheet();
  const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if (e.code === 'Space' && !typing && !e.target.closest('button,[role="button"]')) {
    e.preventDefault();
    setPlaying(!state.playing);
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) {
    e.preventDefault();
    e.target.click();
  }
});

// ---------- clicks ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, [role="button"], [data-tab]');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'playBtn') return setPlaying(!state.playing);
  if (t.id === 'muteBtn') {
    if (state.master > 0) { lastVol.set('master', state.master); state.master = 0; }
    else state.master = lastVol.get('master') || 0.8;
    return commit();
  }
  if (t.id === 'timerBtn') return timerSheet();
  if (t.id === 'menuBtn') return menuSheet();
  if (d.add) return toggleInMix(d.add);
  if (d.remove) return toggleInMix(d.remove);
  if (d.delMix) {
    state.mixes = state.mixes.filter(m => m.id !== d.delMix);
    return commit();
  }
  if (d.delCustom) return deleteCustom(d.delCustom);
  if (d.scene) return playScene(d.scene);
  if (d.focus) { state.focus = d.focus; return commit(); }
  if (d.variant) {
    state.variants[state.focus] = d.variant;
    if (!state.playing) { state.playing = true; engine.apply(state); engine.play(); }
    return commit();
  }
  if (d.toggle) return toggleLayer(d.toggle);
  if (d.sceneMenu) return sceneSheet(d.sceneMenu);
  if (d.tab) { state.tab = d.tab; return commit(); }
  if (d.mix) return loadMix([...state.mixes, ...PRESET_MIXES].find(m => m.id === d.mix));
  if ('saveMix' in d) return saveSheet();
  if (d.timer !== undefined) {
    const m = d.timer ? +d.timer : null;
    state.timer = m;
    engine.setTimer(m ? m * 60 : null);
    tickTimer();
    closeSheet();
    if (m) toast(`Se apagará tras ${m} min sonando`);
    return;
  }
  if (d.act) return action(d.act, t);
});

document.addEventListener('change', e => {
  if (e.target.id === 'fileIn') importFiles([...e.target.files]);
  if (e.target.dataset.act === 'breathe') {
    state.breathe = e.target.checked;
    commit(false);
  }
});

// ---------- sheets ----------
function openSheet(html) {
  $('#sheet').innerHTML = `<div class="sheet-grip"></div>${html}`;
  document.body.classList.add('sheet-open');
  $('#sheet').querySelector('input:not([type=checkbox]),button')?.focus({ preventScroll: true });
}
function closeSheet() {
  document.body.classList.remove('sheet-open');
}
$('#sheetBg').addEventListener('click', closeSheet);

function timerSheet() {
  const opts = [null, 15, 30, 45, 60, 90, 120, 180];
  openSheet(`
    <h3>${icon('timer')} Temporizador</h3>
    <p class="muted">Por defecto suena sin límite. Si eliges un tiempo, al final baja el volumen poco a poco durante 30 s y se pausa.</p>
    <div class="opts">${opts.map(m => `<button class="opt ${state.timer === m ? 'on' : ''}" data-timer="${m ?? ''}">${m ? (m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${m} min`) : 'Sin límite ∞'}</button>`).join('')}</div>`);
}

function menuSheet() {
  openSheet(`
    <h3>Domentum</h3>
    <button class="row" data-act="offline">${icon('download')}<span><b>Descargar todo para usar sin conexión</b><small id="offlineInfo">${offlineLabel()}</small></span></button>
    <label class="row">${icon('sparkles')}<span><b>Variación natural</b><small>Cada capa sube y baja muy levemente su volumen, como pasa en la naturaleza. Así el bucle nunca se nota.</small></span><input type="checkbox" class="switch" data-act="breathe" ${state.breathe ? 'checked' : ''}></label>
    <button class="row" data-act="install">${icon('phone')}<span><b>Instalar en el móvil</b><small>Funciona como una app, a pantalla completa y sin conexión.</small></span></button>
    <button class="row" data-act="credits">${icon('info')}<span><b>Créditos de los sonidos</b><small>Grabaciones de campo con licencia CC0 (dominio público).</small></span></button>
    <p class="muted foot">Atajo: barra espaciadora para reproducir o pausar.</p>`);
}

function sceneSheet(id) {
  const s = SCENE[id];
  const on = state.active.includes(id);
  const synth = s.type === 'noise' || s.type === 'binaural';
  openSheet(`
    <h3>${icon(s.icon)} ${esc(s.name)}</h3>
    <button class="row" data-act="reset" data-id="${id}">${icon('reset')}<span><b>Restablecer volúmenes</b><small>Vuelve a la mezcla original de este paisaje.</small></span></button>
    <button class="row" data-act="toggle-mix" data-id="${id}">${icon('layers')}<span><b>${on ? 'Quitar de lo que suena' : 'Sumar a lo que suena'}</b><small>Combina hasta 4 paisajes a la vez.</small></span></button>
    ${synth || s.type === 'custom' ? '' : `<button class="row" data-act="offline-scene" data-id="${id}">${icon('download')}<span><b>Descargar este paisaje</b><small>Para escucharlo sin conexión.</small></span></button>`}
    <button class="row" data-act="save">${icon('heart')}<span><b>Guardar mezcla actual</b><small>Aparecerá en «Mezclas».</small></span></button>`);
}

function saveSheet() {
  const def = state.active.map(id => sceneTitle(SCENE[id])).join(' + ');
  openSheet(`
    <h3>${icon('heart')} Guardar mezcla</h3>
    <form id="saveForm" class="save-form">
      <input id="mixName" maxlength="40" placeholder="Nombre" value="${esc(def)}" autocomplete="off">
      <button class="btn" type="submit">Guardar</button>
    </form>`);
  const inp = $('#mixName');
  inp.focus();
  inp.select();
  $('#saveForm').addEventListener('submit', ev => {
    ev.preventDefault();
    saveMix(inp.value.trim() || def);
    closeSheet();
  });
}

let creditsCache;
async function creditsSheet() {
  openSheet(`<h3>${icon('info')} Créditos</h3><p class="muted">Cargando…</p>`);
  try {
    creditsCache ||= await (await fetch('sounds/credits.json')).json();
    openSheet(`
      <h3>${icon('info')} Créditos</h3>
      <p class="muted">Todas las grabaciones vienen de <a href="https://freesound.org" target="_blank" rel="noopener">Freesound</a> con licencia CC0 (dominio público). Gracias a sus autores. El ruido y los binaurales se generan en tiempo real en tu dispositivo.</p>
      <ul class="credits">${creditsCache.map(c => `
        <li><b>${esc(SCENE[c.scene]?.name || c.scene)} · ${esc(c.layer)}</b>
        <a href="${esc(c.url)}" target="_blank" rel="noopener">«${esc(c.title)}»</a> por ${esc(c.author)}</li>`).join('')}
      </ul>`);
  } catch {
    openSheet(`<h3>Créditos</h3><p class="muted">No se pudieron cargar los créditos.</p>`);
  }
}

// ---------- offline ----------
let soundSizes = {};
fetch('sounds/manifest.json').then(r => r.json()).then(j => { soundSizes = j; }).catch(() => {});

function offlineLabel() {
  const total = Object.values(soundSizes).reduce((a, b) => a + b, 0);
  return total ? `${Math.round(total / 1048576)} MB en total. Las capas que ya has escuchado ya están guardadas.` : 'Guarda todos los sonidos en este dispositivo.';
}

async function cacheUrls(urls, onProgress) {
  if (!('caches' in window)) throw new Error('Este navegador no permite guardar para sin conexión');
  navigator.storage?.persist?.();
  const cache = await caches.open(SOUND_CACHE);
  let done = 0;
  for (const url of urls) {
    if (!(await cache.match(url))) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await cache.put(url, r);
    }
    onProgress(++done / urls.length);
  }
}

async function downloadOffline(urls, label) {
  const info = $('#offlineInfo');
  const show = p => {
    if (info) info.innerHTML = `<span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span> ${Math.round(p * 100)}%`;
  };
  try {
    toast(`Descargando ${label}…`);
    await cacheUrls(urls, show);
    toast(`Listo: ${label} disponible sin conexión`);
    if (info) info.textContent = 'Todo guardado en este dispositivo ✓';
  } catch (err) {
    toast(`No se pudo completar la descarga: ${err.message}`);
  }
}

// ---------- install ----------
let installPrompt;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
});

function installHelp() {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    return closeSheet();
  }
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openSheet(`
    <h3>${icon('phone')} Instalar Domentum</h3>
    ${standalone ? '<p>Ya la estás usando instalada ✓</p>' : ios ? `
      <ol class="steps"><li>Abre esta página en <b>Safari</b>.</li><li>Pulsa el botón <b>Compartir</b> (cuadrado con flecha).</li><li>Elige <b>Añadir a pantalla de inicio</b>.</li></ol>` : `
      <ol class="steps"><li>Abre el menú del navegador (<b>⋮</b>).</li><li>Elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</li></ol>`}
    <p class="muted">Después, entra en el menú ⋯ y pulsa «Descargar todo» para que funcione también sin conexión.</p>`);
}

function action(act, el) {
  const id = el.dataset.id;
  if (act === 'offline') return downloadOffline(allSoundUrls(), 'todos los sonidos');
  if (act === 'offline-scene') {
    closeSheet();
    return downloadOffline(SCENE[id].layers.map(l => soundUrl(id, l.id)), SCENE[id].name);
  }
  if (act === 'install') return installHelp();
  if (act === 'credits') return creditsSheet();
  if (act === 'save') return saveSheet();
  if (act === 'toggle-mix') { closeSheet(); return toggleInMix(id); }
  if (act === 'reset') {
    const s = SCENE[id];
    for (const l of s.layers) delete state.vols[`${id}/${l.id}`];
    delete state.sceneVols[id];
    delete state.variants[id];
    closeSheet();
    return commit();
  }
}

// ---------- timer ----------
function fmt(sec) {
  sec = Math.ceil(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function tickTimer() {
  const left = engine.timerLeft();
  $('#timerLabel').textContent = left == null ? '∞' : fmt(left);
  $('#timerBtn').classList.toggle('on', left != null);
  if (left === 0 && state.timer) {
    state.timer = null;
    engine.setTimer(null);
    setPlaying(false);
    toast('Temporizador terminado');
  }
}
setInterval(tickTimer, 1000);

// ---------- media session ----------
function updateMedia() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.active.map(id => sceneTitle(SCENE[id])).join(' + '),
      artist: 'Domentum',
      album: 'Paisajes sonoros',
      artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
  } catch {}
}
if ('mediaSession' in navigator) {
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} };
  h('play', () => setPlaying(true));
  h('pause', () => setPlaying(false));
  h('stop', () => setPlaying(false));
}

// ---------- toast ----------
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- boot ----------
render();
tickTimer();
const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if (dev) window.__domentum = { engine, state };
// On localhost the service worker would serve stale code while developing; opt in with ?sw
if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!dev || location.search.includes('sw'))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
