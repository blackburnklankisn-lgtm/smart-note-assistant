import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Loader2, Sparkles, 
  Paperclip, File as FileIcon, Bold, Italic, Underline, 
  Heading1, Heading2, AlignLeft
} from 'lucide-react';
import { ImagePreview, AppStatus } from '../types';

interface InputSectionProps {
  title: string;
  text: string; // This will now contain HTML
  previews: ImagePreview[]; // These are for PDF attachments mainly
  status: AppStatus;
  onChangeTitle: (title: string) => void;
  onChangeText: (html: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onGenerate: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
  title, 
  text, 
  previews, 
  status, 
  onChangeTitle,
  onChangeText,
  onAddFiles,
  onRemoveFile,
  onGenerate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInsertRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [currentFont, setCurrentFont] = useState<string>('Inter');
  const [currentSize, setCurrentSize] = useState<string>('3');

  // Sync initial content or external updates
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== text) {
      // Only update if significantly different to avoid cursor jumping
      // Logic: If empty, set it. If text is strictly longer (append), update it.
      // For general typing, we rely on handleInput to keep state in sync, so we don't overwrite user input.
      // But if the external text changes drastically (like AI append), we must update.
      const currentLen = editorRef.current.innerHTML.length;
      const newLen = text.length;
      
      // Heuristic: If new text is significantly larger, it's likely an append operation or load
      if (Math.abs(newLen - currentLen) > 5 || text === "") {
         editorRef.current.innerHTML = text;
      }
    }
  }, [text]);

  // Enable styleWithCSS for better font handling
  useEffect(() => {
    document.execCommand('styleWithCSS', false, 'true');
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChangeText(editorRef.current.innerHTML);
      checkFormats();
    }
  };

  const checkFormats = () => {
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    setActiveFormats(formats);

    // Check font and size is harder natively, usually we track what we set or just let it be
    // For specific UI feedback we would need to inspect the selection's computed style
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkFormats();
  };

  const insertImageAtCursor = (base64: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertImage', false, base64);
      handleInput();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      insertImageAtCursor(base64);
    }
    if (imageInsertRef.current) imageInsertRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items) as DataTransferItem[];
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const base64 = await fileToBase64(file);
        insertImageAtCursor(base64);
      }
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = status === AppStatus.PROCESSING;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full transition-all duration-300 overflow-hidden relative">
      
      {/* Title Input */}
      <div className="px-8 pt-8 pb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Untitled Note"
          className="w-full text-3xl font-bold text-slate-800 placeholder-slate-300 border-none focus:ring-0 focus:outline-none bg-transparent p-0"
          disabled={isProcessing}
        />
      </div>

      {/* Rich Text Toolbar */}
      <div className="sticky top-0 z-10 px-6 py-3 border-y border-slate-100 flex items-center gap-2 bg-slate-50/90 backdrop-blur-sm flex-wrap">
        
        {/* Font Family Selector */}
        <div className="relative group">
          <select 
            className="appearance-none pl-2 pr-8 py-1.5 rounded-md text-sm border border-slate-200 bg-white hover:border-blue-400 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[100px]"
            onChange={(e) => {
              execCmd('fontName', e.target.value);
              setCurrentFont(e.target.value);
            }}
            value={currentFont}
            title="Font Family"
          >
            <option value="Inter">Default</option>
            <option value="SimSun">宋体 (SimSun)</option>
            <option value="FangSong">仿宋 (FangSong)</option>
            <option value="KaiTi">楷体 (KaiTi)</option>
            <option value="SimHei">黑体 (SimHei)</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>
        </div>

        {/* Font Size Selector */}
        <div className="relative group">
           <select 
            className="appearance-none pl-2 pr-6 py-1.5 rounded-md text-sm border border-slate-200 bg-white hover:border-blue-400 focus:outline-none focus:border-blue-500 cursor-pointer"
            onChange={(e) => {
              execCmd('fontSize', e.target.value);
              setCurrentSize(e.target.value);
            }}
            value={currentSize}
            title="Font Size"
          >
            <option value="1">Small</option>
            <option value="2">Normal</option>
            <option value="3">Medium</option>
            <option value="4">Large</option>
            <option value="5">X-Large</option>
            <option value="6">Huge</option>
            <option value="7">Giant</option>
          </select>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <ToolbarButton 
          icon={<Bold size={18} />} 
          isActive={activeFormats.includes('bold')} 
          onClick={() => execCmd('bold')} 
          title="Bold"
        />
        <ToolbarButton 
          icon={<Italic size={18} />} 
          isActive={activeFormats.includes('italic')} 
          onClick={() => execCmd('italic')} 
          title="Italic"
        />
        <ToolbarButton 
          icon={<Underline size={18} />} 
          isActive={activeFormats.includes('underline')} 
          onClick={() => execCmd('underline')} 
          title="Underline"
        />
        
        <div className="w-px h-6 bg-slate-200 mx-2" />
        
        <ToolbarButton 
          icon={<Heading1 size={18} />} 
          onClick={() => execCmd('formatBlock', 'H1')} 
          title="Heading 1"
        />
        <ToolbarButton 
          icon={<Heading2 size={18} />} 
          onClick={() => execCmd('formatBlock', 'H2')} 
          title="Heading 2"
        />
        
        <div className="w-px h-6 bg-slate-200 mx-2" />
        
        <ToolbarButton 
          icon={<ImageIcon size={18} />} 
          onClick={() => imageInsertRef.current?.click()} 
          title="Insert Image inline"
        />

        <div className="flex-grow" />

         <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg transition-colors shadow-sm"
          title="Attach PDF for reference"
        >
          <Paperclip size={14} />
          <span>Attach PDF</span>
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-grow relative overflow-hidden flex flex-col bg-white">
        <div 
          ref={editorRef}
          contentEditable={!isProcessing}
          onInput={handleInput}
          onPaste={handlePaste}
          onMouseUp={checkFormats}
          onKeyUp={checkFormats}
          className="flex-grow w-full px-8 py-6 text-slate-700 focus:outline-none overflow-y-auto max-w-none prose prose-slate prose-lg prose-p:my-2 prose-headings:mb-3 prose-headings:mt-6 prose-img:rounded-xl prose-img:shadow-md prose-img:max-h-[500px] prose-img:w-auto prose-img:my-4 prose-ul:my-2 prose-li:my-0.5"
          style={{ minHeight: '400px' }}
          data-placeholder="Start typing your notes here..."
        />
        
        {!text && (
          <div className="absolute top-6 left-8 text-slate-400 pointer-events-none select-none text-lg">
            Start typing your notes... drag & drop images or use the toolbar...
          </div>
        )}
      </div>

      {/* Attachments Preview Area (PDFs only) */}
      {previews.length > 0 && (
        <div className="px-8 pb-4 bg-slate-50 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Attachments (Context for AI)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="flex items-center gap-2 bg-white pr-2 rounded-md border border-slate-200 shadow-sm group">
                <div className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-l-md border-r border-slate-100">
                   <FileIcon size={14} />
                </div>
                <span className="text-xs text-slate-600 max-w-[150px] truncate font-medium">{preview.file.name}</span>
                <button
                  onClick={() => onRemoveFile(index)}
                  className="text-slate-300 hover:text-red-500 transition-colors px-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden Inputs */}
      <input
        type="file"
        ref={imageInsertRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAttachmentChange}
        accept=".pdf"
        multiple
        className="hidden"
      />

      {/* Floating Action Button for Generation */}
      <div className="absolute bottom-8 right-8 z-20">
        <button
          onClick={onGenerate}
          disabled={isProcessing || (!text.trim() && previews.length === 0)}
          className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-1 active:scale-95"
        >
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Sparkles size={20} />
          )}
          <span>{isProcessing ? 'Thinking...' : 'Generate Smart Note'}</span>
        </button>
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  title: string;
}> = ({ icon, onClick, isActive, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded-md transition-all ${
      isActive 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {icon}
  </button>
);

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
