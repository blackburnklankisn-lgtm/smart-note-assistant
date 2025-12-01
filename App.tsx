import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { generateSmartNote, markdownToHtml } from './services/geminiService';
import { AppStatus, NoteSession, ImagePreview } from './types';
import { BrainCircuit, Plus, FileText, ChevronRight, Menu, X, MessageSquarePlus } from 'lucide-react';

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

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

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
      
      // Convert Markdown to HTML for the editor
      const aiHtml = markdownToHtml(markdown);
      
      // Append to current text with a separator
      const separator = `<br/><br/><hr style="margin: 2em 0; border: 0; border-top: 2px dashed #e2e8f0;"/><h2 style="color: #2563eb;">✨ AI Smart Note</h2><br/>`;
      const newContent = activeNote.inputText + separator + aiHtml;

      updateActiveNote({
        inputText: newContent,
        result: {
          markdown,
          timestamp: Date.now()
        },
        status: AppStatus.SUCCESS,
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
    URL.revokeObjectURL(activeNote.attachments[index].url);
    const newAttachments = [...activeNote.attachments];
    newAttachments.splice(index, 1);
    updateActiveNote({ attachments: newAttachments });
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

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between h-20">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl tracking-tight">
            <BrainCircuit size={28} />
            <span>Smart Note</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-5">
          <button 
            onClick={handleAddNote}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => handleSwitchNote(note.id)}
              className={`w-full text-left p-3.5 rounded-xl text-sm flex items-start gap-3 transition-all duration-200 border ${
                activeNoteId === note.id 
                  ? 'bg-blue-50/50 text-blue-700 border-blue-100 shadow-sm' 
                  : 'hover:bg-slate-50 text-slate-600 border-transparent'
              }`}
            >
              <FileText size={18} className={`mt-0.5 flex-shrink-0 ${activeNoteId === note.id ? 'text-blue-500' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${activeNoteId === note.id ? 'text-slate-900' : 'text-slate-700'}`}>
                  {note.title || "Untitled Note"}
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate font-medium">
                  {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              {activeNoteId === note.id && <ChevronRight size={14} className="mt-1 opacity-50" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 text-center font-medium">
          Powered by Gemini 2.5
        </div>
      </aside>

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
          <button onClick={handleAddNote} className="text-blue-600 p-2">
            <MessageSquarePlus size={24} />
          </button>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-hidden bg-slate-100/50 p-0 lg:p-6">
          <div className="h-full max-w-5xl mx-auto flex flex-col">
            
            {/* Input Section (Now acts as the main Document Editor) */}
            <div className="flex-1 h-full min-h-0">
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
    </div>
  );
};

export default App;
