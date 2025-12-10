import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, MonitorSpeaker, Loader2, AlertCircle } from 'lucide-react';

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
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setDuration(0);
  };

  const startRecording = async () => {
    setIsPreparing(true);
    setError(null);
    try {
      // 1. Create Audio Context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const destination = ctx.createMediaStreamDestination();
      
      // 2. Get Microphone Stream
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(destination);

      // 3. Optional: Get System/Screen Audio (Ask User)
      // Note: getDisplayMedia audio capture varies by OS/Browser. 
      // On Chrome/Edge it usually works if "Share Audio" is checked in the dialog.
      let systemStream: MediaStream | null = null;
      try {
        // We ask for video: true because getDisplayMedia requires it, but we ignore the video track.
        // We explicitly request audio.
        systemStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        // If user shared audio, mix it in
        if (systemStream.getAudioTracks().length > 0) {
            const systemSource = ctx.createMediaStreamSource(systemStream);
            systemSource.connect(destination);
        } else {
            // User didn't share system audio, or OS didn't support it.
            // We just proceed with mic only, but maybe notify?
            console.log("No system audio track found. Proceeding with Mic only.");
        }
      } catch (err) {
        console.log("System audio selection cancelled or failed. Proceeding with Mic only.", err);
        // Do not block recording if user cancels screen share
      }

      // 4. Start Recorder on the mixed stream
      const mixedStream = destination.stream;
      streamRef.current = mixedStream; // Keep ref to stop later (though we really need to stop source streams)

      // Important: We need to keep track of original source streams to stop hardware lights
      const allTracks = [
        ...micStream.getTracks(),
        ...(systemStream ? systemStream.getTracks() : [])
      ];

      // Override the mixed stream stop method to stop all source tracks
      const originalStop = mixedStream.stop; // It might not have stop, but tracks do
      
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
        const file = new File([blob], `meeting-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // 1. Trigger Download (Save to Local Disk)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 2. Pass to App
        onRecordingComplete(file);

        // 3. Cleanup Tracks
        allTracks.forEach(track => track.stop());
        ctx.close();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Start Timer
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Recording failed", err);
      let errorMsg = "Failed to start recording.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Microphone access denied. Please enable it in System Settings > Privacy & Security > Microphone.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No microphone found.";
      } else if (err.message) {
        errorMsg = `${err.name}: ${err.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
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
    );
  }

  return (
    <div className="flex items-center gap-2 relative">
      <button 
        onClick={startRecording}
        disabled={disabled || isPreparing}
        className={`
           flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 rounded-lg text-sm font-medium transition-all shadow-sm
           ${disabled || isPreparing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title="Record Microphone & System Audio"
      >
        {isPreparing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
        <span className="hidden sm:inline">Record Audio</span>
      </button>
      {error && (
         <div className="absolute bottom-full left-0 mb-2 w-max max-w-xs bg-red-800 text-white text-xs px-3 py-2 rounded shadow-lg flex items-start gap-2 z-50 animate-fade-in">
           <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
           <span>{error}</span>
           <button onClick={() => setError(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
         </div>
      )}
    </div>
  );
};