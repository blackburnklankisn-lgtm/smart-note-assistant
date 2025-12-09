export interface NoteInput {
  text: string;
  images: File[];
}

export interface NoteResult {
  markdown: string;
  timestamp: number;
}

export interface ImagePreview {
  file: File;
  url: string;
  type: 'image' | 'pdf';
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type NoteRole = 'autosar' | 'notebooklm' | 'general' | 'weekly';

export interface NoteSession {
  id: string;
  title: string;
  inputText: string; // Contains HTML content with inline base64 images
  attachments: ImagePreview[];
  result: NoteResult | null;
  status: AppStatus;
  error: string | null;
  createdAt: number;
  role: NoteRole;
}