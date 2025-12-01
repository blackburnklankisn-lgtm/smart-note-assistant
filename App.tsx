import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { NoteDisplay } from './components/NoteDisplay';
import { generateSmartNote } from './services/geminiService';
import { AppStatus, NoteSession, ImagePreview } from './types';
import { BrainCircuit, PenTool, Plus, FileText, ChevronRight, Menu, X, MessageSquarePlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Since we can't import uuid, we'll use a simple generator function

// Simple UUID generator since we don't have the package
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
  const [notes, setNotes] = useState<NoteSession[]>([createNewNote()]);
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active note helper
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  // Update specific fields of the active note
  const updateActiveNote = (updates: Partial<NoteSession>) => {
    setNotes(prev => prev.map(note => 
      note.id === activeNoteId ? { ...note, ...updates } : note
    ));
  };

  const handleAddNote = () => {
    const newNote = createNewNote();
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
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
      
      updateActiveNote({
        result: {
          markdown,
          timestamp: Date.now()
        },
        status: AppStatus.SUCCESS,
        // Auto-generate title if missing and successful
        title: activeNote.title || "Smart Note " + new Date().toLocaleDateString()
      });
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
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(activeNote.attachments[index].url);
    
    const newAttachments = [...activeNote.attachments];
    newAttachments.splice(index, 1);
    updateActiveNote({ attachments: newAttachments });
  };

  // Cleanup object URLs when notes are removed (simplified for this demo)
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

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
            <BrainCircuit size={24} />
            <span>Smart Note</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button 
            onClick={handleAddNote}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus size={18} />
            New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => handleSwitchNote(note.id)}
              className={`w-full text-left p-3 rounded-lg text-sm flex items-start gap-3 transition-colors ${
                activeNoteId === note.id 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <FileText size={18} className={`mt-0.5 flex-shrink-0 ${activeNoteId === note.id ? 'text-blue-500' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {note.title || "Untitled Note"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  {note.result ? "Generated" : "Draft"} • {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              {activeNoteId === note.id && <ChevronRight size={14} className="mt-1 opacity-50" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          Powered by Google Gemini 2.5
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
              <Menu size={24} />
            </button>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {activeNote.title || "Untitled Note"}
            </span>
          </div>
          <button onClick={handleAddNote} className="text-blue-600 p-2">
            <MessageSquarePlus size={24} />
          </button>
        </header>

        {/* Top Right Desktop Action (if needed, currently mostly in sidebar) */}
        <div className="hidden lg:flex absolute top-4 right-6 z-10 gap-2">
             {/* Additional header actions could go here */}
        </div>

        {/* Content Grid */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Left: Input */}
            <div className="flex flex-col h-full min-h-[500px] lg:min-h-0">
               <InputSection 
                 title={activeNote.title}
                 text={activeNote.inputText}
                 previews={activeNote.attachments}
                 status={activeNote.status}
                 onChangeTitle={(t) => updateActiveNote({ title: t })}
                 onChangeText={(t) => updateActiveNote({ inputText: t })}
                 onAddFiles={handleAddFiles}
                 onRemoveFile={handleRemoveFile}
                 onGenerate={handleGenerate}
               />
               
               {activeNote.error && (
                 <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2 animate-fade-in">
                   <div className="mt-0.5 font-bold">Error:</div>
                   <div>{activeNote.error}</div>
                 </div>
               )}
            </div>

            {/* Right: Output */}
            <div className="flex flex-col h-full min-h-[500px] lg:min-h-0">
               {activeNote.result ? (
                 <NoteDisplay 
                   result={activeNote.result} 
                   onReset={() => updateActiveNote({ result: null, status: AppStatus.IDLE })} 
                 />
               ) : (
                 <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white/50">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <BrainCircuit size={32} className="opacity-20" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-500 mb-1">Ready to Process</h3>
                    <p className="max-w-xs mx-auto text-sm">
                      Enter your notes, attach PDFs or images on the left, then click Generate.
                    </p>
                 </div>
               )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
