import { create } from 'zustand';
import { NoteSession, AppStatus, ChatMessage, ImagePreview, NoteRole } from '../types';
import { loadNotesFromStorage, saveNotesToStorage } from '../services/storageService';
import { generateSmartNote, markdownToHtml, chatWithNote } from '../services/geminiService';
import { createNewNote, generateId, RESET_AI_STYLE } from '../utils/constants';

interface NoteStore {
  // State
  notes: NoteSession[];
  activeNoteId: string | null;
  isSidebarOpen: boolean;
  isChatOpen: boolean;
  isChatLoading: boolean;
  chatDraft: string;
  searchQuery: string;
  isStorageInitialized: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  deleteTargetId: string | null;
  showSettings: boolean;

  // Actions
  init: () => Promise<void>;
  setActiveNoteId: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
  setChatDraft: (text: string) => void;
  setShowSettings: (show: boolean) => void;
  setDeleteTargetId: (id: string | null) => void;

  addNote: () => void;
  updateActiveNote: (updates: Partial<NoteSession>) => void;
  deleteNote: () => void;
  duplicateNote: (id: string) => void;
  
  saveNotes: () => Promise<void>;
  
  generateNoteContent: () => Promise<void>;
  generateWeeklySummary: (isAutoTrigger?: boolean) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  clearChatHistory: () => void;
  
  addFilesToActiveNote: (files: File[]) => void;
  removeFileFromActiveNote: (index: number) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  // Initial State
  notes: [],
  activeNoteId: null,
  isSidebarOpen: false,
  isChatOpen: false,
  isChatLoading: false,
  chatDraft: '',
  searchQuery: '',
  isStorageInitialized: false,
  saveStatus: 'saved',
  deleteTargetId: null,
  showSettings: false,

  // --- Actions ---

  init: async () => {
    const savedNotes = await loadNotesFromStorage();
    if (savedNotes && savedNotes.length > 0) {
      set({ 
        notes: savedNotes, 
        activeNoteId: savedNotes[0].id, 
        isStorageInitialized: true 
      });
    } else {
      const newNote = createNewNote();
      set({ 
        notes: [newNote], 
        activeNoteId: newNote.id, 
        isStorageInitialized: true 
      });
      await saveNotesToStorage([newNote]);
    }
  },

  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  setChatDraft: (text) => set({ chatDraft: text }),
  setShowSettings: (show) => set({ showSettings: show }),
  setDeleteTargetId: (id) => set({ deleteTargetId: id }),

  addNote: () => {
    const newNote = createNewNote();
    const { notes } = get();
    const updatedNotes = [newNote, ...notes];
    
    set({ 
      notes: updatedNotes, 
      activeNoteId: newNote.id,
      searchQuery: '',
      isSidebarOpen: window.innerWidth >= 1024 // Close sidebar on mobile
    });
    
    get().saveNotes();
  },

  updateActiveNote: (updates) => {
    const { notes, activeNoteId } = get();
    if (!activeNoteId) return;

    const updatedNotes = notes.map(note => 
      note.id === activeNoteId ? { ...note, ...updates } : note
    );

    set({ notes: updatedNotes });
  },

  addFilesToActiveNote: (files) => {
    const { notes, activeNoteId } = get();
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const newPreviews: ImagePreview[] = files.map(file => {
      let type: 'image' | 'pdf' | 'audio' | 'doc' | 'sheet' | 'slide' | 'text' = 'image';
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (file.type === 'application/pdf') {
        type = 'pdf';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      } else if (ext === 'doc' || ext === 'docx') {
        type = 'doc';
      } else if (ext === 'xls' || ext === 'xlsx') {
        type = 'sheet';
      } else if (ext === 'ppt' || ext === 'pptx' || ext === 'potx') {
        type = 'slide';
      } else if (ext === 'txt') {
        type = 'text';
      }

      return {
        file,
        url: URL.createObjectURL(file),
        type
      };
    });

    get().updateActiveNote({ attachments: [...activeNote.attachments, ...newPreviews] });
  },

