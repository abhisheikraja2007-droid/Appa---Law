const DB_NAME = "DiligentInLawDB";
const DB_VERSION = 2;

let dbInstance = null;

export function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("drafts")) {
        const store = db.createObjectStore("drafts", { keyPath: "id", autoIncrement: true });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("title", "title", { unique: false });
      }
      if (!db.objectStoreNames.contains("receipts")) {
        const store = db.createObjectStore("receipts", { keyPath: "id", autoIncrement: true });
        store.createIndex("no", "no", { unique: true });
        store.createIndex("dt", "dt", { unique: false });
      }
      if (!db.objectStoreNames.contains("clients")) {
        const store = db.createObjectStore("clients", { keyPath: "id", autoIncrement: true });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("mobile", "mobile", { unique: false });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("ledger")) {
        const store = db.createObjectStore("ledger", { keyPath: "id", autoIncrement: true });
        store.createIndex("clientId", "clientId", { unique: false });
        store.createIndex("caseTitle", "caseTitle", { unique: false });
      }
      if (!db.objectStoreNames.contains("cases")) {
        const store = db.createObjectStore("cases", { keyPath: "id", autoIncrement: true });
        store.createIndex("cnrNumber", "cnrNumber", { unique: false });
        store.createIndex("nextHearingDate", "nextHearingDate", { unique: false });
        store.createIndex("courtName", "courtName", { unique: false });
      }
    };

    request.onsuccess = event => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = event => {
      reject(event.target.error);
    };
  });
}

function getStore(storeName, mode = "readonly") {
  return openDatabase().then(db => {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  });
}

export async function putItem(storeName, item) {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getItem(storeName, key) {
  const store = await getStore(storeName, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllItems(storeName) {
  const store = await getStore(storeName, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(storeName, key) {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName) {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deriveKey(passcode, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function exportEncryptedBackup(passcode) {
  const drafts = await getAllItems("drafts");
  const receipts = await getAllItems("receipts");
  const clients = await getAllItems("clients");
  const settings = await getAllItems("settings");
  const ledger = await getAllItems("ledger");
  const cases = await getAllItems("cases");

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { drafts, receipts, clients, settings, ledger, cases }
  };

  const rawJson = JSON.stringify(payload);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt);

  const enc = new TextEncoder();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(rawJson)
  );

  const output = {
    app: "DiligentInLaw",
    format: "AES-GCM",
    salt: Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join(""),
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join(""),
    ciphertext: Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")
  };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  return blob;
}

export async function importEncryptedBackup(fileBlob, passcode) {
  const text = await fileBlob.text();
  const parsed = JSON.parse(text);

  if (parsed.app !== "DiligentInLaw" || !parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error("Invalid .diligent backup file format.");
  }

  const salt = new Uint8Array(parsed.salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const iv = new Uint8Array(parsed.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const cipherBytes = new Uint8Array(parsed.ciphertext.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  const key = await deriveKey(passcode, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  const decryptedJson = dec.decode(decryptedBuffer);
  const payload = JSON.parse(decryptedJson);

  if (!payload.data) throw new Error("Backup file corrupted or empty.");

  const { drafts = [], receipts = [], clients = [], settings = [], ledger = [], cases = [] } = payload.data;

  for (const d of drafts) await putItem("drafts", d);
  for (const r of receipts) await putItem("receipts", r);
  for (const c of clients) await putItem("clients", c);
  for (const s of settings) await putItem("settings", s);
  for (const l of ledger) await putItem("ledger", l);
  for (const cs of cases) await putItem("cases", cs);

  return {
    draftsCount: drafts.length,
    receiptsCount: receipts.length,
    clientsCount: clients.length,
    settingsCount: settings.length,
    ledgerCount: ledger.length,
    casesCount: cases.length
  };
}

export async function migrateFromLocalStorage() {
  try {
    const rawDil1 = localStorage.getItem("dil1");
    if (rawDil1) {
      const existingSettings = await getItem("settings", "dil1");
      if (!existingSettings) {
        await putItem("settings", { key: "dil1", value: JSON.parse(rawDil1) });
      }
    }
    const rawDil5 = localStorage.getItem("dil5");
    if (rawDil5) {
      const parsed = JSON.parse(rawDil5);
      if (parsed.l && Array.isArray(parsed.l)) {
        for (const item of parsed.l) {
          const exists = await getItem("receipts", item.no);
          if (!exists) {
            await putItem("receipts", {
              no: item.no,
              nm: item.nm,
              am: item.am,
              dt: item.dt,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (e) {}
}
