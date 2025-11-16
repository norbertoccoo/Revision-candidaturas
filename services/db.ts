import type { TableRow } from '../types';

const DB_NAME = 'CandidaturasDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const STATE_KEY = 'appState'; // Usar una clave única para todo el estado

export interface AppState {
    headers: string[];
    data: TableRow[];
    settings: {
        dates: { submissionDate: string; votingDate: string };
        unions: string[];
    };
    checkedState: Record<number, Record<string, boolean>>;
    fileName: string;
}

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject('Error al abrir la base de datos');
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
}

export async function saveState(state: AppState) {
    const store = await getStore('readwrite');
    // Guardar todo el objeto de estado bajo una única clave
    const request = store.put({ key: STATE_KEY, value: state });
    return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Error al guardar el estado:", request.error);
            reject(request.error);
        };
    });
}


export async function loadState(): Promise<AppState | null> {
    try {
        const store = await getStore('readonly');
        const request = store.get(STATE_KEY);
    
        return new Promise((resolve, reject) => {
            request.onerror = () => reject('Error al cargar el estado');
            request.onsuccess = () => {
                // El resultado será el objeto { key: STATE_KEY, value: state }
                if (request.result && request.result.value) {
                    resolve(request.result.value as AppState);
                } else {
                    resolve(null); // No se encontraron datos
                }
            };
        });
    } catch (e) {
        console.error("No se pudo acceder a IndexedDB", e);
        return null;
    }
}


export async function clearState(): Promise<void> {
    const store = await getStore('readwrite');
    const request = store.clear();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error al limpiar la base de datos');
    });
}