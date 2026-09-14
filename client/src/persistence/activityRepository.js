const DB_NAME = "dashboard-garmin-analytics";
const DB_VERSION = 1;
const STORE = "activities";

export function createPersistenceEnvelope(detail, savedAt = new Date().toISOString()) {
  const activityUid = detail?.activity?.activityUid;
  if (!activityUid) throw new Error("Canonical activity requires activityUid before persistence");

  return {
    id: activityUid,
    schemaVersion: 1,
    savedAt,
    detail: structuredClone(detail),
  };
}

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, operation) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveCanonicalActivity(detail) {
  const envelope = createPersistenceEnvelope(detail);
  await withStore("readwrite", (store) => store.put(envelope));
  return envelope;
}

export async function getCanonicalActivity(activityUid) {
  const result = await withStore("readonly", (store) => store.get(activityUid));
  return result?.detail ?? null;
}

export async function listCanonicalActivities() {
  const records = await withStore("readonly", (store) => store.getAll());
  return (records ?? [])
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
    .map((record) => record.detail);
}

export async function deleteCanonicalActivity(activityUid) {
  await withStore("readwrite", (store) => store.delete(activityUid));
}
