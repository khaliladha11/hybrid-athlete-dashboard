/**
 * Satu titik pemberitahuan "ada perubahan lokal" untuk semua penulis localStorage
 * (`writeStored` di lib/preferences.ts dan log di lib/training-log.ts). Klien sinkron berlangganan di sini.
 * Penulisan hasil sinkron dibungkus `withoutLocalChange` supaya tidak dianggap perubahan pengguna.
 */
type Listener = (key: string) => void;

const listeners = new Set<Listener>();
let suppressed = 0;

export function onLocalChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitLocalChange(key: string) {
  if (suppressed) return;
  listeners.forEach((fn) => fn(key));
}

export function withoutLocalChange<T>(fn: () => T): T {
  suppressed++;
  try {
    return fn();
  } finally {
    suppressed--;
  }
}
