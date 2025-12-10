import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  BrainCircuit, Plus, FileText, X, Loader2, CheckCircle2, AlertCircle, 
  Trash2, Search, Copy, Settings, CalendarClock 
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

interface SidebarProps {
  onResizeStart?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { 
    notes, activeNoteId, isSidebarOpen, searchQuery, saveStatus,
    setSidebarOpen, setActiveNoteId, setSearchQuery, setShowSettings,
    addNote, duplicateNote, setDeleteTargetId, generateWeeklySummary
  } = useNoteStore();

  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Filter notes
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

  const handleSwitchNote = (id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Resize Logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

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
      document.body.style.cursor = "";
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div 
      className="relative flex-shrink-0 z-40 lg:z-auto transition-transform lg:transition-none"
      style={{ width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : '18rem' }}
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
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-5 pb-2 space-y-3">
          {/* Search */}
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
            onClick={addNote}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            New Note
          </button>

          <button 
            onClick={() => generateWeeklySummary(false)}
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
              
              <div className={`
                  absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1
                  transition-opacity duration-200 z-20
                  ${activeNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateNote(note.id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white/50 backdrop-blur-sm"
                  title="Duplicate Note"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTargetId(note.id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors bg-white/50 backdrop-blur-sm"
                  title="Delete Note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

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
  );
};
