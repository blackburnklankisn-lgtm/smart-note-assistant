import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Loader2, Sparkles, 
  Paperclip, File as FileIcon, Bold, Italic, Underline, 
  Heading1, Heading2, Save, Palette, Highlighter, ChevronDown,
  Type, ALargeSmall, Link as LinkIcon, UserCog, MessageCircleQuestion, Music
} from 'lucide-react';
import { ImagePreview, AppStatus, NoteRole } from '../types';
import { AudioRecorder } from './AudioRecorder';

interface InputSectionProps {
  title: string;
  text: string; // This will now contain HTML
  previews: ImagePreview[]; // These are for PDF attachments mainly
  status: AppStatus;
  searchQuery?: string; // New prop for search highlighting
  role: NoteRole;
  onChangeTitle: (title: string) => void;
  onChangeText: (html: string) => void;
  onRoleChange: (role: NoteRole) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onGenerate: () => void;
  onSave: () => void;
  onChatSelection?: (text: string) => void; // New prop for chat with selection
}

// Predefined colors for Text and Highlights
const TEXT_COLORS = [
  { label: 'Default', value: 'inherit', class: 'bg-slate-900 border-slate-200' },
  { label: 'Red', value: '#ef4444', class: 'bg-red-500 border-red-200' },
  { label: 'Orange', value: '#f97316', class: 'bg-orange-500 border-orange-200' },
  { label: 'Yellow', value: '#eab308', class: 'bg-yellow-500 border-yellow-200' },
  { label: 'Green', value: '#22c55e', class: 'bg-green-500 border-green-200' },
  { label: 'Blue', value: '#3b82f6', class: 'bg-blue-500 border-blue-200' },
  { label: 'Indigo', value: '#6366f1', class: 'bg-indigo-500 border-indigo-200' },
  { label: 'Purple', value: '#a855f7', class: 'bg-purple-500 border-purple-200' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent', class: 'bg-white border-slate-200' },
  { label: 'Red', value: '#fee2e2', class: 'bg-red-100 border-red-200' },
  { label: 'Orange', value: '#ffedd5', class: 'bg-orange-100 border-orange-200' },
  { label: 'Yellow', value: '#fef9c3', class: 'bg-yellow-100 border-yellow-200' },
  { label: 'Green', value: '#dcfce7', class: 'bg-green-100 border-green-200' },
  { label: 'Blue', value: '#dbeafe', class: 'bg-blue-100 border-blue-200' },
  { label: 'Indigo', value: '#e0e7ff', class: 'bg-indigo-100 border-indigo-200' },
  { label: 'Purple', value: '#f3e8ff', class: 'bg-purple-100 border-purple-200' },
];

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, Cambria, "Times New Roman", Times, serif' },
  { label: 'Monospace', value: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace' },
  { label: '宋体 (Songti)', value: 'SimSun, "Songti SC", STSong, serif' },
  { label: '仿宋 (FangSong)', value: 'FangSong, "STFangsong", serif' },
  { label: '楷体 (KaiTi)', value: 'KaiTi, "STKaiti", serif' },
  { label: '黑体 (HeiTi)', value: 'SimHei, "Heiti SC", STHeiti, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Carlito, sans-serif' },
  { label: 'Light', value: '"Segoe UI Light", "Roboto Light", "Helvetica Neue Light", sans-serif' },
];

const FONT_SIZES = [
  { label: '8', value: '1' },
  { label: '9', value: '1' },
  { label: '10', value: '2' },
  { label: '11', value: '2' },
  { label: '12', value: '3' },
  { label: '14', value: '4' },
  { label: '16', value: '4' },
  { label: '18', value: '5' },
  { label: '20', value: '5' },
  { label: '24', value: '6' },
  { label: '30', value: '6' },
  { label: '36', value: '7' },
  { label: '48', value: '7' },
  { label: '60', value: '7' },
  { label: '72', value: '7' },
];

export const InputSection: React.FC<InputSectionProps> = ({ 
  title, 
  text, 
  previews, 
  status, 
  searchQuery,
  role,
  onChangeTitle,
  onChangeText,
  onRoleChange,
  onAddFiles,
  onRemoveFile,
  onGenerate,
  onSave,
  onChatSelection
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInsertRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  
  // State for Dropdowns
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  // State for Resizing
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // State for Selection Popover
  const [selectionPopover, setSelectionPopover] = useState<{x: number, y: number, text: string} | null>(null);

  const removeHighlights = (html: string) => {
    return html.replace(/<span class="search-highlight [^"]*">(.*?)<\/span>/g, '$1');
  };

  const applyHighlights = (html: string, query: string) => {
    if (!query || query.trim().length < 2) return html;
    
    let cleanHtml = removeHighlights(html);
    const keywords = query.split(/\s+/).filter(k => k.length > 0);
    
    keywords.forEach(keyword => {
       const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const regex = new RegExp(`(?![^<]*>)(${safeKeyword})`, 'gi');
       cleanHtml = cleanHtml.replace(regex, '<span class="search-highlight bg-yellow-300 text-slate-900 rounded-sm">$1</span>');
    });
    
    return cleanHtml;
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        
        if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
          setSelectionPopover(null);
          return;
        }

        const text = selection.toString().trim();
        if (text.length > 0) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            if (rect.width > 0 && rect.height > 0) {
              setSelectionPopover({
                x: rect.left + rect.width / 2,
                y: rect.top - 45,
                text: text
              });
            }
          } catch (e) {
            setSelectionPopover(null);
          }
        } else {
          setSelectionPopover(null);
        }
      }, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('scroll', handleSelectionChange, true);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('scroll', handleSelectionChange, true);
    };
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.toolbar-menu-trigger')) {
        setShowColorMenu(false);
        setShowHighlightMenu(false);
        setShowFontMenu(false);
        setShowSizeMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editorRef.current) {
       const content = searchQuery ? applyHighlights(text, searchQuery) : text;
       editorRef.current.innerHTML = content;
       
       if (searchQuery) {
         setTimeout(() => {
            const firstHighlight = editorRef.current?.querySelector('.search-highlight');
            if (firstHighlight) {
                firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
         }, 100);
       }
    }
  }, []);

  useEffect(() => {
    if (editorRef.current) {
        const currentEditorHtml = editorRef.current.innerHTML;
        const currentClean = removeHighlights(currentEditorHtml);
        const incomingClean = removeHighlights(text);

        const isSearchUpdate = searchQuery !== undefined;
        const textChanged = Math.abs(currentClean.length - incomingClean.length) > 10 || currentClean !== incomingClean;

        if (textChanged || isSearchUpdate) {
            const newContent = searchQuery ? applyHighlights(incomingClean, searchQuery) : incomingClean;
            
            if (editorRef.current.innerHTML !== newContent) {
                 editorRef.current.innerHTML = newContent;
                 
                 if (searchQuery) {
                    setTimeout(() => {
                        const firstHighlight = editorRef.current?.querySelector('.search-highlight');
                        if (firstHighlight) {
                            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                 }
            }
        }
    }
  }, [text, searchQuery]);

  useEffect(() => {
    document.execCommand('styleWithCSS', false, 'true');
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current) {
        setResizingSide(side);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = containerRef.current.offsetWidth;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSide) return;
      
      let delta = 0;
      if (resizingSide === 'right') {
         delta = e.clientX - resizeStartX.current;
      } else {
         delta = resizeStartX.current - e.clientX;
      }

      const newWidth = resizeStartWidth.current + (delta * 2);
      
      if (newWidth >= 400 && newWidth <= 8000) { 
          setEditorWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setResizingSide(null);
    };

    if (resizingSide) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingSide]);

  const handleInput = () => {
    if (editorRef.current) {
      const rawHtml = editorRef.current.innerHTML;
      const cleanHtml = removeHighlights(rawHtml);
      onChangeText(cleanHtml);
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
      document.execCommand('insertImage', false, base64);
      handleInput();
    }
  };

  const insertLink = () => {
    const selection = window.getSelection();
    let range: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    const url = prompt("Please enter the URL:", "https://");
    
    if (url) {
      if (editorRef.current) {
        editorRef.current.focus();
        if (range && selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      if (range && !range.collapsed) {
        document.execCommand('createLink', false, url);
      } else {
        const linkHtml = `<a href="${url}" target="_blank" class="text-blue-600 hover:underline cursor-pointer">${url}</a>&nbsp;`;
        document.execCommand('insertHTML', false, linkHtml);
      }
      
      handleInput();
    }
  };

  const insertPdfPlaceholder = (file: File) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;

      const html = `
        <span contenteditable="false" class="inline-flex items-center gap-1.5 px-3 py-1 my-1 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm font-medium select-none align-middle mx-1 shadow-sm">
          ${svgIcon}
          <span>${file.name}</span>
        </span>
        <span>&nbsp;</span>
      `;

      document.execCommand('insertHTML', false, html);
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
    const items = Array.from(e.clipboardData.items) as any[]; 
    const imageItem = items.find((item: any) => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const base64 = await fileToBase64(file);
        insertImageAtCursor(base64);
      }
      return;
    }

    const text = e.clipboardData.getData('text/plain');
    if (text) {
      const urlRegex = /^(https?:\/\/[^\s]+)$/i;
      
      if (urlRegex.test(text.trim())) {
        e.preventDefault();
        const url = text.trim();
        const linkHtml = `<a href="${url}" target="_blank" class="text-blue-600 hover:underline cursor-pointer">${url}</a>&nbsp;`;
        document.execCommand('insertHTML', false, linkHtml);
        handleInput();
        return;
      }
      
      e.preventDefault();
      document.execCommand('insertText', false, text);
      handleInput();
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      onAddFiles(files);
      
      files.forEach(file => {
        if (file.type === 'application/pdf') {
          insertPdfPlaceholder(file);
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFloatingChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionPopover && onChatSelection) {
      onChatSelection(selectionPopover.text);
      setSelectionPopover(null); 
    }
  };

  const isProcessing = status === AppStatus.PROCESSING;

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full transition-all duration-300 overflow-visible relative mx-auto"
      style={{ 
        width: editorWidth ? `${editorWidth}px` : '100%',
        maxWidth: '100%'
      }}
    >
      <div className="px-6 pt-6 pb-2 flex items-start gap-4 justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Untitled Note"
          className="flex-1 text-3xl font-bold text-slate-800 placeholder-slate-300 border-none focus:ring-0 focus:outline-none bg-transparent p-0"
          disabled={isProcessing}
          aria-label="Note Title"
        />
        
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Save size={16} />
          <span>Save</span>
        </button>
      </div>

      <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-1 flex-wrap relative z-20">
        <button onClick={() => execCmd('bold')} className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${activeFormats.includes('bold') ? 'bg-slate-200 text-blue-600' : 'text-slate-500'}`} title="Bold"><Bold size={18} /></button>
        <button onClick={() => execCmd('italic')} className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${activeFormats.includes('italic') ? 'bg-slate-200 text-blue-600' : 'text-slate-500'}`} title="Italic"><Italic size={18} /></button>
        <button onClick={() => execCmd('underline')} className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${activeFormats.includes('underline') ? 'bg-slate-200 text-blue-600' : 'text-slate-500'}`} title="Underline"><Underline size={18} /></button>
        
        <div className="w-px h-5 bg-slate-200 mx-2" />

        <div className="relative toolbar-menu-trigger">
          <button onClick={() => { setShowFontMenu(!showFontMenu); setShowSizeMenu(false); setShowColorMenu(false); setShowHighlightMenu(false); }} className={`flex items-center gap-1 p-1.5 rounded hover:bg-slate-100 transition-colors ${showFontMenu ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`} title="Font Family"><Type size={18} /><ChevronDown size={12} /></button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 w-48 animate-fade-in z-50 max-h-60 overflow-y-auto">
              {FONT_FAMILIES.map((font) => (
                <button key={font.label} onMouseDown={(e) => { e.preventDefault(); execCmd('fontName', font.value); setShowFontMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md font-medium truncate" style={{ fontFamily: font.value.split(',')[0] }}>{font.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="relative toolbar-menu-trigger">
          <button onClick={() => { setShowSizeMenu(!showSizeMenu); setShowFontMenu(false); setShowColorMenu(false); setShowHighlightMenu(false); }} className={`flex items-center gap-1 p-1.5 rounded hover:bg-slate-100 transition-colors ${showSizeMenu ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`} title="Font Size"><ALargeSmall size={18} /><ChevronDown size={12} /></button>
          {showSizeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 w-20 animate-fade-in z-50 max-h-60 overflow-y-auto">
              {FONT_SIZES.map((size) => (
                <button key={size.label} onMouseDown={(e) => { e.preventDefault(); execCmd('fontSize', size.value); setShowSizeMenu(false); }} className="w-full text-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md font-medium">{size.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-2" />

        <div className="relative toolbar-menu-trigger">
          <button onClick={() => { setShowColorMenu(!showColorMenu); setShowHighlightMenu(false); setShowFontMenu(false); setShowSizeMenu(false); }} className={`flex items-center gap-1 p-1.5 rounded hover:bg-slate-100 transition-colors ${showColorMenu ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`} title="Text Color"><Palette size={18} /><ChevronDown size={12} /></button>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-2 w-48 animate-fade-in z-50">
              {TEXT_COLORS.map((c) => (
                <button key={c.label} onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', c.value); setShowColorMenu(false); }} className="w-8 h-8 rounded-full border border-slate-100 shadow-sm hover:scale-110 transition-transform flex items-center justify-center relative group" title={c.label}><div className={`w-6 h-6 rounded-full ${c.class}`}></div></button>
              ))}
            </div>
          )}
        </div>

        <div className="relative toolbar-menu-trigger">
           <button onClick={() => { setShowHighlightMenu(!showHighlightMenu); setShowColorMenu(false); setShowFontMenu(false); setShowSizeMenu(false); }} className={`flex items-center gap-1 p-1.5 rounded hover:bg-slate-100 transition-colors ${showHighlightMenu ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`} title="Highlight Color"><Highlighter size={18} /><ChevronDown size={12} /></button>
           {showHighlightMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-2 w-48 animate-fade-in z-50">
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c.label} onMouseDown={(e) => { e.preventDefault(); execCmd('hiliteColor', c.value); setShowHighlightMenu(false); }} className="w-8 h-8 rounded-full border border-slate-100 shadow-sm hover:scale-110 transition-transform flex items-center justify-center" title={c.label}>
                   <div className={`w-6 h-6 rounded-full ${c.class}`}></div>
                   {c.value === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-slate-400"><div className="w-5 h-0.5 bg-red-400 rotate-45"></div></div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-2" />
        
        <button onClick={() => execCmd('formatBlock', 'H1')} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Heading 1"><Heading1 size={18} /></button>
        <button onClick={() => execCmd('formatBlock', 'H2')} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Heading 2"><Heading2 size={18} /></button>
        
        <div className="w-px h-5 bg-slate-200 mx-2" />
        
        <button onMouseDown={(e) => { e.preventDefault(); insertLink(); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Insert Link"><LinkIcon size={18} /></button>

        <button onClick={() => imageInsertRef.current?.click()} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Insert Image"><ImageIcon size={18} /></button>
        <input type="file" ref={imageInsertRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      </div>
      
      <div className="flex-1 overflow-y-auto cursor-text relative" onClick={() => editorRef.current?.focus()}>
        <div
          ref={editorRef}
          contentEditable={!isProcessing}
          className="outline-none min-h-full px-6 py-4 prose max-w-none pb-24 text-orange-600 caret-orange-600"
          style={{
            '--tw-prose-body': '#ea580c',
            '--tw-prose-headings': '#ea580c',
            '--tw-prose-lead': '#ea580c',
            '--tw-prose-links': '#2563eb',
            '--tw-prose-bold': '#ea580c',
            '--tw-prose-counters': '#ea580c',
            '--tw-prose-bullets': '#ea580c',
            '--tw-prose-hr': '#cbd5e1',
            '--tw-prose-quotes': '#ea580c',
            '--tw-prose-quote-borders': '#ea580c',
            '--tw-prose-captions': '#ea580c',
            '--tw-prose-code': '#ea580c',
            '--tw-prose-pre-code': '#ea580c',
            '--tw-prose-pre-bg': '#1e293b',
            '--tw-prose-th-borders': '#ea580c',
            '--tw-prose-td-borders': '#ea580c',
          } as React.CSSProperties}
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
            }
          }}
          onPaste={handlePaste}
          onMouseUp={checkFormats}
          onKeyUp={checkFormats}
        />
        {text === "" && (
            <div className="absolute top-4 left-6 text-slate-400 pointer-events-none select-none">
                Start typing your messy notes, paste images, or <b>paste URLs</b> for analysis...
            </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-4 z-10">
        {/* Attachments List */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative group animate-fade-in-up">
                {preview.type === 'pdf' ? (
                  <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-lg flex flex-col items-center justify-center text-red-500 shadow-sm">
                    <FileIcon size={24} />
                    <span className="text-[10px] uppercase font-bold mt-1">PDF</span>
                  </div>
                ) : preview.type === 'audio' ? (
                  <div className="h-16 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center px-2 shadow-sm min-w-[120px]">
                      <div className="flex flex-col items-center justify-center w-full">
                         <div className="flex items-center gap-1 text-indigo-600 mb-1">
                            <Music size={16} />
                            <span className="text-[10px] font-bold uppercase">Audio</span>
                         </div>
                         <audio 
                           src={preview.url} 
                           controls 
                           className="w-24 h-6 text-[10px]" 
                           style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}
                         />
                      </div>
                  </div>
                ) : (
                  <img
                    src={preview.url}
                    alt="attachment"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm bg-white"
                  />
                )}
                <button
                  onClick={() => onRemoveFile(index)}
                  className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 rounded-full p-1 shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100 z-10"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-lg text-sm font-medium transition-all shadow-sm"
              disabled={isProcessing}
            >
              <Paperclip size={18} />
              <span className="hidden sm:inline">Attach File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAttachmentChange}
              className="hidden"
              multiple
              accept="image/*,.pdf,audio/*"
            />
            
            <AudioRecorder 
               onRecordingComplete={(file) => onAddFiles([file])} 
               disabled={isProcessing}
            />

            <div className="text-xs text-slate-400 hidden sm:block ml-2">
              Images, PDF & Audio
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <UserCog size={16} className="text-slate-500" />
               </div>
               <select
                 value={role}
                 onChange={(e) => onRoleChange(e.target.value as NoteRole)}
                 disabled={isProcessing}
                 className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors w-full sm:w-auto"
               >
                 <option value="autosar">AutoSAR Expert</option>
                 <option value="notebooklm">NotebookLM (Doc/Audio)</option>
                 <option value="general">General Smart Note</option>
               </select>
               <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                 <ChevronDown size={14} className="text-slate-400" />
               </div>
             </div>

            <button
              onClick={onGenerate}
              disabled={isProcessing || (text.trim() === '' && previews.length === 0)}
              className={`
                flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all
                ${isProcessing || (text.trim() === '' && previews.length === 0)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="text-yellow-300" />
                  <span>Generate Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {selectionPopover && (
        <div 
          className="fixed z-50 animate-in zoom-in-95 duration-200"
          style={{ 
            left: selectionPopover.x, 
            top: selectionPopover.y,
            transform: 'translateX(-50%)'
          }}
        >
          <button
            onClick={handleFloatingChatClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-700 hover:scale-105 transition-all text-xs font-medium"
          >
            <MessageCircleQuestion size={14} className="text-blue-300" />
            <span>Ask AI</span>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 absolute top-full left-1/2 -translate-x-1/2"></div>
          </button>
        </div>
      )}

      <div onMouseDown={(e) => handleMouseDownResize(e, 'left')} className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-slate-50 transition-colors z-30 group" style={{ transform: 'translateX(-50%)' }}>
        <div className={`w-1 h-12 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors ${resizingSide === 'left' ? 'bg-blue-500' : ''}`} />
      </div>
      <div onMouseDown={(e) => handleMouseDownResize(e, 'right')} className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-slate-50 transition-colors z-30 group" style={{ transform: 'translateX(50%)' }}>
        <div className={`w-1 h-12 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors ${resizingSide === 'right' ? 'bg-blue-500' : ''}`} />
      </div>
    </div>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}