"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function AnimatedTrafficSignal() {
    const [activeLight, setActiveLight] = useState<"red" | "yellow" | "green">("green");

    useEffect(() => {
        const cycle = () => {
            setActiveLight((current) => {
                if (current === "green") return "yellow";
                if (current === "yellow") return "red";
                return "green";
            });
        };
        const interval = setInterval(cycle, 3000); // 3 seconds per light
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-[600px] flex items-center justify-center">
            {/* Holographic Projection Base */}
            <div className="absolute bottom-10 w-64 h-16 bg-neon-cyan/5 blur-[20px] rounded-[100%]" />
            <div className="absolute bottom-14 w-40 h-6 bg-neon-cyan/20 blur-[10px] rounded-[100%]" />
            <div className="absolute bottom-0 w-[2px] h-32 bg-gradient-to-t from-transparent to-white/10" />
            
            <div className="relative glass rounded-[40px] p-8 border border-white/10 flex flex-col gap-8 shadow-[0_0_50px_rgba(34,211,238,0.05)] backdrop-blur-md z-10 bg-black/40">
                {/* Red Light */}
                <div className="relative w-24 h-24 rounded-full bg-black/80 border border-white/5 flex items-center justify-center shadow-inner">
                    <motion.div
                        animate={{
                            opacity: activeLight === "red" ? 1 : 0.1,
                            scale: activeLight === "red" ? 1.05 : 1,
                            boxShadow: activeLight === "red" ? "0 0 40px #ef4444, 0 0 80px #ef4444, inset 0 0 20px #fff" : "0 0 0px #ef4444",
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-20 h-20 rounded-full bg-red-500"
                    />
                </div>

                {/* Yellow Light */}
                <div className="relative w-24 h-24 rounded-full bg-black/80 border border-white/5 flex items-center justify-center shadow-inner">
                    <motion.div
                        animate={{
                            opacity: activeLight === "yellow" ? 1 : 0.1,
                            scale: activeLight === "yellow" ? 1.05 : 1,
                            boxShadow: activeLight === "yellow" ? "0 0 40px #eab308, 0 0 80px #eab308, inset 0 0 20px #fff" : "0 0 0px #eab308",
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-20 h-20 rounded-full bg-yellow-500"
                    />
                </div>

                {/* Green Light */}
                <div className="relative w-24 h-24 rounded-full bg-black/80 border border-white/5 flex items-center justify-center shadow-inner">
                    <motion.div
                        animate={{
                            opacity: activeLight === "green" ? 1 : 0.1,
                            scale: activeLight === "green" ? 1.05 : 1,
                            boxShadow: activeLight === "green" ? "0 0 40px #22c55e, 0 0 80px #22c55e, inset 0 0 20px #fff" : "0 0 0px #22c55e",
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-20 h-20 rounded-full bg-green-500"
                    />
                </div>
            </div>
            
            {/* Cybernetic Accents */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-neon-cyan/20 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-neon-blue/10 rounded-full border-dashed animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full border-dotted animate-[spin_20s_linear_infinite]" />
            
            {/* Data Overlay */}
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 glass px-4 py-3 border border-neon-cyan/30 rounded-xl bg-black/60 backdrop-blur-lg z-20">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                    <p className="text-[10px] font-mono text-white uppercase tracking-widest">Network Node</p>
                </div>
                <p className="text-[10px] font-mono text-neon-cyan uppercase tracking-widest mb-1">State: {activeLight}</p>
                <div className="h-[1px] w-full bg-white/20 my-2" />
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Rate: {activeLight === 'red' ? '0' : activeLight === 'yellow' ? '450' : '900'} V/H</p>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Zone: {activeLight === 'red' ? 'HIGH CONG.' : activeLight === 'yellow' ? 'MED CONG.' : 'CLEAR'}</p>
            </div>
        </div>
    );
}
