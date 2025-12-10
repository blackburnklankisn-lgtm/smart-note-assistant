import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, MonitorSpeaker, X } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); // State for custom modal

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

  const handleInitialClick = () => {
    setError(null);
    setShowGuide(true);
  };

  const executeRecording = async () => {
    setShowGuide(false);
    setIsPreparing(true);
    setError(null);
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const destination = ctx.createMediaStreamDestination();

      // 1. Get System Audio (via Screen Share)
      // Browsers rely on User Activation here. Since this function is called directly
      // from the Modal button click, permission should be granted.
      let systemStream: MediaStream | null = null;
      let hasSystemAudio = false;

      try {
        // Request video:true required by Chrome/Electron for displayMedia, audio:true for system sound
        systemStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        if (systemStream.getAudioTracks().length > 0) {
          hasSystemAudio = true;
          const systemSource = ctx.createMediaStreamSource(systemStream);
          const systemGain = ctx.createGain();
          systemGain.gain.value = 1.0; 
          systemSource.connect(systemGain).connect(destination);
        } else {
          // Fallback if user didn't check the box
          // We can't use confirm here easily without breaking async flow again, 
          // but we can just proceed with Mic Only and let user know via UI notification or console
          console.warn("System audio track missing. Recording Mic only.");
        }
      } catch (err) {
        // User cancelled screen share picker
        setIsPreparing(false);
        return;
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
            onClick={handleInitialClick}
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

      {/* Custom Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 border border-slate-100 relative">
            <button 
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <MonitorSpeaker size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Record Meeting Audio</h3>
              
              <div className="text-left text-sm text-slate-600 bg-slate-50 p-4 rounded-xl mb-6 space-y-3 border border-slate-100 w-full">
                <div className="flex gap-2">
                   <span className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                   <span>Select <b>"Entire Screen"</b> tab in the next popup.</span>
                </div>
                <div className="flex gap-2">
                   <span className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                   <span><b>Check the box</b> at bottom-left: <br/><i>"Share system audio"</i></span>
                </div>
              </div>

              <button 
                onClick={executeRecording}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                Start Recording Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
