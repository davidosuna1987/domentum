// Inside the Chrome extension the sound plays in an offscreen document (see background.js and offscreen.js), so
// it goes on when the popup closes or the tab changes. This stands in for Engine in the player: the same calls,
// sent over to it, and what other windows of the extension change comes back through onRemote.
const ME = Math.random().toString(36).slice(2);
const plain = s => JSON.parse(JSON.stringify(s));

export class RemoteEngine {
  constructor() {
    this.listeners = new Set();
    this.playing = false;
    this.left = null;
    this.last = null;
    chrome.runtime.onMessage.addListener(m => {
      if (m.to !== 'ui') return;
      if (m.type === 'status') return this.listeners.forEach(fn => fn(m.key, m.status));
      const was = this.playing;
      this.playing = m.playing;
      this.left = m.left;
      if (m.type === 'state' && m.from !== ME) this.follow?.({ state: m.state, playing: m.playing });
      else if (was !== m.playing) this.follow?.({ playing: m.playing }); // e.g. paused from another window
    });
  }

  send(cmd) { return chrome.runtime.sendMessage({ to: 'bg', cmd: { ...cmd, from: ME } }).catch(() => null); }
  on(fn) { this.listeners.add(fn); }
  // fn adopts what another window changed; it is also called once with whatever is playing right now
  onRemote(fn) {
    this.follow = fn;
    this.send({ type: 'hello' }).then(r => { if (r?.state) { this.playing = r.playing; this.left = r.left; fn({ state: r.state, playing: r.playing }); } });
  }

  apply(state) { this.last = plain(state); this.send({ type: 'apply', state: this.last }); }
  play() { this.playing = true; this.send({ type: 'play', state: this.last }); }
  pause(fade) { this.playing = false; this.send({ type: 'pause', fade }); }
  setTimer(seconds) { this.left = seconds; this.send({ type: 'timer', seconds }); }
  timerLeft() { return this.left; }
  forget(key) { this.send({ type: 'forget', key }); }
}
