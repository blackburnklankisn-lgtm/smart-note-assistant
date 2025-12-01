import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download, RefreshCw } from 'lucide-react';
import { NoteResult } from '../types';

interface NoteDisplayProps {
  result: NoteResult | null;
  onReset: () => void;
}

export const NoteDisplay: React.FC<NoteDisplayProps> = ({ result, onReset }) => {
  const [copied, setCopied] = React.useState(false);

  if (!result) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-note-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Generated Note
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-200"
            title="Copy to Clipboard"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-200"
            title="Download Markdown"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onReset}
            className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-200"
            title="Create New Note"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      
      <div className="p-8 overflow-y-auto max-h-[80vh] prose prose-slate prose-blue max-w-none">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-700 mt-6 mb-3" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 text-slate-600" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-2 text-slate-600" {...props} />,
            li: ({node, ...props}) => <li className="pl-1" {...props} />,
            p: ({node, ...props}) => <p className="leading-relaxed text-slate-600 mb-4" {...props} />,
            blockquote: ({node, ...props}) => (
              <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-6 rounded-r-lg italic text-slate-700" {...props} />
            ),
            code: ({node, ...props}) => (
              // @ts-ignore
              props.inline ? 
                <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm font-mono" {...props} /> :
                <code className="block bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto my-4" {...props} />
            ),
            a: ({node, ...props}) => <a className="text-blue-600 hover:underline font-medium" {...props} />,
            hr: ({node, ...props}) => <hr className="my-8 border-slate-200" {...props} />,
          }}
        >
          {result.markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
};
