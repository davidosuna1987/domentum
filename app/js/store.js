const KEY = 'domentum:v1';

export function loadState(defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) return { ...defaults, ...saved, playing: false };
  } catch {}
  return defaults;
}

let saveT;
export function saveState(state) {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      const { playing, ...rest } = state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {}
  }, 250);
}

// ---- IndexedDB: the user's own audio files ----
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('domentum', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('audio');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('audio', mode);
    const out = fn(t.objectStore('audio'));
    t.oncomplete = () => res(out?.result);
    t.onerror = () => rej(t.error);
  });
}

export const putAudio = (id, blob) => tx('readwrite', s => s.put(blob, id));
export const getAudio = id => tx('readonly', s => s.get(id));
export const deleteAudio = id => tx('readwrite', s => s.delete(id));