  removeFileFromActiveNote: (index) => {
    const { notes, activeNoteId } = get();
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.attachments[index]) return;

    URL.revokeObjectURL(activeNote.attachments[index].url);
    const newAttachments = [...activeNote.attachments];
    newAttachments.splice(index, 1);
    get().updateActiveNote({ attachments: newAttachments });
  },

  saveNotes: async () => {
    set({ saveStatus: 'saving' });
    const { notes } = get();
    const success = await saveNotesToStorage(notes);
    set({ saveStatus: success ? 'saved' : 'error' });
  },

  deleteNote: () => {
    const { deleteTargetId, notes, activeNoteId } = get();
    if (!deleteTargetId) return;

    const newNotes = notes.filter(n => n.id !== deleteTargetId);
    
    if (newNotes.length === 0) {
      const freshNote = createNewNote();
      set({ 
        notes: [freshNote], 
        activeNoteId: freshNote.id, 
        deleteTargetId: null 
      });
      saveNotesToStorage([freshNote]);
      return;
    }

    let nextActiveId = activeNoteId;
    if (activeNoteId === deleteTargetId) {
      const deletedIndex = notes.findIndex(n => n.id === deleteTargetId);
      const newActiveIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
      nextActiveId = newNotes[Math.min(newActiveIndex, newNotes.length - 1)].id;
    }

    set({ 
      notes: newNotes, 
      activeNoteId: nextActiveId, 
      deleteTargetId: null 
    });
    
    saveNotesToStorage(newNotes);
  },

  duplicateNote: (id) => {
    const { notes } = get();
    const noteToCopy = notes.find(n => n.id === id);
    if (!noteToCopy) return;

    const newNote: NoteSession = {
      ...noteToCopy,
      id: generateId(),
      title: noteToCopy.title ? `${noteToCopy.title} (Copy)` : 'Untitled Copy',
      createdAt: Date.now(),
      status: AppStatus.IDLE,
      error: null,
      attachments: noteToCopy.attachments.map(att => ({
        ...att,
        url: URL.createObjectURL(att.file)
      })),
      chatHistory: [] 
    };

    const updatedNotes = [newNote, ...notes];
    set({ notes: updatedNotes });
    saveNotesToStorage(updatedNotes);
  },

  generateNoteContent: async () => {
    const { notes, activeNoteId } = get();
    const activeNote = notes.find(n => n.id === activeNoteId);
    
    if (!activeNote || activeNote.status === AppStatus.PROCESSING) return;

    get().updateActiveNote({ status: AppStatus.PROCESSING, error: null });

    try {
      const files = activeNote.attachments.map(p => p.file);
      const markdown = await generateSmartNote(activeNote.inputText, files, activeNote.role);
      const aiHtml = markdownToHtml(markdown);
      
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const separator = `<br/><br/><hr style="margin: 2em 0; border: 0; border-top: 2px dashed #e2e8f0;"/><h2 style="color: #2563eb; font-size: 1.25em;">✨ Smart Note Update (${timestamp})</h2><br/>`;
      const styledAiHtml = `<div style="${RESET_AI_STYLE}">${aiHtml}</div>`;
      
      const newContent = activeNote.inputText + separator + styledAiHtml;

      const updatedNote = {
        ...activeNote,
        inputText: newContent,
        result: { markdown, timestamp: Date.now() },
        status: AppStatus.SUCCESS,
        title: activeNote.title || "Smart Note " + new Date().toLocaleDateString()
      };

      const updatedNotes = get().notes.map(n => n.id === activeNoteId ? updatedNote : n);
      set({ notes: updatedNotes });
      
      await saveNotesToStorage(updatedNotes);
      
    } catch (err: any) {
      console.error(err);
      get().updateActiveNote({
        status: AppStatus.ERROR,
        error: err.message || "An unexpected error occurred."
      });
    }
  },

  generateWeeklySummary: async (isAutoTrigger = false) => {
    set({ searchQuery: '' });
    
    const now = new Date();
    const day = now.getDay(); 
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1); 
    
    const monday = new Date(now);
    monday.setDate(diffToMon);
    monday.setHours(0,0,0,0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23,59,59,999);

    const { notes } = get();
    const weeklyNotes = notes.filter(n => {
      const noteDate = new Date(n.createdAt);
      return noteDate >= monday && noteDate <= friday && n.title !== 'Weekly Summary'; 
    });

    if (weeklyNotes.length === 0) {
      if (!isAutoTrigger) alert("No notes found for this week (Mon-Fri).");
      return;
    }

    let aggregatedContent = `
    <h1>Weekly Notes Aggregation (${monday.toLocaleDateString()} - ${friday.toLocaleDateString()})</h1>
    <p>Please summarize the following notes created this week:</p>
    <hr/>
    `;

    weeklyNotes.forEach(n => {
      let contentToUse = n.inputText;
      const separatorMarker = '<hr style="margin: 2em 0; border: 0; border-top: 2px dashed #e2e8f0;"/>';
      const splitIndex = contentToUse.indexOf(separatorMarker);
      
      if (splitIndex !== -1) {
        contentToUse = contentToUse.substring(0, splitIndex);
      }
      
      aggregatedContent += `
        <h3>Date: ${new Date(n.createdAt).toLocaleDateString()} - Title: ${n.title || 'Untitled'}</h3>
        <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-bottom: 20px;">
          ${contentToUse}
        </div>
        <hr/>
      `;
    });

    const summaryNote = createNewNote('Weekly Summary');
    summaryNote.role = 'weekly';
    summaryNote.status = AppStatus.PROCESSING;
    summaryNote.inputText = `<p class="text-slate-400 italic">🤖 Analyzing your notes and generating Weekly Summary...</p>`; 

    const updatedNotes = [summaryNote, ...notes];
    set({ 
      notes: updatedNotes, 
      activeNoteId: summaryNote.id,
      isSidebarOpen: window.innerWidth >= 1024 
    });

    try {
      const markdown = await generateSmartNote(aggregatedContent, [], 'weekly');
      const aiHtml = markdownToHtml(markdown);
      const styledAiHtml = `<div style="${RESET_AI_STYLE}">${aiHtml}</div>`;

      const updatedSummaryNote = {
        ...summaryNote,
        result: { markdown, timestamp: Date.now() },
        status: AppStatus.SUCCESS,
        inputText: styledAiHtml
      };

      const finalNotes = get().notes.map(n => n.id === summaryNote.id ? updatedSummaryNote : n);
      set({ notes: finalNotes });
      await saveNotesToStorage(finalNotes);
      
    } catch (error: any) {
      console.error("Weekly Summary Failed", error);
      const failedNotes = get().notes.map(n => n.id === summaryNote.id ? { ...n, status: AppStatus.ERROR, error: error.message } : n);
      set({ notes: failedNotes });
    }
  },

  sendChatMessage: async (text) => {
    set({ isChatLoading: true });
    const { notes, activeNoteId } = get();
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const newUserMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    const updatedHistory = [...activeNote.chatHistory, newUserMsg];
    get().updateActiveNote({ chatHistory: updatedHistory });

    try {
      const files = activeNote.attachments.map(p => p.file);
      const responseText = await chatWithNote(
        activeNote.inputText,
        files,
        activeNote.chatHistory, 
        text,
        activeNote.role
      );

      const newAiMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      get().updateActiveNote({ chatHistory: [...updatedHistory, newAiMsg] });

    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: "Sorry, I encountered an error: " + error.message,
        timestamp: Date.now(),
        isError: true
      };
      get().updateActiveNote({ chatHistory: [...updatedHistory, errorMsg] });
    } finally {
      set({ isChatLoading: false });
    }
  },

  clearChatHistory: () => {
    get().updateActiveNote({ chatHistory: [] });
  }

}));