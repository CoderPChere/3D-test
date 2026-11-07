"use client";

import { motion } from "framer-motion";

interface NavbarProps {
    user: { name: string; email: string } | null;
    onLoginClick: () => void;
    onProfileClick: () => void;
}

export default function Navbar({ user, onLoginClick, onProfileClick }: NavbarProps) {
    return (
        <div className="fixed top-0 left-0 w-full px-2 pt-2 z-50">
            <motion.nav 
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full px-8 py-4 flex justify-between items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan flex items-center justify-center">
                    <div className="w-3 h-3 bg-neon-cyan rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
                </div>
                <span className="text-xl font-black uppercase tracking-tighter hologram-text">CITYFLUXY</span>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden md:flex gap-6 mr-8">
                    {["Surveillance", "Database", "Protocols", "AI Prediction", "CCTV"]
                        .filter(item => (item !== "AI Prediction" && item !== "CCTV") || user)
                        .map(item => (
                            <a 
                                key={item} 
                                href={
                                    item === "AI Prediction" ? "/ai-prediction" : 
                                    item === "CCTV" ? "/cctv" : 
                                    "#"
                                } 
                                className="text-xs uppercase font-bold text-slate-400 hover:text-neon-cyan transition-colors tracking-widest"
                            >
                                {item}
                            </a>
                        ))}
                    {user && (
                        <a href="/real-time-traffic" className="text-xs uppercase font-bold text-neon-cyan hover:text-white transition-colors tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Live Traffic
                        </a>
                    )}
                </div>
                
                {user ? (
                    <button 
                        onClick={onProfileClick}
                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-colors"
                    >
                        <div className="w-6 h-6 rounded-full bg-neon-purple/20 border border-neon-purple flex items-center justify-center text-[10px] font-bold text-neon-purple">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-mono text-white tracking-wider">{user.name}</span>
                    </button>
                ) : (
                    <button 
                        onClick={onLoginClick}
                        className="neon-border bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        Agent Login
                    </button>
                )}
            </div>
            </motion.nav>

            {/* Active Surveillance Indicator */}
            <div className="mt-4 ml-2 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                <span className="text-xs font-mono font-bold text-slate-300 tracking-widest uppercase">
                    Active Surveillance
                </span>
            </div>
        </div>
    );
}
