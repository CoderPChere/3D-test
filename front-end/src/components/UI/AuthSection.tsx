"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = "http://localhost:8000";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: { name: string; email: string; role: string; token: string }) => void;
}

export default function AuthSection({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [organization, setOrganization] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const resetForm = () => {
        setName(""); setEmail(""); setPassword(""); setOrganization(""); setError(null);
    };

    const handleToggle = () => {
        setIsLogin(!isLogin);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let response: Response;

            if (isLogin) {
                response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, organization }),
                });
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Authentication failed. Please try again.");
            }

            // Store token & user data in localStorage for session persistence
            const userName = data.name || name || email.split("@")[0];
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("auth_role", data.role);
            localStorage.setItem("auth_email", email);
            localStorage.setItem("auth_name", userName);

            onSuccess({
                name: userName,
                email,
                role: data.role,
                token: data.access_token,
            });

            resetForm();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="max-w-2xl w-full glass rounded-3xl p-16 border border-white/10 relative overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)]"
                    >
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-neon-cyan/20 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-neon-blue/20 rounded-full blur-[80px]" />

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="relative z-10 text-center mb-10">
                            <h2 className="text-5xl font-bold text-white mb-4 uppercase tracking-tight">
                                {isLogin ? "Neural Access" : "Network Register"}
                            </h2>
                            <p className="text-slate-400 font-mono text-xs tracking-widest uppercase">
                                {isLogin ? "Authenticate to initiate sector-07 uplink" : "Create new operative identity"}
                            </p>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="relative z-10 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-xs font-mono text-red-400"
                                >
                                    ⚠ {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? "login" : "signup"}
                                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase font-bold text-slate-300 tracking-widest ml-1">Operative Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                required={!isLogin}
                                                className="w-full bg-black/50 border border-white/20 rounded-xl px-6 py-4 text-white focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] focus:outline-none transition-all font-mono placeholder:text-slate-600"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-slate-300 tracking-widest ml-1">Secure Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="operative@nexus.corp"
                                            required
                                            className="w-full bg-black/50 border border-white/20 rounded-xl px-6 py-4 text-white focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] focus:outline-none transition-all font-mono placeholder:text-slate-600"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-slate-300 tracking-widest ml-1">Uplink Cipher</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full bg-black/50 border border-white/20 rounded-xl px-6 py-4 text-white focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] focus:outline-none transition-all font-mono placeholder:text-slate-600"
                                        />
                                    </div>

                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase font-bold text-slate-300 tracking-widest ml-1">Organization / Department</label>
                                            <input
                                                type="text"
                                                value={organization}
                                                onChange={(e) => setOrganization(e.target.value)}
                                                placeholder="Traffic Dept. Sector 07"
                                                required={!isLogin}
                                                className="w-full bg-black/50 border border-white/20 rounded-xl px-6 py-4 text-white focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] focus:outline-none transition-all font-mono placeholder:text-slate-600"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full neon-border bg-neon-cyan/20 py-5 rounded-xl text-sm font-bold text-white uppercase tracking-[0.3em] hover:bg-neon-cyan hover:text-black transition-all mt-6 group disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                </svg>
                                                Authenticating...
                                            </span>
                                        ) : (
                                            <span className="group-hover:scale-105 inline-block transition-transform relative z-10">
                                                {isLogin ? "Initiate Uplink" : "Authorize Creation"}
                                            </span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        </AnimatePresence>

                        <div className="relative z-10 mt-8 text-center">
                            <button
                                onClick={handleToggle}
                                type="button"
                                className="text-xs uppercase font-bold text-slate-400 hover:text-neon-cyan transition-colors tracking-widest"
                            >
                                {isLogin ? "New Operative? Register Identity" : "Existing Identity? Initiate Login"}
                            </button>
                        </div>

                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent animate-pulse pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
