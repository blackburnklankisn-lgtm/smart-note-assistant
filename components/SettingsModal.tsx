import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

export const SettingsModal: React.FC = () => {
  const { showSettings, setShowSettings } = useNoteStore();
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (showSettings) {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) setApiKeyInput(storedKey);
    }
  }, [showSettings]);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.trim());
    setShowSettings(false);
  };

  if (!showSettings) return null;

  return (
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
             onClick={handleSave}
             className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm"
           >
             Save Configuration
           </button>
         </div>
      </div>
    </div>
  );
};
