import React, { useEffect } from 'react';
import { useNoteStore } from './store/noteStore';
import { InputSection } from './components/InputSection';
import { ChatPanel } from './components/ChatPanel';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { 
  Menu, X, Loader2, CheckCircle2, MessageCircleQuestion 
} from 'lucide-react';

const App: React.FC = () => {
  const store = useNoteStore();
  
  // Destructure state
  const { 
    notes, activeNoteId, isSidebarOpen, isChatOpen, isChatLoading, chatDraft,
    isStorageInitialized, searchQuery
  } = store;

  // Destructure actions
  const { 
    init, setSidebarOpen, setChatOpen, setChatDraft, saveNotes, 
    updateActiveNote, generateNoteContent, sendChatMessage, clearChatHistory,
    addFilesToActiveNote, removeFileFromActiveNote, generateWeeklySummary 
  } = store;

  // 1. Initial Load
  useEffect(() => {
    init();
  }, [init]);

  // 2. Auto-save Debouncer
  useEffect(() => {
    if (!isStorageInitialized || notes.length === 0) return;
    
    const timer = setTimeout(() => {
      saveNotes();
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes, isStorageInitialized, saveNotes]);

  // 3. Weekly Summary Scheduler
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      if (now.getDay() === 5 && now.getHours() === 17 && now.getMinutes() === 0) {
        const lastRunKey = 'last_auto_weekly_summary_date';
        const lastRunDate = localStorage.getItem(lastRunKey);
        const todayStr = now.toDateString();

        if (lastRunDate !== todayStr) {
          console.log("Triggering Auto Weekly Summary...");
          generateWeeklySummary(true);
          localStorage.setItem(lastRunKey, todayStr);
        }
      }
    };
    const intervalId = setInterval(checkTime, 30000); 
    return () => clearInterval(intervalId);
  }, [generateWeeklySummary]);

  // Handle active note derived state
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Loading Screen
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

  // Fallback if something went wrong with init
  if (!activeNote) {
     return <div className="h-screen flex items-center justify-center">Initializing...</div>;
  }

  const handleChatWithSelection = (text: string) => {
    setChatOpen(true);
    setChatDraft(`> ${text}\n\n`);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 lg:hidden">
              <Menu size={24} />
            </button>
            <span className="font-semibold text-slate-800 truncate max-w-[200px] lg:max-w-none">
              {activeNote.title || "Untitled Note"}
            </span>
          </div>
          <div className="flex items-center gap-1">
             <button 
                onClick={() => setChatOpen(!isChatOpen)}
                className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'}`}
                title="Chat with Note"
             >
                <MessageCircleQuestion size={22} />
             </button>
             <button onClick={() => saveNotes()} className="text-blue-600 p-2 lg:hidden">
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
                 onAddFiles={addFilesToActiveNote}
                 onRemoveFile={removeFileFromActiveNote}
                 onGenerate={generateNoteContent}
                 onSave={() => saveNotes()}
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
                 onSendMessage={sendChatMessage}
                 onClose={() => setChatOpen(false)}
                 onClearHistory={clearChatHistory}
                 draftMessage={chatDraft}
               />
            </div>
          )}

        </main>
      </div>

      <DeleteConfirmModal />
      <SettingsModal />
    </div>
  );
};

export default App;
