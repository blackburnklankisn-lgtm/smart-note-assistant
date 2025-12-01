import React, { useRef, useState, useEffect } from 'react';
import { 
  Upload, X, Image as ImageIcon, FileText, Loader2, Sparkles, 
  Paperclip, File as FileIcon, Bold, Italic, Underline, 
  Type, Heading1, Heading2, AlignLeft, List
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

  // Sync initial content or external updates
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== text) {
      // Only update if significantly different to avoid cursor jumping
      // Simple check: if empty, set it. If focusing, we assume user is typing.
      if (!editorRef.current.innerText.trim() && !text) {
        editorRef.current.innerHTML = "";
      } else if (text && editorRef.current.innerHTML === "") {
        editorRef.current.innerHTML = text;
      }
    }
  }, [text]);

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
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkFormats();
  };

  const insertImageAtCursor = (base64: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      // Use execCommand to insert image at current selection
      // This ensures it goes exactly where the cursor is
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
    // We let text paste handle itself naturally (often cleaner), 
    // but we must intercept images.
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
    // For text, let default behavior happen (it strips formatting usually, which is good, or keeps it)
    // We might want to handle plain text paste to strip styles if needed, but standard behavior is usually acceptable.
  };

  // Handler for PDF attachments
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = status === AppStatus.PROCESSING;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full transition-all duration-300 overflow-hidden">
      
      {/* Title Input */}
      <div className="px-6 pt-6 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Untitled Note"
          className="w-full text-2xl font-bold text-slate-800 placeholder-slate-300 border-none focus:ring-0 focus:outline-none bg-transparent p-0"
          disabled={isProcessing}
        />
      </div>

      {/* Rich Text Toolbar */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1 bg-slate-50/50 flex-wrap">
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
        <div className="w-px h-5 bg-slate-200 mx-1" />
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
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolbarButton 
          icon={<ImageIcon size={18} />} 
          onClick={() => imageInsertRef.current?.click()} 
          title="Insert Image inline"
        />
        <div className="w-px h-5 bg-slate-200 mx-1" />
         <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-auto"
          title="Attach PDF for reference"
        >
          <Paperclip size={14} />
          <span>Attach PDF</span>
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-grow relative overflow-hidden flex flex-col">
        <div 
          ref={editorRef}
          contentEditable={!isProcessing}
          onInput={handleInput}
          onPaste={handlePaste}
          onMouseUp={checkFormats}
          onKeyUp={checkFormats}
          className="flex-grow w-full p-6 text-slate-700 focus:outline-none overflow-y-auto prose prose-slate max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-img:rounded-lg prose-img:shadow-sm prose-img:max-h-[400px] prose-img:w-auto prose-img:my-2"
          style={{ minHeight: '300px' }}
          data-placeholder="Start typing... Use the toolbar to format or insert images..."
        />
        
        {!text && (
          <div className="absolute top-6 left-6 text-slate-400 pointer-events-none select-none">
            Start typing your notes... insert images directly here...
          </div>
        )}
      </div>

      {/* Attachments Preview Area (PDFs only mostly) */}
      {previews.length > 0 && (
        <div className="px-6 pb-4 border-t border-slate-50 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Attached Files
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-100 pr-2 rounded-md border border-slate-200 group">
                <div className="h-8 w-8 flex items-center justify-center bg-white rounded-l-md border-r border-slate-200">
                   {preview.type === 'pdf' ? <FileIcon size={14} className="text-red-500"/> : <ImageIcon size={14} className="text-blue-500"/>}
                </div>
                <span className="text-xs text-slate-600 max-w-[100px] truncate">{preview.file.name}</span>
                <button
                  onClick={() => onRemoveFile(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
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

      {/* Generate Button */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={onGenerate}
          disabled={isProcessing || (!text.trim() && previews.length === 0)}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-[0.99]"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Analyzing Note & Images...</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>Generate Smart Note</span>
            </>
          )}
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
    className={`p-2 rounded-lg transition-all ${
      isActive 
        ? 'bg-blue-100 text-blue-700' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {icon}
  </button>
);

// Helper
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};