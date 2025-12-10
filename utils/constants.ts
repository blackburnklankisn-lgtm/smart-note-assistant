import { NoteSession, AppStatus } from '../types';

export const RESET_AI_STYLE = `
  color: #1e293b; 
  --tw-prose-body: #334155; 
  --tw-prose-headings: #1e293b; 
  --tw-prose-lead: #475569; 
  --tw-prose-bold: #1e293b; 
  --tw-prose-counters: #64748b; 
  --tw-prose-bullets: #334155; 
  --tw-prose-hr: #e2e8f0; 
  --tw-prose-quotes: #1e293b; 
  --tw-prose-quote-borders: #e2e8f0; 
  --tw-prose-captions: #64748b; 
  --tw-prose-code: #1e293b; 
  --tw-prose-pre-code: #e2e8f0; 
  --tw-prose-pre-bg: #1e293b; 
  --tw-prose-th-borders: #e2e8f0; 
  --tw-prose-td-borders: #e2e8f0;
`.replace(/\n/g, ' ');

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const createNewNote = (title: string = ''): NoteSession => {
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0') + ' ' + 
    String(now.getHours()).padStart(2, '0') + ':' + 
    String(now.getMinutes()).padStart(2, '0') + ':' + 
    String(now.getSeconds()).padStart(2, '0');

  return {
    id: generateId(),
    title: title,
    // Automatically insert date and time styled as metadata
    inputText: `<p style="color: #94a3b8; font-size: 0.9em;">📅 ${dateStr}</p><p><br/></p>`,
    attachments: [],
    result: null,
    status: AppStatus.IDLE,
    error: null,
    createdAt: Date.now(),
    role: 'autosar', // Default role
    chatHistory: [] // Init chat history
  };
};
