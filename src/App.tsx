import { useState, useRef, useEffect, useMemo, ChangeEvent } from "react";
import { Mic, MicOff, Radio, StopCircle, Settings2, User, Globe, MessageCircle, Image as ImageIcon, Send, History } from "lucide-react";
import { motion } from "motion/react";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";

const THEMES = {
  "Ice Blue": {
    textAccent: "text-blue-500",
    textLight: "text-blue-300",
    textDark: "text-blue-600",
    textMuted: "text-blue-200",
    bgAccent: "bg-blue-500",
    bgParticle: "bg-blue-400",
    bgEye: "bg-blue-100",
    bgAccent70: "bg-blue-500/70",
    bgAccent50: "bg-blue-500/50",
    bgGlow: "bg-blue-900/5",
    bgDark60: "bg-blue-900/60",
    borderLight: "border-blue-500/30",
    borderLighter: "border-blue-500/20",
    borderLightest: "border-blue-500/10",
    borderDark: "border-blue-900/50",
    borderDarker: "border-blue-900/30",
    borderDark40: "border-blue-900/40",
    borderHover: "hover:border-blue-700/50",
    headGradient: "from-blue-300 via-blue-600",
    torsoGradient: "from-blue-400 via-blue-800",
    shadowParticle: "shadow-[0_0_10px_rgba(96,165,250,0.8)]",
    shadowHead: "shadow-[0_0_40px_rgba(37,99,235,0.2)]",
    shadowTorso: "shadow-[0_-10px_30px_rgba(37,99,235,0.1)]",
    shadowText: "shadow-[0_0_20px_rgba(37,99,235,0.2)]",
    hoverBg: "hover:bg-blue-900/30",
    hoverText: "hover:text-blue-100"
  },
  "Mystic Purple": {
    textAccent: "text-purple-500",
    textLight: "text-purple-300",
    textDark: "text-purple-600",
    textMuted: "text-purple-200",
    bgAccent: "bg-purple-500",
    bgParticle: "bg-purple-400",
    bgEye: "bg-purple-100",
    bgAccent70: "bg-purple-500/70",
    bgAccent50: "bg-purple-500/50",
    bgGlow: "bg-purple-900/5",
    bgDark60: "bg-purple-900/60",
    borderLight: "border-purple-500/30",
    borderLighter: "border-purple-500/20",
    borderLightest: "border-purple-500/10",
    borderDark: "border-purple-900/50",
    borderDarker: "border-purple-900/30",
    borderDark40: "border-purple-900/40",
    borderHover: "hover:border-purple-700/50",
    headGradient: "from-purple-300 via-purple-600",
    torsoGradient: "from-purple-400 via-purple-800",
    shadowParticle: "shadow-[0_0_10px_rgba(192,132,252,0.8)]",
    shadowHead: "shadow-[0_0_40px_rgba(147,51,234,0.2)]",
    shadowTorso: "shadow-[0_-10px_30px_rgba(147,51,234,0.1)]",
    shadowText: "shadow-[0_0_20px_rgba(147,51,234,0.2)]",
    hoverBg: "hover:bg-purple-900/30",
    hoverText: "hover:text-purple-100"
  },
  "Fiery Orange": {
    textAccent: "text-orange-500",
    textLight: "text-orange-300",
    textDark: "text-orange-600",
    textMuted: "text-orange-200",
    bgAccent: "bg-orange-500",
    bgParticle: "bg-orange-400",
    bgEye: "bg-orange-100",
    bgAccent70: "bg-orange-500/70",
    bgAccent50: "bg-orange-500/50",
    bgGlow: "bg-orange-900/5",
    bgDark60: "bg-orange-900/60",
    borderLight: "border-orange-500/30",
    borderLighter: "border-orange-500/20",
    borderLightest: "border-orange-500/10",
    borderDark: "border-orange-900/50",
    borderDarker: "border-orange-900/30",
    borderDark40: "border-orange-900/40",
    borderHover: "hover:border-orange-700/50",
    headGradient: "from-orange-300 via-orange-600",
    torsoGradient: "from-orange-400 via-orange-800",
    shadowParticle: "shadow-[0_0_10px_rgba(251,146,60,0.8)]",
    shadowHead: "shadow-[0_0_40px_rgba(234,88,12,0.2)]",
    shadowTorso: "shadow-[0_-10px_30px_rgba(234,88,12,0.1)]",
    shadowText: "shadow-[0_0_20px_rgba(234,88,12,0.2)]",
    hoverBg: "hover:bg-orange-900/30",
    hoverText: "hover:text-orange-100"
  }
};
type ThemeName = keyof typeof THEMES;

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Interaction State
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [speakingStyle, setSpeakingStyle] = useState<"neutral" | "excited" | "thoughtful">("neutral");
  const [userTranscription, setUserTranscription] = useState("");
  const [messages, setMessages] = useState<{ id: string, role: string, text: string, timestamp: any }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const genieTranscriptBuffer = useRef<string>("");
  const genieTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const recognitionRef = useRef<any>(null);
  const transcriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [userName, setUserName] = useState("");
  const [voiceVoice, setVoiceVoice] = useState("Aoede");
  const [voicePitch, setVoicePitch] = useState(1.0);
  const voicePitchRef = useRef(1.0);
  useEffect(() => { voicePitchRef.current = voicePitch; }, [voicePitch]);
  const [mode, setMode] = useState("friend");
  const [theme, setTheme] = useState<ThemeName>("Ice Blue");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.name) setUserName(data.name);
          if (data.voice) setVoiceVoice(data.voice);
          if (data.pitch !== undefined) setVoicePitch(data.pitch);
          if (data.mode) setMode(data.mode);
          if (data.theme) setTheme(data.theme);
        } else {
          // Initialize if new
          await setDoc(userDocRef, { name: currentUser.displayName || "", voice: "Aoede", pitch: 1.0, mode: "friend", theme: "Ice Blue" });
          setUserName(currentUser.displayName || "");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        const styles = ["neutral", "excited", "thoughtful"];
        setSpeakingStyle(styles[Math.floor(Math.random() * styles.length)] as any);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isSpeaking]);

  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // 0 to 100%
      y: Math.random() * 100, // 0 to 100%
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 3,
    }));
  }, []);

  const saveSettingsToDb = async () => {
    if (user) {
      await setDoc(doc(db, "users", user.uid), { name: userName, voice: voiceVoice, pitch: voicePitch, mode: mode, theme: theme }, { merge: true });
    }
    setShowSettings(false);
  }

  const saveMessage = async (role: "user" | "genie", text: string) => {
    if (!text.trim()) return;
    if (!user) {
      setMessages(prev => [...prev, { id: Date.now().toString() + Math.random().toString(), role, text }]);
      return;
    }
    try {
      await addDoc(collection(db, "users", user.uid, "messages"), {
        role,
        text,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to save message", e);
    }
  };

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "users", user.uid, "messages"), orderBy("timestamp", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() });
        });
        setMessages(msgs);
      });
      return () => unsubscribe();
    } else {
      setMessages([]);
    }
  }, [user]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
      setError("Failed to sign in");
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = async () => {
    setError(null);
    try {
      const getGreetingTime = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 18) return 'afternoon';
        return 'evening';
      };

      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams({
        name: userName,
        voice: voiceVoice,
        mode: mode,
        timeOfDay: getGreetingTime()
      });
      const ws = new WebSocket(`${protocol}//${location.host}/live?${params.toString()}`);
      wsRef.current = ws;

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;

      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = outputAudioCtx.currentTime;

      if (inputAudioCtx.state === 'suspended') await inputAudioCtx.resume();
      if (outputAudioCtx.state === 'suspended') await outputAudioCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                saveMessage("user", event.results[i][0].transcript);
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }
            if (interimTranscript) {
               setUserTranscription(interimTranscript);
            }
            
            if (transcriptionTimeoutRef.current) clearTimeout(transcriptionTimeoutRef.current);
            transcriptionTimeoutRef.current = setTimeout(() => {
              setUserTranscription("");
            }, 3000);
          };
          recognitionRef.current.start();
        }
      } catch (err) {
        console.warn("Speech recognition not supported or failed to start", err);
      }

      const source = inputAudioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const filteredRms = rms < 0.015 ? 0 : rms;
        setUserVolume(filteredRms);

        if (ws.readyState === WebSocket.OPEN) {
          // Noise Gate: Filter out background noise
          let outputData = inputData;
          if (filteredRms === 0) {
            // Send silence instead of background noise
            outputData = new Float32Array(inputData.length);
          }
          const base64 = pcmToBase64(outputData);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected") {
           setIsConnected(true);
           if (mode === "interpreter") {
             if (userName) {
               ws.send(JSON.stringify({ text: `Hello, I'm ${userName}. I need your help interpreting today. Please briefly confirm.` }));
             } else {
               ws.send(JSON.stringify({ text: `Hello! I need an interpreter. Can you help me?` }));
             }
           } else {
             if (userName) {
               ws.send(JSON.stringify({ text: `Hello! I am ${userName}. Please explain what my name means, and then introduce yourself.` }));
             } else {
               ws.send(JSON.stringify({ text: `Hello! Please ask me for my name.` }));
             }
           }
        }
        if (msg.type === "error") {
           setError(msg.message);
           disconnect();
        }
        if (msg.text) {
          genieTranscriptBuffer.current += msg.text;
          if (genieTranscriptTimeoutRef.current) clearTimeout(genieTranscriptTimeoutRef.current);
          genieTranscriptTimeoutRef.current = setTimeout(() => {
            if (genieTranscriptBuffer.current.trim()) {
              saveMessage("genie", genieTranscriptBuffer.current.trim());
              genieTranscriptBuffer.current = "";
            }
          }, 1500);
        }
        
        if (msg.audio && outputAudioCtxRef.current) {
          playAudioChunk(outputAudioCtxRef.current, msg.audio);
          setIsSpeaking(true);

          if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
          speakTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 500);
        }
        if (msg.interrupted && outputAudioCtxRef.current) {
          nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
          setIsSpeaking(false);
          scheduledSourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
          });
          scheduledSourcesRef.current = [];
        }
      };

      ws.onclose = () => disconnect();
      ws.onerror = (event) => {
        console.error("WebSocket error", event);
        setError("WebSocket connection failed. Please check your network or try again.");
        disconnect();
      };

    } catch (err: any) {
      console.error("Failed to connect", err);
      if (
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        err.message?.includes('Permission denied') ||
        err.message?.includes('Permission dismissed')
      ) {
        setError("Microphone access denied. Please click the microphone icon in your browser's address bar to allow access, then try again.");
      } else {
        setError("Failed to connect: " + (err.message || String(err)));
      }
      disconnect();
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) processorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') inputAudioCtxRef.current.close();
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') outputAudioCtxRef.current.close();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    if (transcriptionTimeoutRef.current) clearTimeout(transcriptionTimeoutRef.current);

    setIsConnected(false);
    setIsSpeaking(false);
    setUserVolume(0);
    setIsMuted(false);
    setUserTranscription("");
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const sendText = () => {
    if (textInput.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      saveMessage("user", textInput.trim());
      wsRef.current.send(JSON.stringify({ text: textInput.trim() }));
      setTextInput("");
    }
  };

  const sendQuickCommand = (cmd: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      saveMessage("user", cmd);
      wsRef.current.send(JSON.stringify({ text: cmd }));
    }
  };

  const QUICK_COMMANDS = [
    "Tell me a joke",
    "What is the weather like?",
    "Summarize this for me",
    "Give me some advice"
  ];

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && wsRef.current?.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        wsRef.current?.send(JSON.stringify({ image: base64, mimeType: file.type }));
      };
      reader.readAsDataURL(file);
    }
  };

  const pcmToBase64 = (pcmData: Float32Array) => {
    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < pcmData.length; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const playAudioChunk = (ctx: AudioContext, base64Audio: string) => {
    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x8000;
    }
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = voicePitchRef.current;
    source.connect(ctx.destination);
    
    scheduledSourcesRef.current.push(source);
    source.onended = () => {
      scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
    };

    if (nextStartTimeRef.current < ctx.currentTime) {
      nextStartTimeRef.current = ctx.currentTime;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration / voicePitchRef.current;
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  const genieState = !isConnected ? "offline" 
    : isSpeaking ? speakingStyle 
    : userVolume > 0.01 ? "listening" 
    : "idle";

  const avatarVariants = {
    offline: { y: 0, opacity: 0.5, filter: "grayscale(100%)" },
    idle: { y: [-5, 5, -5], opacity: 1, filter: "grayscale(0%)", transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
    listening: { y: [2, 6, 2], scale: 1.02, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
    neutral: { y: [-2, 2, -2], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
    excited: { y: [-8, 2, -8], scale: 1.05, transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" } },
    thoughtful: { y: [-2, 2, -2], rotate: [0, 2, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
  };

  const currentTheme = THEMES[theme] || THEMES["Ice Blue"];

  return (
    <div className="min-h-screen bg-[#0a0c14] text-neutral-100 flex flex-col items-center justify-center font-sans overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-4xl max-h-4xl rounded-full ${currentTheme.bgGlow} blur-[120px]`}
          animate={{
            scale: isSpeaking ? [1, 1.05, 1] : 1,
            opacity: isSpeaking ? 0.2 : 0.1,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex-1 w-full max-w-5xl flex flex-col relative items-center justify-center p-8 z-10">
        
        {/* Unified Top Header Bar */}
        <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-50 pointer-events-none">
          {/* Top Left: Title */}
          <div className="flex flex-col z-20 pointer-events-auto">
            <span className={`text-[10px] ${currentTheme.textDark} font-bold tracking-[0.2em] uppercase mb-1`}>
              Neural Presence Active
            </span>
            <h1 className="text-2xl font-light tracking-wide text-white">
              FROSTIE <span className={`font-bold ${currentTheme.textAccent}`}>LIVE</span>
            </h1>
          </div>

          {/* Top Right: Status & Controls */}
          <div className="flex items-center gap-8 z-20 pointer-events-auto">
            {/* Connection Strength */}
            <div className="flex items-center gap-3 hidden sm:flex">
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-neutral-600 font-bold tracking-widest uppercase mb-0.5">Connection Strength</span>
                <span className="text-[9px] text-emerald-500 font-mono tracking-wider">
                  {isConnected ? "98.4 MS / STABLE" : "OFFLINE"}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#121524] border border-blue-900/30 flex items-center justify-center">
                <motion.div 
                  className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-neutral-600'}`}
                  animate={{ opacity: isConnected ? [1, 0.5, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {isConnected && (
                <button 
                  onClick={disconnect}
                  className="px-5 py-2.5 rounded-full bg-red-900/20 text-red-400 border border-red-500/30 hover:bg-red-900/40 hover:scale-105 transition-all flex items-center gap-2 font-medium text-xs shadow-lg shadow-red-900/10 backdrop-blur-sm uppercase tracking-wider"
                >
                  <StopCircle className="w-4 h-4" />
                  Disconnect
                </button>
              )}
              
              <button 
                onClick={() => setShowHistory(true)}
                className={`p-2.5 rounded-full bg-[#121524] border ${currentTheme.borderDarker} text-neutral-400 hover:text-white ${currentTheme.hoverBg} hover:scale-105 transition-all shadow-lg backdrop-blur-sm`}
              >
                <History className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className={`p-2.5 rounded-full bg-[#121524] border ${currentTheme.borderDarker} text-neutral-400 hover:text-white ${currentTheme.hoverBg} hover:scale-105 transition-all shadow-lg backdrop-blur-sm`}
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* History Overlay */}
        {showHistory && (
          <div className="absolute inset-0 z-50 flex justify-end bg-neutral-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`w-full max-w-md h-full bg-[#0a0c14] border-l ${currentTheme.borderDarker} shadow-2xl flex flex-col`}
            >
              <div className={`p-6 border-b ${currentTheme.borderDarker} flex justify-between items-center bg-[#121524]`}>
                <div className="flex items-center gap-3">
                  <History className={`w-5 h-5 ${currentTheme.textAccent}`} />
                  <h2 className="text-lg font-medium text-white tracking-wide">Neural Archives</h2>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className={`text-neutral-400 hover:text-white ${currentTheme.hoverBg} p-2 rounded-full transition-colors`}
                >
                  <StopCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                {messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <span className={`text-[10px] font-bold tracking-wider uppercase mb-1 ${msg.role === 'user' ? currentTheme.textAccent : 'text-neutral-500'}`}>
                      {msg.role === 'user' ? userName || 'User' : 'Frostie'}
                    </span>
                    <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                      msg.role === 'user' 
                        ? `${currentTheme.bgAccent} text-white rounded-br-sm shadow-lg` 
                        : `bg-[#121524] border ${currentTheme.borderDarker} text-neutral-200 rounded-bl-sm shadow-md`
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                    <MessageCircle className={`w-12 h-12 ${currentTheme.textMuted}`} />
                    <p className={`text-sm ${currentTheme.textMuted} max-w-[200px]`}>No neural traces found. The archive is empty.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-full max-w-md bg-[#121524] border ${currentTheme.borderDark} rounded-2xl p-6 shadow-2xl`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-white">System Configuration</h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <StopCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <User className="w-4 h-4" /> Your Name
                  </label>
                  <input 
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-blue-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter your name..."
                  />
                </div>

                {/* Voice */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <Radio className="w-4 h-4" /> AI Voice
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVoiceVoice("Aoede")}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        voiceVoice === "Aoede" 
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                          : "bg-[#0a0c14] border-blue-900/30 text-neutral-400 hover:border-blue-900/60"
                      }`}
                    >
                      Female (Aoede)
                    </button>
                    <button
                      onClick={() => setVoiceVoice("Puck")}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        voiceVoice === "Puck" 
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                          : "bg-[#0a0c14] border-blue-900/30 text-neutral-400 hover:border-blue-900/60"
                      }`}
                    >
                      Male (Puck)
                    </button>
                  </div>
                </div>

                {/* Voice Pitch */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Voice Pitch</span>
                    <span className="text-blue-400 font-mono text-xs">{voicePitch.toFixed(2)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Interaction Mode
                  </label>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setMode("friend")}
                      className={`px-4 py-4 rounded-lg border flex items-center gap-3 transition-colors ${
                        mode === "friend" 
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                          : "bg-[#0a0c14] border-blue-900/30 text-neutral-400 hover:border-blue-900/60"
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-white">Conversational Friend</div>
                        <div className="text-xs opacity-70">Casual chatting and companionship.</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setMode("interpreter")}
                      className={`px-4 py-4 rounded-lg border flex items-center gap-3 transition-colors ${
                        mode === "interpreter" 
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                          : "bg-[#0a0c14] border-blue-900/30 text-neutral-400 hover:border-blue-900/60"
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-white">Real-time Interpreter</div>
                        <div className="text-xs opacity-70">Live translation between languages.</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Color Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(THEMES) as ThemeName[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          theme === t 
                            ? `${THEMES[t].bgAccent50} border-neutral-600 ${THEMES[t].textAccent}` 
                            : `bg-[#0a0c14] border-neutral-800 text-neutral-400 hover:border-neutral-600`
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className={`mt-8 pt-6 border-t ${currentTheme.borderDarker}`}>
                <button
                  onClick={saveSettingsToDb}
                  className={`w-full ${currentTheme.bgAccent} text-white font-medium py-3 rounded-lg opacity-90 hover:opacity-100 transition-colors shadow-lg`}
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}



        {/* Abstract Avatar Centerpiece (Neural Presence) */}
        <div className="relative w-[36rem] h-96 flex items-center justify-center mt-12 mb-24">
          
          {/* Background Concentric Rings */}
          {isConnected && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              <div className={`absolute w-64 h-64 rounded-full border ${currentTheme.borderLight}`} />
              <div className={`absolute w-80 h-80 rounded-full border ${currentTheme.borderLighter} border-t-transparent`} />
              <div className={`absolute w-96 h-96 rounded-full border ${currentTheme.borderLightest} border-b-transparent`} />
            </motion.div>
          )}

          {/* Dynamic Particle Field */}
          {isConnected && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-96 h-96" style={{ maskImage: "radial-gradient(circle, black 30%, transparent 70%)" }}>
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    className={`absolute rounded-full ${currentTheme.bgParticle} ${currentTheme.shadowParticle}`}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: p.size,
                      height: p.size,
                    }}
                    animate={{
                      y: [0, -50, 0],
                      x: [0, Math.random() * 30 - 15, 0],
                      opacity: isSpeaking ? [0.4, 1, 0.4] : [0.1, 0.6, 0.1],
                      scale: isSpeaking ? [1, 1.5, 1] : [1, 1.2, 1],
                    }}
                    transition={{
                      duration: isSpeaking ? p.duration * 0.7 : p.duration,
                      repeat: Infinity,
                      delay: p.delay,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Left Floating Panel (Active Emotion) */}
          {isConnected && (
             <motion.div 
               className={`absolute left-0 top-1/3 -translate-y-1/2 bg-[#121524]/80 border ${currentTheme.borderDark} rounded-lg p-3 w-40 backdrop-blur-md shadow-xl`}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.2 }}
             >
               <div className={`text-[9px] ${currentTheme.textAccent} font-bold tracking-wider mb-2 uppercase`}>Active Emotion</div>
               <div className="flex gap-1 mb-2 items-end h-6">
                 <motion.div className={`w-8 ${currentTheme.bgAccent} rounded-sm`} animate={{ height: isSpeaking ? [12, 24, 12] : 16 }} transition={{ duration: 0.5, repeat: Infinity }} />
                 <motion.div className={`w-6 ${currentTheme.bgAccent70} rounded-sm`} animate={{ height: isSpeaking ? [16, 8, 16] : 10 }} transition={{ duration: 0.5, delay: 0.1, repeat: Infinity }} />
                 <motion.div className={`w-10 ${currentTheme.bgAccent50} rounded-sm`} animate={{ height: isSpeaking ? [12, 20, 12] : 14 }} transition={{ duration: 0.5, delay: 0.2, repeat: Infinity }} />
               </div>
               <div className={`text-[9px] ${currentTheme.textLight} font-mono`}>EMPATHY LEVEL: {isSpeaking ? "94%" : "89%"}</div>
             </motion.div>
          )}

          {/* Right Floating Panel (Recall Cache) */}
          {isConnected && (
             <motion.div 
               className={`absolute right-0 top-2/3 -translate-y-1/2 bg-[#121524]/80 border ${currentTheme.borderDark} rounded-lg p-4 w-52 backdrop-blur-md shadow-xl`}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.4 }}
             >
               <div className={`text-[9px] ${currentTheme.textAccent} font-bold tracking-wider mb-2 uppercase`}>Recall Cache</div>
               <ul className={`text-[9px] ${currentTheme.textMuted} space-y-2 font-mono opacity-80`}>
                 <li>• User identity confirmed</li>
                 <li>• Active voice: {voiceVoice}</li>
                 <li>• Mode set to: {mode}</li>
               </ul>
             </motion.div>
          )}

          {/* The Avatar */}
          {isConnected && (
            <motion.div 
              className="relative flex flex-col items-center z-10"
              variants={avatarVariants}
              initial="idle"
              animate={genieState}
            >
               {/* Head */}
               <div className={`w-32 h-32 rounded-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${currentTheme.headGradient} to-slate-900 ${currentTheme.shadowHead} flex items-center justify-center z-20`}>
                  {/* Slit Eye / Mouth */}
                  <motion.div 
                    className={`w-10 h-1.5 ${currentTheme.bgEye} rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]`}
                    animate={{ 
                      scaleY: isSpeaking ? [1, 3, 1] : 1,
                      scaleX: isSpeaking ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.2, repeat: isSpeaking ? Infinity : 0, repeatDelay: 1.5 }}
                  />
               </div>

               {/* Torso */}
               <div className={`w-56 h-28 mt-[-10px] bg-[linear-gradient(to_bottom,_var(--tw-gradient-stops))] ${currentTheme.torsoGradient} to-slate-950 rounded-t-full opacity-90 ${currentTheme.shadowTorso} z-10`} />
            </motion.div>
          )}

          {/* User Transcription Overlay */}
          {isConnected && userTranscription && (
            <motion.div 
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm text-center z-30 pointer-events-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={`inline-block px-4 py-2 bg-[#121524]/90 border ${currentTheme.bgDark60} rounded-lg backdrop-blur-md ${currentTheme.shadowText}`}>
                <p className={`text-[11px] ${currentTheme.textMuted} font-mono tracking-wide`}>
                  <span className={`${currentTheme.textAccent} mr-2`}>YOU:</span>
                  "{userTranscription}"
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Voice Processing Visualizer */}
        <div className="absolute bottom-36 left-10 right-10 flex flex-col gap-2 z-10 pointer-events-none opacity-80">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-1 h-6">
               <motion.div className={`w-1 ${currentTheme.bgAccent} rounded-full`} animate={{ height: userVolume > 0.01 ? [4, 12, 4] : 4 }} transition={{ duration: 0.3, repeat: Infinity }} />
               <motion.div className={`w-1 ${currentTheme.bgAccent} rounded-full`} animate={{ height: userVolume > 0.01 ? [4, 20, 4] : 8 }} transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }} />
               <motion.div className={`w-1 ${currentTheme.bgAccent} rounded-full`} animate={{ height: userVolume > 0.01 ? [4, 16, 4] : 6 }} transition={{ duration: 0.3, repeat: Infinity, delay: 0.2 }} />
               <motion.div className={`w-1 ${currentTheme.bgAccent} rounded-full`} animate={{ height: userVolume > 0.01 ? [4, 8, 4] : 10 }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }} />
               <motion.div className={`w-1 ${currentTheme.bgAccent} rounded-full`} animate={{ height: userVolume > 0.01 ? [4, 24, 4] : 4 }} transition={{ duration: 0.2, repeat: Infinity, delay: 0.1 }} />
            </div>
            <div className="text-[8px] text-neutral-600 font-medium tracking-widest uppercase mb-1">Voice Processing</div>
          </div>
          <div className={`w-full h-px ${currentTheme.borderDarker} relative bg-neutral-900`}>
            <motion.div 
              className={`absolute left-0 top-0 h-full ${currentTheme.bgAccent}`}
              animate={{ width: isSpeaking ? "100%" : userVolume > 0.01 ? "40%" : "0%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* User Interaction Area */}
        <div className="absolute bottom-12 w-full flex flex-col items-center gap-6 px-4">
          
          <div className="text-center w-full max-w-sm min-h-[3rem] flex flex-col justify-center">
            {error ? (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm font-medium bg-red-400/10 py-2 px-4 rounded-lg border border-red-400/20">
                {error}
              </motion.p>
            ) : (
              <motion.p 
                key={isConnected ? "connected" : "disconnected"}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-neutral-400 text-sm"
              >
                {!isConnected ? "Initiate connection to begin conversation." : "Connection established. Speak freely..."}
              </motion.p>
            )}
          </div>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={connect}
                className="group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium text-lg transition-all duration-500 overflow-hidden bg-white text-neutral-950 hover:bg-neutral-200 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              >
                <Mic className="w-5 h-5" />
                <span className="relative z-10">Connect System</span>
              </button>
              {!user && (
                <button
                  onClick={handleSignIn}
                  className="text-neutral-500 text-sm hover:text-white transition-colors"
                >
                  Sign in with Google to save history
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full max-w-lg z-20">
               {/* Quick Commands */}
               <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                 {QUICK_COMMANDS.map((cmd, idx) => (
                   <button
                     key={idx}
                     onClick={() => sendQuickCommand(cmd)}
                     className={`whitespace-nowrap px-4 py-2 rounded-full bg-[#121524] border ${currentTheme.borderDark40} ${currentTheme.textLight} text-[11px] font-medium tracking-wide ${currentTheme.hoverBg} ${currentTheme.borderHover} ${currentTheme.hoverText} transition-all shadow-md`}
                   >
                     {cmd}
                   </button>
                 ))}
               </div>

               <div className="flex items-center gap-2">
                 <button 
                   onClick={toggleMute}
                   className={`p-3 rounded-full border transition-colors ${isMuted ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'}`}
                 >
                   {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                 </button>
                 
                 <div className="flex-1 flex items-center bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2">
                   <input
                     type="text"
                     value={textInput}
                     onChange={(e) => setTextInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && sendText()}
                     placeholder="Type a message..."
                     className="flex-1 bg-transparent text-white focus:outline-none px-2"
                   />
                   <button onClick={sendText} className="text-cyan-400 hover:text-cyan-300 p-2">
                     <Send className="w-4 h-4" />
                   </button>
                 </div>

                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="p-3 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white hover:bg-neutral-800 transition-colors"
                 >
                   <ImageIcon className="w-5 h-5" />
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </button>

               </div>
               
               <div className="text-center text-[9px] text-neutral-600 font-medium tracking-widest uppercase mt-4 mb-2">
                 Developed by Hive studios creator Ndugga Sharif
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
