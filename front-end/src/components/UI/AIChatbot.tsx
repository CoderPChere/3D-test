"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
    id: string;
    sender: "user" | "ai";
    text: string;
    timestamp: Date;
};

export default function AIChatbot() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "system-init",
            sender: "ai",
            text: "NEURAL LINK ESTABLISHED. I am the CityFluxy AI Intelligence. How can I assist you with traffic predictions today?",
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: "user",
            text: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            // Attempt to contact local Ollama instance
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            const response = await fetch("your_ngrok_link/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3.2:3b", // Updated to the user-specified model
                    prompt: `You are a highly advanced futuristic AI traffic intelligence system called CityFluxy AI. Respond to the user's inquiry concisely and professionally. Ensure answers have a cybernetic or analytical tone. User query: ${userMsg.text}`,
                    stream: false
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error("Failed to connect to Neural Net (Ollama)");
            }

            const data = await response.json();
            
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                text: data.response || "No data recovered.",
                timestamp: new Date()
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (error: any) {
            console.error("Ollama Error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                text: "ERROR: Connection to Ollama instance (wilhelmina-thrawn-spindly.ngrok-free.dev) refused. Please ensure the model and tunnel are running.",
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="w-full h-[600px] flex flex-col glass rounded-3xl border border-white/10 relative overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)]">
            {/* Ambient Backgrounds */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-neon-cyan/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-neon-blue/10 rounded-full blur-[80px]" />
            
            {/* Header */}
            <div className="relative z-10 px-8 py-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                            <span className="text-neon-cyan font-bold text-lg font-mono">AI</span>
                        </div>
                        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-black" />
                    </div>
                    <div className="flex flex-col justify-center min-h-[40px]">
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm md:text-base leading-tight">Traffic Intelligence AI</h2>
                        <p className="text-neon-cyan font-mono text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 leading-tight">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                            Ollama Link Active
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10 scrollbar-hide">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div 
                                className={`max-w-[80%] p-5 rounded-2xl ${
                                    msg.sender === "user" 
                                    ? "bg-neon-blue/20 border border-neon-blue/40 rounded-tr-sm" 
                                    : "bg-black/60 border border-white/10 rounded-tl-sm backdrop-blur-md"
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] uppercase font-bold tracking-widest ${msg.sender === "user" ? "text-neon-blue" : "text-neon-cyan"}`}>
                                        {msg.sender === "user" ? "Operative" : "CityFluxy AI"}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-slate-200 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.text}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-black/60 border border-white/10 rounded-2xl rounded-tl-sm p-4 backdrop-blur-md flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: "300ms" }} />
                            <span className="text-[10px] text-neon-cyan font-mono ml-2 uppercase tracking-widest">Processing</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="relative z-10 p-6 border-t border-white/10 bg-black/40">
                <form onSubmit={handleSendMessage} className="relative flex items-center w-full">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Query traffic intelligence..."
                        className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-16 py-4 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan focus:bg-white/10 transition-all placeholder:text-slate-600"
                        disabled={isTyping}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neon-cyan/20 hover:bg-neon-cyan flex items-center justify-center transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4 text-neon-cyan group-hover:text-black transition-colors transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
