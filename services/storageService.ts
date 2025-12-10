import { NoteSession, AppStatus } from '../types';

const DB_NAME = 'SmartNoteDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is supported
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const loadNotesFromStorage = async (): Promise<NoteSession[] | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const result = request.result as any[];
        
        if (!result || result.length === 0) {
            resolve(null);
            return;
        }
        
        // Rehydrate attachments with URL.createObjectURL
        // This is crucial: we stored actual File objects, now we need to give them URLs for the UI
        const hydrated = result.map(note => ({
            ...note,
            // Restore attachments
            attachments: (note.attachments || []).map((att: any) => ({
                file: att.file,
                url: URL.createObjectURL(att.file),
                type: att.type
            })),
            // Ensure safe defaults
            status: note.status === AppStatus.PROCESSING ? AppStatus.IDLE : (note.status || AppStatus.IDLE),
            error: null,
            createdAt: note.createdAt || Date.now(),
            role: note.role || 'autosar',
            chatHistory: note.chatHistory || []
        }));
        
        // Sort by createdAt desc (Newest first)
        hydrated.sort((a: NoteSession, b: NoteSession) => b.createdAt - a.createdAt);
        
        resolve(hydrated);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IDB Load Error:", err);
    return null;
  }
};

export const saveNotesToStorage = async (notes: NoteSession[]): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Strategy: Clear and Bulk Put to keep data consistent (handling deletions)
        // Since we are replacing the entire local state representation
        store.clear();
        
        notes.forEach(note => {
            // Prepare object for storage
            const noteToSave = {
                ...note,
                status: note.status === AppStatus.PROCESSING ? AppStatus.IDLE : note.status,
                // Ensure attachments are stored as clean File objects (stripping the ephemeral blob: URL)
                attachments: note.attachments.map(att => ({
                    file: att.file,
                    type: att.type
                    // We DO NOT save 'url' here, it's generated on load
                }))
            };
            store.put(noteToSave);
        });
        
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => {
            console.error("IDB Transaction Error", tx.error);
            resolve(false);
        };
    });
  } catch (err) {
    console.error("IDB Save Error:", err);
    return false;
  }
};