"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { name: string; email: string } | null;
    onSave: (user: { name: string; email: string }) => void;
    onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, user, onSave, onLogout }: ProfileModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, email });
        setIsEditing(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="max-w-xl w-full glass rounded-3xl p-10 border border-white/10 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.15)]"
                    >
                        {/* Background Glow Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[100px]" />

                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="relative z-10 flex items-center gap-6 mb-10">
                            <div className="w-20 h-20 rounded-full bg-black/50 border-2 border-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                                <span className="text-3xl font-bold text-neon-purple">{user.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-white uppercase tracking-tight">{user.name}</h2>
                                <p className="text-neon-purple font-mono text-xs tracking-widest uppercase">ACTIVE OPERATIVE</p>
                            </div>
                        </div>

                        <div className="relative z-10">
                            {!isEditing ? (
                                <div className="space-y-6">
                                    <div className="bg-black/40 p-5 rounded-xl border border-white/5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Operative Callsign</p>
                                        <p className="font-mono text-lg text-white">{user.name}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-xl border border-white/5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Secure Comms Channel</p>
                                        <p className="font-mono text-lg text-white">{user.email}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-xl border border-white/5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Clearance Level</p>
                                        <p className="font-mono text-lg text-neon-cyan">LEVEL 07 - OMNI-ACCESS</p>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/10"
                                        >
                                            Edit Clearance Data
                                        </button>
                                        <button 
                                            onClick={() => { onClose(); onLogout(); }}
                                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-red-500/20"
                                        >
                                            Sever Connection
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <motion.form 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-6" 
                                    onSubmit={handleSave}
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-neon-purple tracking-widest ml-1">Update Callsign</label>
                                        <input 
                                            type="text" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-black/50 border border-neon-purple/50 rounded-xl px-5 py-4 text-white focus:border-neon-purple focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] focus:outline-none transition-all font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-neon-purple tracking-widest ml-1">Update Comms Channel</label>
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-black/50 border border-neon-purple/50 rounded-xl px-5 py-4 text-white focus:border-neon-purple focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] focus:outline-none transition-all font-mono"
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="submit"
                                            className="flex-1 bg-neon-purple/20 hover:bg-neon-purple hover:text-black text-neon-purple py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setName(user.name);
                                                setEmail(user.email);
                                            }}
                                            className="flex-1 bg-transparent hover:bg-white/10 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/20"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
