import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputSection } from './components/InputSection';
import { generateSmartNote, markdownToHtml, chatWithNote } from './services/geminiService';
import { AppStatus, NoteSession, ImagePreview, ChatMessage } from './types';
import { loadNotesFromStorage, saveNotesToStorage } from './services/storageService';
import { ChatPanel } from './components/ChatPanel';
import { 
  BrainCircuit, Plus, FileText, ChevronRight, Menu, X, MessageSquarePlus,
  Loader2, CheckCircle2, AlertCircle, Trash2, AlertTriangle, Search, GripVertical,
  Copy, Settings, CalendarClock, MessageCircleQuestion
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// CSS variables to reset AI content to standard black/slate colors, 
// overriding the orange defaults of the editor.
const RESET_AI_STYLE = `
  color: #1e293b; 
  --tw-prose-body: #334155; 
  --tw-prose-headings: #1e293b; 
  --tw-prose-lead: #475569; 
  --tw-prose-bold: #1e293b; 
  --tw-prose-counters: #64748b; 
  --tw-prose-bullets: #334155; 
  --tw-prose-hr: #e2e8f0; 
  --tw-prose-quotes: #1e293b; 
  --tw-prose-quote-borders: #e2e8f0; 
  --tw-prose-captions: #64748b; 
  --tw-prose-code: #1e293b; 
  --tw-prose-pre-code: #e2e8f0; 
  --tw-prose-pre-bg: #1e293b; 
  --tw-prose-th-borders: #e2e8f0; 
  --tw-prose-td-borders: #e2e8f0;
`.replace(/\n/g, ' ');

const createNewNote = (title: string = ''): NoteSession => {
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0') + ' ' + 
    String(now.getHours()).padStart(2, '0') + ':' + 
    String(now.getMinutes()).padStart(2, '0') + ':' + 
    String(now.getSeconds()).padStart(2, '0');

  return {
    id: generateId(),
    title: title,
    // Automatically insert date and time styled as metadata
    inputText: `<p style="color: #94a3b8; font-size: 0.9em;">📅 ${dateStr}</p><p><br/></p>`,
    attachments: [],
    result: null,
    status: AppStatus.IDLE,
    error: null,
    createdAt: Date.now(),
    role: 'autosar', // Default role
    chatHistory: [] // Init chat history
  };
};

const App: React.FC = () => {
  // State initialization
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);
  const [notes, setNotes] = useState<NoteSession[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Chat Panel State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatDraft, setChatDraft] = useState<string>(''); 

  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Ref to hold current notes for the scheduler to access without adding notes to dependency array
  const notesRef = useRef(notes);

  // ASYNC INITIALIZATION: Load notes from IndexedDB
  useEffect(() => {
    const initApp = async () => {
      const savedNotes = await loadNotesFromStorage();
      
      if (savedNotes && savedNotes.length > 0) {
        setNotes(savedNotes);
        setActiveNoteId(savedNotes[0].id);
      } else {
        // First time user or empty DB
        const newNote = createNewNote();
        setNotes([newNote]);
        setActiveNoteId(newNote.id);
        // Save the default note immediately
        saveNotesToStorage([newNote]);
      }
      
      setIsStorageInitialized(true);
    };

    initApp();
  }, []);

  // Update ref whenever notes change
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Load API Key on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKeyInput(storedKey);
  }, []);

  // Auto-save effect: Triggers 2 seconds after the last change to 'notes'
  useEffect(() => {
    if (!isStorageInitialized || notes.length === 0) return;
    
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const success = await saveNotesToStorage(notes);
      setSaveStatus(success ? 'saved' : 'error');
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes, isStorageInitialized]);

  // Ensure activeNote is valid
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  // Handle Resizing Logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        // Set constraints: Min 200px, Max 600px
        if (newWidth >= 200 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, resize, stopResizing]);

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const keywords = query.split(/\s+/).filter(k => k.length > 0);
    const title = (note.title || '').toLowerCase();
    const content = (note.inputText || '').toLowerCase();
    const generated = (note.result?.markdown || '').toLowerCase();
    
    return keywords.every(keyword => 
      title.includes(keyword) || 
      content.includes(keyword) || 
      generated.includes(keyword)
    );
  });

  const updateActiveNote = (updates: Partial<NoteSession>) => {
    setNotes(prev => prev.map(note => 
      note.id === activeNoteId ? { ...note, ...updates } : note
    ));
  };

  const handleAddNote = async () => {
    setSearchQuery('');
    const newNote = createNewNote();
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    // Immediate save trigger (async)
    saveNotesToStorage([newNote, ...notes]);
  };

  const handleWeeklySummary = async (isAutoTrigger = false) => {
    setSearchQuery('');
    
    const now = new Date();
    const day = now.getDay(); 
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1); 
    
    const monday = new Date(now);
    monday.setDate(diffToMon);
    monday.setHours(0,0,0,0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23,59,59,999);

    const currentNotes = notesRef.current;
    const weeklyNotes = currentNotes.filter(n => {
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

    setNotes(prev => [summaryNote, ...prev]);
    setActiveNoteId(summaryNote.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const markdown = await generateSmartNote(aggregatedContent, [], 'weekly');
      const aiHtml = markdownToHtml(markdown);
      const styledAiHtml = `<div style="${RESET_AI_STYLE}">${aiHtml}</div>`;

      // Update local state with result
      const updatedSummaryNote = {
        ...summaryNote,
        result: { markdown, timestamp: Date.now() },
        status: AppStatus.SUCCESS,
        inputText: styledAiHtml
      };

      setNotes(prev => prev.map(n => n.id === summaryNote.id ? updatedSummaryNote : n));
      
      // Save updated state
      saveNotesToStorage([updatedSummaryNote, ...notesRef.current]);
      
    } catch (error: any) {
      console.error("Weekly Summary Failed", error);
      setNotes(prev => prev.map(n => n.id === summaryNote.id ? { ...n, status: AppStatus.ERROR, error: error.message } : n));
    }
  };

  // Scheduler
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      if (now.getDay() === 5 && now.getHours() === 17 && now.getMinutes() === 0) {
        const lastRunKey = 'last_auto_weekly_summary_date';
        const lastRunDate = localStorage.getItem(lastRunKey);
        const todayStr = now.toDateString();

        if (lastRunDate !== todayStr) {
          console.log("Triggering Auto Weekly Summary...");
          handleWeeklySummary(true);
          localStorage.setItem(lastRunKey, todayStr);
        }
      }
    };

    const intervalId = setInterval(checkTime, 30000); 
    return () => clearInterval(intervalId);
  }, []);

  const handleDuplicateNote = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const noteToCopy = notes.find(n => n.id === noteId);
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
    
    setNotes(prev => [newNote, ...prev]);
    saveNotesToStorage([newNote, ...notes]);
  };

  const requestDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTargetId(noteId);
  };

  const confirmDeleteNote = () => {
    if (!deleteTargetId) return;
    const noteId = deleteTargetId;
    const newNotes = notes.filter(n => n.id !== noteId);
    
    if (newNotes.length === 0) {
      const freshNote = createNewNote();
      setNotes([freshNote]);
      setActiveNoteId(freshNote.id);
      saveNotesToStorage([freshNote]);
      setDeleteTargetId(null);
      return;
    }

    if (activeNoteId === noteId) {
      const deletedIndex = notes.findIndex(n => n.id === noteId);
      let newActiveIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
      if (newActiveIndex >= newNotes.length) {
        newActiveIndex = newNotes.length - 1;
      }
      setActiveNoteId(newNotes[newActiveIndex].id);
    }

    setNotes(newNotes);
    saveNotesToStorage(newNotes);
    setDeleteTargetId(null);
  };

  const handleManualSave = async () => {
    setSaveStatus('saving');
    const success = await saveNotesToStorage(notes);
    setSaveStatus(success ? 'saved' : 'error');
  };
  
  const handleSaveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.trim());
    setShowSettings(false);
  };

  const handleSwitchNote = (id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleGenerate = async () => {
    if (activeNote.status === AppStatus.PROCESSING) return;

    updateActiveNote({ status: AppStatus.PROCESSING, error: null });

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
        result: {
            markdown,
            timestamp: Date.now()
        },
        status: AppStatus.SUCCESS,
        title: activeNote.title || "Smart Note " + new Date().toLocaleDateString()
      };

      setNotes(prev => prev.map(n => n.id === activeNoteId ? updatedNote : n));
      
      // Immediate save
      saveNotesToStorage(notes.map(n => n.id === activeNoteId ? updatedNote : n));
      
    } catch (err: any) {
      console.error(err);
      updateActiveNote({
        status: AppStatus.ERROR,
        error: err.message || "An unexpected error occurred."
      });
    }
  };

  const handleSendChatMessage = async (text: string) => {
    setIsChatLoading(true);
    const newUserMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    const updatedHistory = [...activeNote.chatHistory, newUserMsg];
    updateActiveNote({ chatHistory: updatedHistory });

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

      updateActiveNote({ chatHistory: [...updatedHistory, newAiMsg] });

    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: "Sorry, I encountered an error: " + error.message,
        timestamp: Date.now(),
        isError: true
      };
      updateActiveNote({ chatHistory: [...updatedHistory, errorMsg] });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Clear chat history?")) {
        updateActiveNote({ chatHistory: [] });
    }
  };

  const handleChatWithSelection = (text: string) => {
    setIsChatOpen(true);
    setChatDraft(`> ${text}\n\n`);
  };

  const handleAddFiles = (newFiles: File[]) => {
    const newPreviews: ImagePreview[] = newFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type === 'application/pdf' ? 'pdf' : 'image'
    }));
    
    updateActiveNote({
      attachments: [...activeNote.attachments, ...newPreviews]
    });
  };

  const handleRemoveFile = (index: number) => {
    if (activeNote.attachments[index]) {
        URL.revokeObjectURL(activeNote.attachments[index].url);
        const newAttachments = [...activeNote.attachments];
        newAttachments.splice(index, 1);
        updateActiveNote({ attachments: newAttachments });
    }
  };

  useEffect(() => {
    return () => {
      notes.forEach(note => {
        note.attachments.forEach(att => URL.revokeObjectURL(att.url));
      });
    };
  }, []);

  // --- RENDER LOADING SCREEN ---
  if (!isStorageInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <Loader2 size={40} className="animate-spin text-blue-500" />
           <p className="font-medium animate-pulse">Loading your Smart Notes...</p>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  // Ensure activeNote exists to prevent crashes if ID mismatch occurred
  if (!activeNote) {
     return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container with Resize Support */}
      <div 
        className="relative flex-shrink-0 z-40 lg:z-auto transition-transform lg:transition-none"
        style={{
          width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : '18rem',
        }}
      >
        <aside 
          ref={sidebarRef}
          className={`
            fixed inset-y-0 left-0 w-72 lg:w-full bg-white border-r border-slate-200 
            transform transition-transform duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:relative lg:translate-x-0 lg:h-full
          `}
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between h-20">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xl tracking-tight">
              <BrainCircuit size={28} />
              <span className="truncate">Smart Note</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-5 pb-2 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <button 
              onClick={handleAddNote}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 group"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              New Note
            </button>

            <button 
              onClick={() => handleWeeklySummary(false)}
              className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
              title="Generate summary for this week's notes"
            >
              <CalendarClock size={16} />
              Weekly Summary
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1 mt-2">
            {filteredNotes.length === 0 && searchQuery && (
              <div className="text-center text-slate-400 text-sm py-8 px-4">
                No notes found matching "{searchQuery}"
              </div>
            )}
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleSwitchNote(note.id)}
                className={`group w-full text-left p-3.5 rounded-xl text-sm flex items-start gap-3 transition-all duration-200 border cursor-pointer relative ${
                  activeNoteId === note.id 
                    ? 'bg-blue-50/50 text-blue-700 border-blue-100 shadow-sm' 
                    : 'hover:bg-slate-50 text-slate-600 border-transparent'
                }`}
              >
                {note.title === 'Weekly Summary' ? (
                   <CalendarClock size={18} className={`mt-0.5 flex-shrink-0 ${activeNoteId === note.id ? 'text-indigo-500' : 'text-indigo-400'}`} />
                ) : (
                   <FileText size={18} className={`mt-0.5 flex-shrink-0 ${activeNoteId === note.id ? 'text-blue-500' : 'text-slate-400'}`} />
                )}
                
                <div className="flex-1 min-w-0 pr-14">
                  <div className={`font-semibold truncate ${activeNoteId === note.id ? 'text-slate-900' : 'text-slate-700'}`}>
                    {note.title || "Untitled Note"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate font-medium">
                    {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                
                {/* Quick Actions (Duplicate / Delete) */}
                <div className={`
                    absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1
                    transition-opacity duration-200 z-20
                    ${activeNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}>
                  <button
                    onClick={(e) => handleDuplicateNote(e, note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white/50 backdrop-blur-sm"
                    title="Duplicate Note"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={(e) => requestDeleteNote(e, note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors bg-white/50 backdrop-blur-sm"
                    title="Delete Note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Area with Settings */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="w-full py-2 px-3 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-xs shadow-sm"
            >
              <Settings size={14} />
              Settings (API Key)
            </button>

            <div className={`flex items-center justify-center gap-1.5 transition-colors text-xs font-medium ${saveStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
              {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle2 size={12} />}
              {saveStatus === 'error' && <AlertCircle size={12} />}
              <span>
                {saveStatus === 'saving' ? 'Saving...' : 
                 saveStatus === 'saved' ? 'Synced to storage' : 'Save failed'}
              </span>
            </div>
            <div className="text-[10px] text-slate-300 text-center">Powered by Gemini 2.5</div>
          </div>
        </aside>

        {/* Resizer Handle */}
        <div
          className={`hidden lg:flex w-2 absolute top-0 right-0 bottom-0 z-50 cursor-col-resize items-center justify-center hover:bg-blue-500/10 transition-colors group ${isResizing ? 'bg-blue-500/10' : ''}`}
          style={{ transform: 'translateX(50%)' }}
          onMouseDown={startResizing}
        >
          <div className={`w-0.5 h-8 bg-slate-300 rounded-full group-hover:bg-blue-400 transition-colors ${isResizing ? 'bg-blue-500' : ''}`} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 lg:hidden">
              <Menu size={24} />
            </button>
            <span className="font-semibold text-slate-800 truncate max-w-[200px] lg:max-w-none">
              {activeNote.title || "Untitled Note"}
            </span>
          </div>
          <div className="flex items-center gap-1">
             <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'}`}
                title="Chat with Note"
             >
                <MessageCircleQuestion size={22} />
             </button>
             <button onClick={handleManualSave} className="text-blue-600 p-2 lg:hidden">
                <CheckCircle2 size={22} />
             </button>
          </div>
        </header>

        {/* Content Container (Split View for Chat) */}
        <main className="flex-1 flex overflow-hidden bg-slate-100/50 relative">
          
          {/* Note Editor Area */}
          <div className="flex-1 h-full min-h-0 w-full overflow-visible p-0 lg:p-6 transition-all">
            <div className="h-full w-full mx-auto flex flex-col items-center">
               <InputSection 
                 key={activeNote.id}
                 title={activeNote.title}
                 text={activeNote.inputText}
                 previews={activeNote.attachments}
                 status={activeNote.status}
                 searchQuery={searchQuery}
                 role={activeNote.role}
                 onChangeTitle={(t) => updateActiveNote({ title: t })}
                 onChangeText={(t) => updateActiveNote({ inputText: t })}
                 onRoleChange={(r) => updateActiveNote({ role: r })}
                 onAddFiles={handleAddFiles}
                 onRemoveFile={handleRemoveFile}
                 onGenerate={handleGenerate}
                 onSave={handleManualSave}
                 onChatSelection={handleChatWithSelection}
               />
               
               {activeNote.error && (
                 <div className="absolute bottom-6 left-6 right-6 lg:left-12 lg:right-auto lg:max-w-md z-30">
                   <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 animate-fade-in">
                     <div className="mt-0.5 font-bold">Error:</div>
                     <div className="text-sm">{activeNote.error}</div>
                     <button onClick={() => updateActiveNote({error: null})} className="ml-auto text-red-400 hover:text-red-700"><X size={16}/></button>
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* Chat Panel (Right Sidebar) */}
          {isChatOpen && (
            <div className="absolute right-0 top-0 bottom-0 z-50 lg:static lg:z-auto h-full animate-in slide-in-from-right-10 duration-200">
               <ChatPanel 
                 history={activeNote.chatHistory || []}
                 isLoading={isChatLoading}
                 onSendMessage={handleSendChatMessage}
                 onClose={() => setIsChatOpen(false)}
                 onClearHistory={handleClearChat}
                 draftMessage={chatDraft}
               />
            </div>
          )}

        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="flex flex-col items-center text-center">
                 <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Note?</h3>
                 <p className="text-slate-500 text-sm mb-6">
                   Are you sure you want to delete this note? This action cannot be undone and the content will be permanently lost.
                 </p>
                 <div className="flex w-full gap-3">
                    <button 
                      onClick={() => setDeleteTargetId(null)}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDeleteNote}
                      className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm shadow-red-200"
                    >
                      Delete
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
             <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
               <Settings className="text-blue-600" />
               Settings
             </h3>
             
             <div className="mb-4">
               <label className="block text-sm font-medium text-slate-700 mb-1">Google Gemini API Key</label>
               <input 
                 type="password" 
                 value={apiKeyInput}
                 onChange={(e) => setApiKeyInput(e.target.value)}
                 placeholder="AIzaSy..."
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
               />
               <p className="text-xs text-slate-500 mt-2">
                 The API Key is stored locally in your browser/app storage.
                 <br/>
                 Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>.
               </p>
             </div>

             <div className="flex justify-end gap-3">
               <button 
                 onClick={() => setShowSettings(false)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSaveSettings}
                 className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm"
               >
                 Save Configuration
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;