// The extension's background: it keeps the one offscreen document where the sound plays (so it goes on
// when the popup closes or you change tabs) and passes the player's commands on to it.
let creating = null;
let ready = null;

async function ensureOffscreen() {
  const open = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (open.length) return;
  if (!creating) {
    let done;
    ready = new Promise(r => { done = r; setTimeout(r, 4000); });
    ready.done = done;
    creating = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Plays the ambient sounds while the popup is closed and across tabs.',
    }).finally(() => { creating = null; });
  }
  await creating;
  await ready; // until its script listens
}

chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (m.to === 'bg' && m.type === 'audio-ready') { ready?.done?.(); return; }
  if (m.to !== 'bg' || !m.cmd) return;
  ensureOffscreen()
    .then(() => chrome.runtime.sendMessage({ ...m.cmd, to: 'audio' }))
    .then(reply, e => reply({ error: String(e) }));
  return true; // the reply comes later
});
