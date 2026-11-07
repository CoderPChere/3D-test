"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/UI/Navbar";
import AuthSection from "@/components/UI/AuthSection";
import ProfileModal from "@/components/UI/ProfileModal";
import { Loader2, Camera, ShieldAlert, Wifi, Activity, CheckCircle, XCircle } from "lucide-react";

type User = { name: string; email: string; role?: string; token?: string };

const STREAM_URL = "http://127.0.0.1:8000/video";

export default function CCTVPage() {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isStreamLive, setIsStreamLive] = useState(false);

    // Restore session from localStorage
    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        const name = localStorage.getItem("auth_name");
        const email = localStorage.getItem("auth_email");
        const role = localStorage.getItem("auth_role");
        if (token && email) {
            setUser({ name: name || email.split("@")[0], email, role: role || "viewer", token });
        }
    }, []);

    return (
        <main className="relative min-h-screen bg-black overflow-hidden flex flex-col font-mono">
            <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 via-transparent to-neon-purple/5 pointer-events-none z-0" />

            <Navbar
                user={user}
                onLoginClick={() => setIsAuthOpen(true)}
                onProfileClick={() => setIsProfileOpen(true)}
            />

            <AuthSection
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onSuccess={(userData) => setUser(userData)}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                onSave={(u) => setUser(u)}
                onLogout={() => {
                    setUser(null);
                    setIsProfileOpen(false);
                    ["auth_token", "auth_role", "auth_name", "auth_email"].forEach(k => localStorage.removeItem(k));
                }}
            />

            <section className="relative flex-1 flex flex-col items-center justify-center px-8 pt-24 pb-12 z-10 w-full max-w-[1400px] mx-auto">
                {!user ? (
                    // --- ACCESS DENIED ---
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-12 rounded-3xl border border-red-500/20 text-center max-w-xl bg-red-500/5 backdrop-blur-2xl"
                    >
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 italic">Unauthorized Access</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            KERNEL ERROR: SECURITY_VIOLATION_DETECTED.<br />
                            Remote CCTV surveillance interface requires verified agent credentials.
                        </p>
                        <button
                            onClick={() => setIsAuthOpen(true)}
                            className="bg-red-500/10 text-red-500 border border-red-500/40 hover:bg-red-500 hover:text-white px-8 py-3 rounded-none text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                            Override & Authenticate
                        </button>
                    </motion.div>
                ) : (
                    // --- CCTV TERMINAL ---
                    <div className="w-full flex flex-col gap-6">
                        {/* Header Bar */}
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                    <Camera className="text-neon-cyan animate-pulse" />
                                    Live Tactical Feed <span className="text-neon-cyan text-sm font-mono tracking-widest">[SECTOR-07]</span>
                                </h1>
                                <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold mt-1">
                                    Helmet Violation Detection // YOLO Neural Engine Active
                                </p>
                            </div>
                            <div className="flex gap-4 text-[10px] items-center">
                                <div className={`flex items-center gap-2 ${isStreamLive ? "text-neon-cyan" : "text-slate-500"}`}>
                                    <Wifi size={12} />
                                    <span>{isStreamLive ? "STREAM: LIVE" : "STREAM: OFFLINE"}</span>
                                </div>
                                <div className={`flex items-center gap-2 ${isStreamLive ? "text-green-400" : "text-yellow-500"}`}>
                                    {isStreamLive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    <span>{isStreamLive ? "DETECTION: ACTIVE" : "AWAITING PYTHON SCRIPT"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-neon-purple">
                                    <Activity size={12} />
                                    <span>CAM_07_A</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Monitor */}
                        <div className="relative min-h-[540px] border border-white/5 rounded-2xl overflow-hidden bg-zinc-950/80 shadow-2xl group">
                            {/* Corner Brackets */}
                            <div className="absolute inset-0 pointer-events-none z-10">
                                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-neon-cyan/40 m-6" />
                                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-neon-cyan/40 m-6" />
                                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-neon-cyan/40 m-6" />
                                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-neon-cyan/40 m-6" />
                            </div>

                            {/* Always render the stream img — onLoad/onError control the UI state */}
                            <img
                                src={STREAM_URL}
                                alt="Live CCTV Feed"
                                className={`w-full h-full object-contain transition-opacity duration-500 ${isStreamLive ? "opacity-100" : "opacity-0 absolute"}`}
                                onLoad={() => setIsStreamLive(true)}
                                onError={() => setIsStreamLive(false)}
                            />

                            {/* Loading overlay — shown while stream is not yet live */}
                            <AnimatePresence>
                                {!isStreamLive && (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center gap-6"
                                    >
                                        <div className="relative">
                                            <div className="w-24 h-24 border-2 border-white/5 rounded-full flex items-center justify-center">
                                                <Loader2 className="w-12 h-12 text-neon-cyan animate-spin" strokeWidth={1} />
                                            </div>
                                            <div className="absolute inset-0 border-t-2 border-neon-cyan/40 rounded-full animate-[spin_3s_linear_infinite]" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-neon-cyan text-sm font-bold uppercase tracking-[0.4em] animate-pulse mb-2">
                                                Initializing Neural Feed
                                            </p>
                                            <p className="text-slate-500 text-[9px] uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                                                Waiting for Python script...<br />
                                                Run: <span className="text-neon-cyan">uvicorn server:app</span> to start the feed.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* REC + Timestamp overlay — only shown when live */}
                            {isStreamLive && (
                                <>
                                    <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-black/60 px-3 py-1 rounded">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" />
                                        <span className="text-[10px] font-bold text-white tracking-widest">REC</span>
                                    </div>
                                    <div className="absolute top-6 right-6 z-20 bg-black/60 px-3 py-1 rounded text-[10px] text-white font-bold font-mono">
                                        {new Date().toLocaleTimeString()}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Bottom Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: "Helmet Detection", status: isStreamLive ? "Active" : "Standby", live: isStreamLive },
                                { label: "Facial Recognition", status: "Standby", live: false },
                                { label: "Plate Indexing", status: "Standby", live: false },
                                { label: "Anomaly Analysis", status: "Standby", live: false },
                            ].map((stat, i) => (
                                <div key={i} className={`glass p-4 border rounded-xl flex flex-col gap-1 transition-colors ${stat.live ? "border-neon-cyan/20 bg-neon-cyan/5" : "border-white/5"}`}>
                                    <span className="text-[8px] text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-bold uppercase ${stat.live ? "text-neon-cyan" : "text-white"}`}>{stat.status}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${stat.live ? "bg-neon-cyan shadow-[0_0_6px_#22d3ee] animate-pulse" : "bg-slate-600"}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
