const DB_NAME = "stacklink-db";
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("categories")) {
        const store = db.createObjectStore("categories", { keyPath: "id" });
        store.createIndex("ownerId", "ownerId", { unique: false });
      }
      if (!db.objectStoreNames.contains("links")) {
        const store = db.createObjectStore("links", { keyPath: "id" });
        store.createIndex("ownerId", "ownerId", { unique: false });
        store.createIndex("categoryIds", "categoryIds", { multiEntry: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
