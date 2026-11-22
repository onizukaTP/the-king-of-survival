import type { SaveFile } from '../engine/save/save';

const DB_NAME = 'king-of-survival';
const STORE = 'saves';
// The one run (D-038). The key name dates from M0's manual slot; kept so older saves still load.
const SLOT = 'manual';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      // Resolve on commit, not on request success, so "Saved" means it's on disk.
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const writeSave = (save: SaveFile) => run('readwrite', (s) => s.put(save, SLOT)).then(() => undefined);
export const readSave = (): Promise<unknown> => run('readonly', (s) => s.get(SLOT));
export const deleteSave = () => run('readwrite', (s) => s.delete(SLOT)).then(() => undefined);
