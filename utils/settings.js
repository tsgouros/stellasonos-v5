const settings = { soundOn: true, hapticsOn: true };
const listeners = new Set();

export function getSettings() {
  return settings;
}

export function setSetting(key, value) {
  settings[key] = value;
  listeners.forEach((fn) => fn({ ...settings }));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}