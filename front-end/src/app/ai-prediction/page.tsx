"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/UI/Navbar";
import AIChatbot from "@/components/UI/AIChatbot";
import AuthSection from "@/components/UI/AuthSection";
import ProfileModal from "@/components/UI/ProfileModal";

import AnimatedTrafficSignal from "@/components/UI/AnimatedTrafficSignal";
import { site } from "@/config/site";
import { useSession, clearSession } from "@/lib/auth";
import NotConfigured from "@/components/UI/NotConfigured";

type User = { name: string; email: string; role?: string; token?: string };

export default function AIPredictionPage() {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Session restore from localStorage (external store, read without an effect).
    // Local `user` covers login/profile-save and takes precedence when present.
    const session = useSession();
    const sessionUser: User | null =
        session && session.email
            ? { name: session.name || session.email.split("@")[0], email: session.email, role: session.role || "viewer", token: session.token }
            : null;
    const activeUser = user ?? sessionUser;

    return (
        <main className="relative min-h-screen bg-background overflow-hidden flex flex-col">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0 pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />
            
            {/* Global Navigation */}
            <Navbar 
                user={activeUser} 
                onLoginClick={() => setIsAuthOpen(true)} 
                onProfileClick={() => setIsProfileOpen(true)} 
            />

            {/* Modals */}
            <AuthSection 
                isOpen={isAuthOpen} 
                onClose={() => setIsAuthOpen(false)} 
                onSuccess={(userData) => setUser(userData)} 
            />
            
            <ProfileModal 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                user={activeUser} 
                onSave={(updatedUser) => setUser(updatedUser)} 
                onLogout={() => {
                    setUser(null);
                    setIsProfileOpen(false);
                    clearSession();
                }} 
            />

            {/* Main Content Area */}
            <section className="relative flex-1 flex flex-col items-center justify-center px-8 pt-32 pb-12 z-10 w-full max-w-[1600px] mx-auto">
                {site.features.auth && !activeUser ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-12 rounded-3xl border border-red-500/20 text-center max-w-xl bg-red-500/5 backdrop-blur-2xl"
                    >
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Access Denied</h2>
                        <p className="text-slate-400 font-mono text-sm leading-relaxed mb-8">
                            This sector is restricted to authorized {site.name} Operatives only. Please authenticate your credentials to access neural traffic predictions.
                        </p>
                        <button 
                            onClick={() => setIsAuthOpen(true)}
                            className="neon-border bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Initiate Authentication
                        </button>
                    </motion.div>
                ) : (
                    <>
                        <div className="w-full mb-16 text-center">
                            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2">
                                Neural Traffic <span className="text-neon-cyan">Predictor</span>
                            </h1>
                            <p className="text-slate-400 font-mono text-sm tracking-[0.2em] uppercase">
                                AI-Driven Congestion Forecasting & Analysis
                            </p>
                        </div>
                        
                        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                            <div className="lg:col-span-7 lg:col-start-2 w-full">
                                {site.features.chatbot && site.api.chatbot ? (
                                    <AIChatbot />
                                ) : (
                                    <div className="flex justify-center">
                                        <NotConfigured service="AI chatbot" />
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-3 lg:col-start-9 w-full flex justify-center pt-12">
                                <AnimatedTrafficSignal />
                            </div>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
