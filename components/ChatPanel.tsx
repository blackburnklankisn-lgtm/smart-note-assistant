import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  history: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClose: () => void;
  onClearHistory: () => void;
  draftMessage?: string; // New prop for pre-filling input
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  history, 
  isLoading, 
  onSendMessage, 
  onClose,
  onClearHistory,
  draftMessage
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  // Handle incoming draft messages (e.g. from text selection)
  useEffect(() => {
    if (draftMessage) {
      setInput(draftMessage);
      // Focus the input to let user type immediately
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [draftMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl relative z-40 transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Bot size={20} className="text-blue-600" />
          <span>Chat with Note</span>
        </div>
        <div className="flex items-center gap-1">
            <button 
                onClick={onClearHistory}
                className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-slate-100 transition-colors mr-1"
            >
                Clear
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
            >
              <X size={20} />
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {history.length === 0 && (
            <div className="text-center text-slate-400 mt-10 text-sm">
                <Sparkles size={32} className="mx-auto mb-3 text-slate-300" />
                <p>Ask questions about your current note content.</p>
                <p className="text-xs mt-2">"What is the main error?"</p>
                <p className="text-xs">"Summarize the PDF attachment."</p>
            </div>
        )}
        
        {history.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
              ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}
            `}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none prose prose-sm prose-slate'
              }
              ${msg.isError ? 'border-red-300 bg-red-50 text-red-600' : ''}
            `}>
              {msg.role === 'user' ? (
                <div>{msg.text}</div>
              ) : (
                <ReactMarkdown
                    components={{
                        a: ({node, ...props}) => <a className="text-blue-500 hover:underline" target="_blank" {...props} />
                    }}
                >
                    {msg.text}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={16} />
             </div>
             <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>Thinking...</span>
             </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-white">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`
              absolute right-2 p-1.5 rounded-lg transition-colors
              ${!input.trim() || isLoading 
                ? 'text-slate-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }
            `}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};