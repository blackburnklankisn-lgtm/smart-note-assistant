import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

export const DeleteConfirmModal: React.FC = () => {
  const { deleteTargetId, setDeleteTargetId, deleteNote } = useNoteStore();

  if (!deleteTargetId) return null;

  return (
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
                  onClick={deleteNote}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm shadow-red-200"
                >
                  Delete
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
