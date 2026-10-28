// design/media-db.js — Lightweight IndexedDB storage for large assets (wallpapers, stage videos, animations).
// Bypasses the 5MB browser localStorage quota limit completely.

(function () {
  "use strict";

  const DB_NAME = "omp-desktop-media";
  const STORE_NAME = "assets";
  const DB_VERSION = 1;

  let dbPromise = null;

  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  const mediaDB = {
    async get(key) {
      try {
        const db = await getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch {
        return null;
      }
    },

    async set(key, value) {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);
          req.onsuccess = () => {
            window.dispatchEvent(new CustomEvent("omp:mediachange", { detail: { key, value } }));
            resolve(true);
          };
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn("[mediaDB] save failed:", err);
        return false;
      }
    },

    async del(key) {
      try {
        const db = await getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => {
            window.dispatchEvent(new CustomEvent("omp:mediachange", { detail: { key, value: null } }));
            resolve(true);
          };
          req.onerror = () => resolve(false);
        });
      } catch {
        return false;
      }
    }
  };

  window.mediaDB = mediaDB;
})();
