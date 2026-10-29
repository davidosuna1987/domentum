// The extension's sound: the same Engine as the web player, running in an offscreen document. Every window of
// the extension (new tab, toolbar popup) sends it commands through background.js and hears back what changed.
import { Engine } from './engine.js';
import { getAudio } from './store.js';

const engine = new Engine();
engine.customLoader = async id => {
  const blob = await getAudio(id);
  if (!blob) throw new Error('Archivo no encontrado');
  return blob.arrayBuffer();
};
window.__engine = engine;
let state = null;

const say = msg => chrome.runtime.sendMessage({ to: 'ui', ...msg }).catch(() => {});
const now = () => ({ playing: engine.playing, left: engine.timerLeft() });
engine.on((key, status) => say({ type: 'status', key, status }));

chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (m.to !== 'audio') return;
  if (m.type === 'hello') return reply({ state, ...now() });
  if (m.state) { state = m.state; engine.apply(state); }
  if (m.type === 'play') engine.play();
  if (m.type === 'pause') engine.pause(m.fade);
  if (m.type === 'timer') engine.setTimer(m.seconds);
  if (m.type === 'forget') engine.forget(m.key);
  // tell the other windows, so they follow (the one that sent it already knows)
  say({ type: 'state', from: m.from, state, ...now() });
  reply({ ok: true, ...now() });
});

setInterval(() => say({ type: 'tick', ...now() }), 1000);
chrome.runtime.sendMessage({ to: 'bg', type: 'audio-ready' }).catch(() => {});
