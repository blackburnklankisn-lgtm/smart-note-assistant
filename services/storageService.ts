import { NoteSession, AppStatus } from '../types';

const STORAGE_KEY = 'smart_note_data';

export const loadNotesFromStorage = (): NoteSession[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return null;

    return parsed.map((note: any) => ({
      ...note,
      // Reset status to IDLE if it was stuck in processing (e.g. browser closed during generation)
      status: note.status === AppStatus.PROCESSING ? AppStatus.IDLE : (note.status || AppStatus.IDLE),
      // Attachments (File objects) cannot be restored from JSON
      attachments: [], 
      // Ensure defaults for critical fields
      error: null,
      createdAt: note.createdAt || Date.now(),
      attachmentsCount: note.attachmentsCount || 0 // Optional: could track count even if files are lost
    }));
  } catch (error) {
    console.error("Failed to load notes from storage:", error);
    return null;
  }
};

export const saveNotesToStorage = (notes: NoteSession[]): boolean => {
  try {
    const cleanNotes = notes.map(note => ({
      id: note.id,
      title: note.title,
      inputText: note.inputText,
      result: note.result,
      status: note.status === AppStatus.PROCESSING ? AppStatus.IDLE : note.status,
      createdAt: note.createdAt,
      // We explicitly do not save attachments array as File objects are not serializable
      // We could save blobs but it would exceed localStorage limits quickly
      attachments: [], 
      error: null
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanNotes));
    return true;
  } catch (error) {
    console.error("Failed to save notes to storage:", error);
    return false;
  }
};
