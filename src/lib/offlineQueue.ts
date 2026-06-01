export type OfflineQueueKind = "meal-scan" | "laundry-scan";

export type OfflineQueueItem<T = unknown> = {
  id: string;
  kind: OfflineQueueKind;
  payload: T;
  createdAt: string;
  attempts: number;
};

const DB_NAME = "hams-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "actions";

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openQueueDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("Offline storage is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("kind", "kind");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline queue."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T> | void) {
  const db = await openQueueDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    transaction.oncomplete = () => {
      db.close();
      resolve(request ? request.result : undefined as T);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Offline queue transaction failed."));
    };
  });
}

export async function enqueueOfflineAction<T>(kind: OfflineQueueKind, payload: T) {
  const item: OfflineQueueItem<T> = {
    id: `${kind}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await withStore("readwrite", (store) => store.put(item));
  window.dispatchEvent(new CustomEvent("hams-offline-queue-changed"));
  return item;
}

export async function listOfflineActions(kind?: OfflineQueueKind) {
  const items = await withStore<OfflineQueueItem[]>("readonly", (store) => store.getAll());
  return (kind ? items.filter((item) => item.kind === kind) : items).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeOfflineAction(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new CustomEvent("hams-offline-queue-changed"));
}

export async function retryLater(item: OfflineQueueItem) {
  await withStore("readwrite", (store) => store.put({ ...item, attempts: item.attempts + 1 }));
  window.dispatchEvent(new CustomEvent("hams-offline-queue-changed"));
}

export async function countOfflineActions(kind?: OfflineQueueKind) {
  return (await listOfflineActions(kind)).length;
}

