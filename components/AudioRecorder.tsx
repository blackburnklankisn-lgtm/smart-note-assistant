import React, { useState, useRef, useEffect } from 'react';
import { Square, Loader2, AlertCircle, MonitorSpeaker } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamsRef = useRef<MediaStream[]>([]); 
  const timerRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Stop all tracked streams
    streamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setDuration(0);
  };

  const executeRecording = async () => {
    setIsPreparing(true);
    setError(null);
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const destination = ctx.createMediaStreamDestination();

      // 1. Get System Audio (via Screen Share)
      // Since we implemented setDisplayMediaRequestHandler in main.js, this will
      // automatically receive the main screen stream + loopback audio WITHOUT a popup.
      let systemStream: MediaStream | null = null;
      let hasSystemAudio = false;

      try {
        // Request video:true required by Electron for displayMedia, audio:true for system sound
        systemStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        // Even with auto-select, we verify we got an audio track
        if (systemStream.getAudioTracks().length > 0) {
          hasSystemAudio = true;
          const systemSource = ctx.createMediaStreamSource(systemStream);
          const systemGain = ctx.createGain();
          systemGain.gain.value = 1.0; 
          systemSource.connect(systemGain).connect(destination);
        } else {
          console.warn("System audio track missing even with loopback. Recording Mic only.");
        }
      } catch (err) {
        console.warn("Screen share/System audio failed or cancelled", err);
        // Continue to record mic only if screen share fails
      }

      // 2. Get Microphone Audio
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Mix Streams
      const micSource = ctx.createMediaStreamSource(micStream);
      const micGain = ctx.createGain();
      micGain.gain.value = 1.0;
      micSource.connect(micGain).connect(destination);

      // Track streams
      streamsRef.current = [micStream];
      if (systemStream) streamsRef.current.push(systemStream);

      // 4. Setup Recorder
      const mixedStream = destination.stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';

      const recorder = new MediaRecorder(mixedStream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const filename = `meeting-recording-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.webm`;
        const file = new File([blob], filename, { type: 'audio/webm' });
        
        // Auto Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onRecordingComplete(file);
        stopRecordingCleanup();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Recording failed", err);
      stopRecordingCleanup();

      let errorMsg = "Failed to start recording.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Permission denied. Check System Settings.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "Microphone not found.";
      }
      setError(errorMsg);
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {isRecording ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-red-700 font-mono text-sm font-medium w-12">{formatTime(duration)}</span>
          <div className="h-4 w-px bg-red-200 mx-1"></div>
          <button 
            onClick={stopRecording}
            className="p-1 rounded bg-white text-red-600 shadow-sm hover:bg-red-100 transition-colors"
            title="Stop Recording & Save"
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={executeRecording}
            disabled={disabled || isPreparing}
            className={`
               flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 rounded-lg text-sm font-medium transition-all shadow-sm
               ${disabled || isPreparing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title="Record Meeting (Mic + Speaker)"
          >
            {isPreparing ? <Loader2 size={18} className="animate-spin" /> : <MonitorSpeaker size={18} />}
            <span className="hidden sm:inline">Record Meeting</span>
          </button>
          
          {error && (
             <div className="absolute bottom-full left-0 mb-2 w-72 bg-red-900/95 backdrop-blur text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-start gap-3 z-50 animate-in slide-in-from-bottom-2">
               <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-200" />
               <div className="flex-1">
                 <p className="font-semibold mb-1">Recording Failed</p>
                 <p className="leading-relaxed opacity-90">{error}</p>
               </div>
               <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 p-1"><Square size={12} /></button>
             </div>
          )}
        </div>
      )}
    </>
  );
};