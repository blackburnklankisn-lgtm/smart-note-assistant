import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputSection } from './components/InputSection';
import { generateSmartNote, markdownToHtml } from './services/geminiService';
import { AppStatus, NoteSession, ImagePreview } from './types';
import { loadNotesFromStorage, saveNotesToStorage } from './services/storageService';
import { 
  BrainCircuit, Plus, FileText, ChevronRight, Menu, X, MessageSquarePlus,
  Loader2, CheckCircle2, AlertCircle, Trash2, AlertTriangle, Search, GripVertical
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const createNewNote = (): NoteSession => ({
  id: generateId(),
  title: '',
  inputText: '',
  attachments: [],
  result: null,
  status: AppStatus.IDLE,
  error: null,
  createdAt: Date.now(),
});

const App: React.FC = () => {
  // Initialize state from local storage or create a default note
  const [notes, setNotes] = useState<NoteSession[]>(() => {
    const saved = loadNotesFromStorage();
    return saved && saved.length > 0 ? saved : [createNewNote()];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(288); // Default 288px (w-72)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Ensure activeNote is always valid, fallback to first note if ID not found
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  // Auto-save effect: Triggers 2 seconds after the last change to 'notes'
  useEffect(() => {
    if (notes.length === 0) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const success = saveNotesToStorage(notes);
      setSaveStatus(success ? 'saved' : 'error');
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes]);

  // Ensure activeNoteId is valid when notes change
  useEffect(() => {
    if (!notes.find(n => n.id === activeNoteId)) {
      if (notes.length > 0) {
        setActiveNoteId(notes[0].id);
      } else {
        // If all notes were deleted (should be handled in delete handler, but as safeguard)
        const newNote = createNewNote();
        setNotes([newNote]);
        setActiveNoteId(newNote.id);
      }
    }
  }, [notes, activeNoteId]);

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
      // Disable text selection while dragging
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
    
    const titleMatch = (note.title || '').toLowerCase().includes(query);
    const contentMatch = (note.inputText || '').toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  const updateActiveNote = (updates: Partial<NoteSession>) => {
    setNotes(prev => prev.map(note => 
      note.id === activeNoteId ? { ...note, ...updates } : note
    ));
  };

  const handleAddNote = () => {
    setSearchQuery(''); // Clear search so the new note is visible
    const newNote = createNewNote();
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    // Immediate save
    saveNotesToStorage([newNote, ...notes]);
  };

  const requestDeleteNote = (e: React.MouseEvent, noteId: string) => {
    // Strictly stop propagation to prevent the row click handler from firing
    e.preventDefault();
    e.stopPropagation();
    setDeleteTargetId(noteId);
  };

  const confirmDeleteNote = () => {
    if (!deleteTargetId) return;
    const noteId = deleteTargetId;

    // 1. Determine the new list of notes
    const newNotes = notes.filter(n => n.id !== noteId);
    
    // 2. Handle empty state: If last note deleted, create a fresh one
    if (newNotes.length === 0) {
      const freshNote = createNewNote();
      setNotes([freshNote]);
      setActiveNoteId(freshNote.id);
      saveNotesToStorage([freshNote]);
      setDeleteTargetId(null);
      return;
    }

    // 3. Update active note if we deleted the current one
    if (activeNoteId === noteId) {
      // Find index of the deleted note in the original list
      const deletedIndex = notes.findIndex(n => n.id === noteId);
      
      // Try to go to the previous note (above), otherwise go to the next (below/first)
      // Adjust index to be valid in the new array
      let newActiveIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
      
      // Ensure bounds safety
      if (newActiveIndex >= newNotes.length) {
        newActiveIndex = newNotes.length - 1;
      }
      
      setActiveNoteId(newNotes[newActiveIndex].id);
    }

    // 4. Update state and force save
    setNotes(newNotes);
    saveNotesToStorage(newNotes);
    setDeleteTargetId(null);
  };

  const handleManualSave = () => {
    setSaveStatus('saving');
    const success = saveNotesToStorage(notes);
    setTimeout(() => {
      setSaveStatus(success ? 'saved' : 'error');
    }, 500);
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
      // Extract raw files from previews
      const files = activeNote.attachments.map(p => p.file);
      const markdown = await generateSmartNote(activeNote.inputText, files);
      
      // Convert Markdown to HTML for the editor
      const aiHtml = markdownToHtml(markdown);
      
      // Append to current text with a separator and timestamp versioning
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const separator = `<br/><br/><hr style="margin: 2em 0; border: 0; border-top: 2px dashed #e2e8f0;"/><h2 style="color: #2563eb; font-size: 1.25em;">✨ Smart Note Update (${timestamp})</h2><br/>`;
      const newContent = activeNote.inputText + separator + aiHtml;

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

      // Update state manually to ensure immediate sync for save
      setNotes(prev => prev.map(n => n.id === activeNoteId ? updatedNote : n));
      
      // Trigger an immediate save after generation
      saveNotesToStorage(notes.map(n => n.id === activeNoteId ? updatedNote : n));
      
    } catch (err: any) {
      console.error(err);
      updateActiveNote({
        status: AppStatus.ERROR,
        error: err.message || "An unexpected error occurred."
      });
    }
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

          <div className="p-5 pb-2">
            {/* Search Bar */}
            <div className="relative mb-4">
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
                <FileText size={18} className={`mt-0.5 flex-shrink-0 ${activeNoteId === note.id ? 'text-blue-500' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0 pr-6">
                  <div className={`font-semibold truncate ${activeNoteId === note.id ? 'text-slate-900' : 'text-slate-700'}`}>
                    {note.title || "Untitled Note"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate font-medium">
                    {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => requestDeleteNote(e, note.id)}
                  className={`
                      absolute right-2 top-1/2 -translate-y-1/2 p-2 
                      rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 
                      transition-all z-20
                      opacity-0 group-hover:opacity-100 focus:opacity-100
                      ${activeNoteId === note.id ? 'opacity-100' : ''}
                  `}
                  title="Delete Note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 text-center font-medium flex flex-col gap-2">
            <div className={`flex items-center justify-center gap-1.5 transition-colors ${saveStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
              {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle2 size={12} />}
              {saveStatus === 'error' && <AlertCircle size={12} />}
              <span>
                {saveStatus === 'saving' ? 'Saving...' : 
                 saveStatus === 'saved' ? 'Synced to storage' : 'Save failed'}
              </span>
            </div>
            <div>Powered by Gemini 2.5</div>
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
        <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
              <Menu size={24} />
            </button>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {activeNote.title || "Untitled Note"}
            </span>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={handleManualSave} className="text-blue-600 p-2">
                <CheckCircle2 size={22} />
             </button>
             <button onClick={handleAddNote} className="text-slate-600 p-2">
               <MessageSquarePlus size={24} />
             </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-hidden bg-slate-100/50 p-0 lg:p-6">
          {/* Removed max-w-5xl restriction to allow larger resizing */}
          <div className="h-full w-full mx-auto flex flex-col items-center">
            
            {/* Input Section (Document Editor) */}
            <div className="flex-1 h-full min-h-0 w-full overflow-visible">
               {/* 
                  KEY PROP IS CRITICAL: 
                  It forces React to fully unmount the old editor and mount a new one 
                  whenever the activeNote.id changes. This ensures that when a note is 
                  deleted and we switch to the next one, the editor DOES NOT hold onto 
                  stale content from the deleted note.
               */}
               <InputSection 
                 key={activeNote.id}
                 title={activeNote.title}
                 text={activeNote.inputText}
                 previews={activeNote.attachments}
                 status={activeNote.status}
                 onChangeTitle={(t) => updateActiveNote({ title: t })}
                 onChangeText={(t) => updateActiveNote({ inputText: t })}
                 onAddFiles={handleAddFiles}
                 onRemoveFile={handleRemoveFile}
                 onGenerate={handleGenerate}
                 onSave={handleManualSave}
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
    </div>
  );
};

export default App;