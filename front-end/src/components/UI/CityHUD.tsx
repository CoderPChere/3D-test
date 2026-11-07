"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Shield, Car, Camera, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function CityHUD() {
    const [scannedCount, setScannedCount] = useState(1240);
    const [activeAlerts, setActiveAlerts] = useState(3);

    useEffect(() => {
        const interval = setInterval(() => {
            setScannedCount(prev => prev + Math.floor(Math.random() * 3));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between mt-24">
            {/* Top Bar */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    {/* Elements removed to prevent overlap with Navbar */}
                </div>

                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-end gap-2"
                >
                    <div className="glass p-4 rounded-lg text-right min-w-[200px]">
                        <h2 className="text-[10px] uppercase tracking-widest text-slate-400">Total Scans</h2>
                        <p className="text-2xl font-mono text-neon-cyan">{scannedCount.toLocaleString()}</p>
                        <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-neon-cyan"
                                animate={{ width: ["20%", "80%", "45%", "90%"] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Side Panels */}
            <div className="flex justify-between items-center h-full my-12">
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 0.7 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="w-1 h-12 bg-neon-cyan/30 rounded-full"
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-4 items-end">
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="glass p-4 rounded-lg flex flex-col gap-3 border-r-4 border-r-red-500 pointer-events-auto cursor-pointer hover:bg-red-500/10 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Active Violations</span>
                        </div>
                        <p className="text-3xl font-mono text-white">{activeAlerts}</p>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Interface */}
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="glass p-4 rounded-lg flex gap-6"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 uppercase">Latency</span>
                        <span className="text-neon-cyan font-mono">14ms</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 uppercase">Detection</span>
                        <span className="text-neon-cyan font-mono">YOLOv8x</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 uppercase">Active Cams</span>
                        <span className="text-neon-cyan font-mono">156</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-end pointer-events-auto"
                >
                    <div className="flex gap-2 mb-2">
                        <button className="glass px-4 py-2 rounded text-[10px] uppercase tracking-widest hover:bg-neon-cyan hover:text-black transition-all">
                            Initialize Sweep
                        </button>
                        <button className="glass px-4 py-2 rounded text-[10px] uppercase tracking-widest border-neon-cyan/50 hover:border-neon-cyan transition-all">
                            Log Export
                        </button>
                    </div>
                    <div className="bg-neon-cyan h-0.5 w-64" />
                </motion.div>
            </div>

            {/* Floating Noise/CRT Effect Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}
