
import React, { useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { MessageCircleQuestion } from 'lucide-react';

// Custom extension to handle AI-generated content blocks styling
import { Node, mergeAttributes } from '@tiptap/core';

const AiBlock = Node.create({
  name: 'aiBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: (node: HTMLElement) => {
          // Identify AI blocks by specific style or class if needed
          // For now, we treat generic styled divs as potential AI blocks or just rely on inner HTML
          return node.style.color === 'rgb(30, 41, 59)' || node.style.color === '#1e293b' ? {} : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { style: 'color: #1e293b;' }), 0];
  },
});

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  isEditable: boolean;
  onChatSelection?: (text: string) => void;
  editorRef?: React.MutableRefObject<any>;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ 
  content, 
  onChange, 
  isEditable, 
  onChatSelection,
  editorRef 
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Image,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false, // We handle clicks manually or let users Ctrl+Click
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your notes, paste images, or type / for commands...',
      }),
      AiBlock, // Register custom block
    ],
    content: content,
    editable: isEditable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[300px]',
        // Force User text color to Orange by default via Tailwind utility class on the root
        // But individual nodes can override this (like AI Block)
        style: 'color: #ea580c; caret-color: #2563eb;', 
      },
    },
  });

  // Expose editor instance to parent via Ref
  useEffect(() => {
    if (editor && editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // Handle external content updates (e.g. AI generation finished)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Intelligent update: preserve cursor if possible, or just emit
      // For simplicity in this architectural phase:
      // We only update if the length difference is significant (AI generation) 
      // or if it's completely different (load note)
      const isFocused = editor.isFocused;
      editor.commands.setContent(content, false); 
      if (isFocused) {
          // Try to restore focus to end if it was user typing? 
          // Usually separate AI generation updates don't happen while user types.
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const handleFloatingClick = () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (onChatSelection && text) {
      onChatSelection(text);
    }
  };

  return (
    <>
      {editor && (
        <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100 }}
            shouldShow={({ editor }) => {
                return !editor.view.state.selection.empty && isEditable;
            }}
        >
            <div className="flex items-center gap-1 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 p-1 overflow-hidden">
                <MenuButton 
                    onClick={handleFloatingClick}
                    icon={<MessageCircleQuestion size={14} className="text-blue-300" />}
                    label="Ask AI"
                />
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <MenuButton 
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    isActive={editor.isActive('bold')} 
                    label="B" 
                    bold 
                />
                <MenuButton 
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    isActive={editor.isActive('italic')} 
                    label="i" 
                    italic 
                />
                <MenuButton 
                    onClick={() => editor.chain().focus().toggleStrike().run()} 
                    isActive={editor.isActive('strike')} 
                    label="S" 
                    strike
                />
                 <MenuButton 
                    onClick={() => editor.chain().focus().setColor('#ef4444').run()} 
                    isActive={editor.isActive('textStyle', { color: '#ef4444' })} 
                    label="A"
                    color="#ef4444"
                />
            </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </>
  );
};

interface MenuButtonProps {
    onClick: () => void;
    isActive?: boolean;
    label?: string;
    icon?: React.ReactNode;
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    color?: string;
    children?: React.ReactNode; 
}

const MenuButton: React.FC<MenuButtonProps> = ({ onClick, isActive, label, icon, bold, italic, strike, color }) => (
    <button
        onClick={onClick}
        className={`
            px-2 py-1 text-xs font-medium rounded hover:bg-slate-700 transition-colors flex items-center gap-1
            ${isActive ? 'bg-slate-700 text-blue-300' : 'text-slate-300'}
            ${bold ? 'font-bold' : ''}
            ${italic ? 'italic' : ''}
            ${strike ? 'line-through' : ''}
        `}
        style={color ? { color: color } : {}}
    >
        {icon}
        {label}
    </button>
);

export default TiptapEditor;
