import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  BookOpen,
  Brain,
  Mic,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Volume2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  Play,
  Settings,
  Zap,
  Network,
  Cpu,
  Layers,
  FileText,
  Target,
  Users,
  Palette,
  Code,
  Globe,
  Monitor,
  Smartphone,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useDropzone } from "react-dropzone";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ROLES, TIERS } from "./constants";
import * as gemini from "./services/geminiService";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[0] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "chat" | "tools">("summary");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [imageToAnalyze, setImageToAnalyze] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState("");
  const [imageConfig, setImageConfig] = useState({ aspectRatio: "1:1", imageSize: "1K" });

  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const sessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleEditImage = async () => {
    if (!imageToAnalyze || !userInput.trim()) return;
    setIsLoading(true);
    try {
      const edited = await gemini.editImage(imageToAnalyze, userInput);
      setImageToAnalyze(edited);
    } catch (error) {
      console.error("Image edit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startLiveSession = async () => {
    if (isLiveActive) {
      sessionRef.current?.close();
      setIsLiveActive(false);
      return;
    }

    try {
      const ai = new (await import("@google/genai")).GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              const audioContext = new AudioContext({ sampleRate: 16000 });
              const source = audioContext.createMediaStreamSource(stream);
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                sessionRef.current?.sendRealtimeInput({ media: { data: base64Data, mimeType: "audio/pcm;rate=16000" } });
              };
              source.connect(processor);
              processor.connect(audioContext.destination);
              (sessionRef.current as any)._audioCleanup = () => {
                stream.getTracks().forEach(t => t.stop());
                processor.disconnect();
                source.disconnect();
                audioContext.close();
              };
            });
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
              audio.play();
            }
            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setLiveTranscription(prev => prev + " " + message.serverContent?.modelTurn?.parts[0]?.text);
            }
          },
          onclose: () => {
            setIsLiveActive(false);
            (sessionRef.current as any)._audioCleanup?.();
          },
          onerror: (err) => console.error("Live error:", err),
        },
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are the ${selectedRole?.name || "App Expert"}. Engage in a real-time voice conversation about your expertise.`,
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Live session start error:", error);
    }
  };

  const handleRoleSelect = async (role: typeof ROLES[0]) => {
    setSelectedRole(role);
    setSummary("");
    setQuestions([]);
    setActiveTab("summary");
    setIsLoading(true);

    try {
      const prompt = `As an expert ${role.name}, provide a masterclass summary of your knowledge base: ${role.knowledgeBase}. 
      Then, generate 3 thought-provoking questions that a student should be able to answer after learning this. 
      Format: 
      ## Summary
      [Summary content]
      ## Questions
      1. [Question 1]
      2. [Question 2]
      3. [Question 3]`;

      const response = await gemini.getGeminiResponse(prompt, "gemini-2.5-flash-lite");
      const [summaryPart, questionsPart] = response.split("## Questions");
      setSummary(summaryPart.replace("## Summary", "").trim());
      setQuestions(questionsPart.split("\n").filter(q => q.trim() && /^\d\./.test(q.trim())).map(q => q.replace(/^\d\.\s*/, "")));
    } catch (error) {
      console.error("Error fetching role info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || !selectedRole) return;

    const userMsg = userInput;
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setUserInput("");
    setIsLoading(true);

    try {
      let response;
      if (isThinking) {
        response = await gemini.getThinkingResponse(`As an expert ${selectedRole.name}, answer this complex query: ${userMsg}`);
      } else {
        response = await gemini.getGeminiResponse(`As an expert ${selectedRole.name}, answer: ${userMsg}`, "gemini-3.1-pro-preview");
      }
      setChatMessages((prev) => [...prev, { role: "ai", text: response }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    try {
      const img = await gemini.generateImage(userInput, imageConfig.aspectRatio, imageConfig.imageSize);
      setGeneratedImage(img);
    } catch (error) {
      console.error("Image gen error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnimateImage = async () => {
    if (!imageToAnalyze) return;
    setIsLoading(true);
    try {
      const video = await gemini.generateVideo("Animate this image beautifully", imageToAnalyze);
      setGeneratedVideo(video);
    } catch (error) {
      console.error("Video gen error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(audioBlob);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          setIsLoading(true);
          try {
            const text = await gemini.transcribeAudio(base64Audio);
            setTranscription(text);
            setUserInput(text);
          } catch (error) {
            console.error("Transcription error:", error);
          } finally {
            setIsLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Mic access error:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const onDropImage = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      setImageToAnalyze(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onDropImage,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleAnalyzeImage = async () => {
    if (!imageToAnalyze) return;
    setIsLoading(true);
    try {
      const analysis = await gemini.analyzeImage(imageToAnalyze, "Analyze this image in the context of app building and design.");
      setImageAnalysis(analysis);
    } catch (error) {
      console.error("Image analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTTS = async (text: string) => {
    setIsLoading(true);
    try {
      const base64Audio = await gemini.generateSpeech(text);
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
      }
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1A1A1A]/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">App Builder Masterclass</h1>
              <p className="text-xs text-[#1A1A1A]/60 uppercase tracking-widest font-medium">The Library of Experts</p>
            </div>
          </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={startLiveSession}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                  isLiveActive ? "bg-red-500 text-white animate-pulse" : "bg-[#5A5A40] text-white hover:bg-[#5A5A40]/80"
                )}
              >
                <Volume2 size={16} />
                {isLiveActive ? "LIVE VOICE ACTIVE" : "START LIVE VOICE"}
              </button>
              <button className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors">
              <Settings size={20} />
            </button>
            <div className="h-8 w-px bg-[#1A1A1A]/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#5A5A40]/10 rounded-full">
              <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-[#5A5A40]">AI ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar: Role Selector */}
        <aside className="lg:col-span-4 space-y-8">
          <section>
            <h2 className="text-sm font-bold text-[#1A1A1A]/40 uppercase tracking-widest mb-6">Select Expert Role</h2>
            <div className="space-y-3">
              {ROLES.map((role) => (
                <motion.button
                  key={role.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                    selectedRole?.id === role.id
                      ? "bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-xl shadow-[#1A1A1A]/20"
                      : "bg-white border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 hover:shadow-lg"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "text-xs font-mono font-bold w-6 h-6 rounded-lg flex items-center justify-center",
                      selectedRole?.id === role.id ? "bg-white/20 text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/40"
                    )}>
                      {role.id}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm">{role.name}</h3>
                      <p className={cn(
                        "text-[10px] uppercase tracking-wider font-medium mt-0.5",
                        selectedRole?.id === role.id ? "text-white/60" : "text-[#1A1A1A]/40"
                      )}>
                        {role.produces}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className={cn(
                    "transition-transform",
                    selectedRole?.id === role.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  )} />
                </motion.button>
              ))}
            </div>
          </section>

          {/* System Tiers */}
          <section className="p-6 bg-[#1A1A1A]/5 rounded-3xl border border-[#1A1A1A]/10">
            <h2 className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest mb-4">System Architecture</h2>
            <div className="space-y-4">
              {TIERS.map((tier) => (
                <div key={tier.id}>
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                    <Layers size={12} />
                    {tier.name}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {tier.docs.map((doc) => (
                      <span key={doc} className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#1A1A1A]/5 text-[#1A1A1A]/60">
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-[#1A1A1A]/5 shadow-sm"
              >
                <div className="w-24 h-24 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] mb-8">
                  <BookOpen size={48} />
                </div>
                <h2 className="text-3xl font-serif italic mb-4">Welcome to the Masterclass</h2>
                <p className="text-[#1A1A1A]/60 max-w-md leading-relaxed">
                  Select an expert role from the library to begin your journey. Each role contains a deep knowledge base of what lives in the head of a master app builder.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedRole.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {/* Role Header */}
                <div className="bg-[#1A1A1A] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase">Expert Role {selectedRole.id}</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <h2 className="text-4xl font-serif italic mb-4">{selectedRole.name}</h2>
                    <p className="text-white/70 text-lg leading-relaxed max-w-2xl">{selectedRole.description}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-[#1A1A1A]/5 w-fit">
                  {(["summary", "chat", "tools"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        activeTab === tab ? "bg-[#1A1A1A] text-white shadow-lg" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-[40px] border border-[#1A1A1A]/5 p-10 min-h-[500px] shadow-sm">
                  {activeTab === "summary" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-10"
                    >
                      {isLoading && !summary ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="w-12 h-12 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
                          <p className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Accessing Knowledge Base...</p>
                        </div>
                      ) : (
                        <>
                          <section>
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="text-sm font-bold text-[#1A1A1A]/40 uppercase tracking-widest flex items-center gap-2">
                                <Brain size={16} />
                                Knowledge Summary
                              </h3>
                              <button 
                                onClick={() => handleTTS(summary)}
                                className="p-2 hover:bg-[#1A1A1A]/5 rounded-full text-[#5A5A40]"
                              >
                                <Volume2 size={20} />
                              </button>
                            </div>
                            <div className="markdown-body text-[#1A1A1A]/80 leading-relaxed space-y-4">
                              <ReactMarkdown
                                components={{
                                  h1: ({ node, ...props }) => <h1 className="text-2xl font-serif italic mt-6 mb-4" {...props} />,
                                  h2: ({ node, ...props }) => <h2 className="text-xl font-serif italic mt-5 mb-3" {...props} />,
                                  h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                  p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
                                  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                  strong: ({ node, ...props }) => <strong className="font-bold text-[#1A1A1A]" {...props} />,
                                }}
                              >
                                {summary}
                              </ReactMarkdown>
                            </div>
                          </section>

                          <section className="pt-10 border-t border-[#1A1A1A]/5">
                            <h3 className="text-sm font-bold text-[#1A1A1A]/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                              <HelpCircle size={16} />
                              Mastery Questions
                            </h3>
                            <div className="grid gap-4">
                              {questions.map((q, i) => (
                                <div key={i} className="group p-6 bg-[#F5F2ED] rounded-3xl border border-transparent hover:border-[#5A5A40]/30 transition-all flex gap-4">
                                  <span className="text-xl font-serif italic text-[#5A5A40] opacity-40">0{i + 1}</span>
                                  <p className="font-medium text-[#1A1A1A]/80">{q}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        </>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "chat" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col h-[600px]"
                    >
                      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4 scrollbar-hide">
                        {chatMessages.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-center text-[#1A1A1A]/40">
                            <MessageSquare size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Ask the {selectedRole.name} anything about their expertise.</p>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex flex-col max-w-[80%]",
                              msg.role === "user" ? "ml-auto items-end" : "items-start"
                            )}
                          >
                            <div className={cn(
                              "p-5 rounded-3xl text-sm leading-relaxed",
                              msg.role === "user" 
                                ? "bg-[#1A1A1A] text-white rounded-tr-none" 
                                : "bg-[#F5F2ED] text-[#1A1A1A] rounded-tl-none border border-[#1A1A1A]/5"
                            )}>
                              <ReactMarkdown
                                components={{
                                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                  ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                  code: ({ node, ...props }) => <code className="bg-black/10 px-1 rounded font-mono text-xs" {...props} />,
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                            <span className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest mt-2 px-2">
                              {msg.role === "user" ? "You" : selectedRole.name}
                            </span>
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex items-center gap-2 text-[#5A5A40] animate-pulse">
                            <Brain size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Expert is thinking...</span>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleSendMessage} className="relative">
                        <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder={`Consult with the ${selectedRole.name}...`}
                          className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/10 rounded-2xl py-4 pl-6 pr-32 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all"
                        />
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setIsThinking(!isThinking)}
                            className={cn(
                              "p-2 rounded-xl transition-all flex items-center gap-2",
                              isThinking ? "bg-[#5A5A40] text-white" : "hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/40"
                            )}
                            title="Deep Thinking Mode"
                          >
                            <Network size={16} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              isRecording ? "bg-red-500 text-white animate-pulse" : "hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/40"
                            )}
                          >
                            <Mic size={16} />
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !userInput.trim()}
                            className="p-2 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#1A1A1A]/80 disabled:opacity-50 transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === "tools" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      {/* Image Generation */}
                      <section className="space-y-6 p-8 bg-[#F5F2ED] rounded-[32px] border border-[#1A1A1A]/5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon size={16} />
                            Visual Ideation
                          </h3>
                        </div>
                        <div className="space-y-4">
                          <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Describe a UI concept or brand asset..."
                            className="w-full bg-white border border-[#1A1A1A]/10 rounded-2xl p-4 text-xs h-24 focus:outline-none focus:border-[#5A5A40]"
                          />
                          <div className="flex flex-wrap gap-2">
                            <select 
                              value={imageConfig.aspectRatio}
                              onChange={(e) => setImageConfig(prev => ({ ...prev, aspectRatio: e.target.value }))}
                              className="bg-white border border-[#1A1A1A]/10 rounded-xl px-3 py-2 text-[10px] font-bold"
                            >
                              {["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"].map(ar => <option key={ar} value={ar}>{ar}</option>)}
                            </select>
                            <select 
                              value={imageConfig.imageSize}
                              onChange={(e) => setImageConfig(prev => ({ ...prev, imageSize: e.target.value }))}
                              className="bg-white border border-[#1A1A1A]/10 rounded-xl px-3 py-2 text-[10px] font-bold"
                            >
                              {["1K", "2K", "4K"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                            </select>
                            <button
                              onClick={handleGenerateImage}
                              disabled={isLoading || !userInput.trim()}
                              className="flex-1 bg-[#1A1A1A] text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A]/80 transition-all flex items-center justify-center gap-2"
                            >
                              <Sparkles size={14} />
                              Generate
                            </button>
                          </div>
                          {generatedImage && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative group">
                              <img src={generatedImage} alt="Generated" className="w-full rounded-2xl shadow-xl" referrerPolicy="no-referrer" />
                              <button 
                                onClick={() => setGeneratedImage(null)}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </section>

                      {/* Image Analysis & Video */}
                      <section className="space-y-6 p-8 bg-[#F5F2ED] rounded-[32px] border border-[#1A1A1A]/5">
                        <h3 className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest flex items-center gap-2">
                          <Monitor size={16} />
                          Asset Analysis & Animation
                        </h3>
                        <div className="space-y-4">
                          {!imageToAnalyze ? (
                            <div {...getRootProps()} className="border-2 border-dashed border-[#1A1A1A]/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#5A5A40]/30 transition-all bg-white">
                              <input {...getInputProps()} />
                              <Upload size={32} className="text-[#1A1A1A]/20 mb-4" />
                              <p className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Drop asset here or click to upload</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="relative group">
                                <img src={imageToAnalyze} alt="To Analyze" className="w-full rounded-2xl shadow-lg" referrerPolicy="no-referrer" />
                                <button 
                                  onClick={() => { setImageToAnalyze(null); setImageAnalysis(""); setGeneratedVideo(null); }}
                                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleAnalyzeImage}
                                  disabled={isLoading}
                                  className="flex-1 bg-[#5A5A40] text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#5A5A40]/80 transition-all flex items-center justify-center gap-2"
                                >
                                  <Search size={14} />
                                  Analyze
                                </button>
                                <button
                                  onClick={handleAnimateImage}
                                  disabled={isLoading}
                                  className="flex-1 bg-[#1A1A1A] text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A]/80 transition-all flex items-center justify-center gap-2"
                                >
                                  <Video size={14} />
                                  Animate
                                </button>
                                <button
                                  onClick={handleEditImage}
                                  disabled={isLoading || !userInput.trim()}
                                  className="flex-1 bg-[#5A5A40] text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#5A5A40]/80 transition-all flex items-center justify-center gap-2"
                                >
                                  <Palette size={14} />
                                  Edit
                                </button>
                              </div>
                              {imageAnalysis && (
                                <div className="p-4 bg-white rounded-2xl border border-[#1A1A1A]/5 text-[11px] leading-relaxed text-[#1A1A1A]/70">
                                  <ReactMarkdown>{imageAnalysis}</ReactMarkdown>
                                </div>
                              )}
                              {generatedVideo && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Veo Generation</p>
                                  <video src={generatedVideo} controls className="w-full rounded-2xl shadow-xl" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-[#1A1A1A]/5 mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[#1A1A1A]/5 rounded-lg flex items-center justify-center text-[#1A1A1A]/40">
              <Globe size={16} />
            </div>
            <p className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Built for the next generation of app architects</p>
          </div>
          <div className="flex items-center gap-6">
            {["Strategy", "Design", "Build", "Scale"].map((item) => (
              <span key={item} className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest hover:text-[#1A1A1A] cursor-default transition-colors">
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
