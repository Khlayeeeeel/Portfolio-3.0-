// Large evidence images are kept in IndexedDB so a refresh does not have to
// re-fetch them with an already-consumed single-use token. localStorage keeps
// holding the small ones; everything is best-effort (private mode / disabled
// storage simply falls back to the in-memory cache and the unlock proof).
const DB_NAME = "igc-evidence";
const STORE_NAME = "images";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB unavailable"));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveEvidenceImage(id: number, dataUrl: string): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(dataUrl, String(id));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        /* storage disabled: the in-memory cache still works */
    }
}

export async function loadEvidenceImage(id: number): Promise<string | undefined> {
    try {
        const db = await openDb();
        const stored = await new Promise<string | undefined>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const request = tx.objectStore(STORE_NAME).get(String(id));
            request.onsuccess = () =>
                resolve(typeof request.result === "string" ? request.result : undefined);
            request.onerror = () => reject(request.error);
        });
        db.close();
        return stored;
    } catch {
        return undefined;
    }
}

/** Reset: remove cached images so the next team starts with no evidence. */
export async function clearEvidenceImages(): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        /* storage disabled: nothing to clear */
    }
}
