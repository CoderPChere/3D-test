"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Search, Loader2, CheckCircle, Database } from "lucide-react";

const STAGES = [
    { id: "analyze", label: "ANALYZING BINARY DATA", speed: 1.5 },
    { id: "resolve", label: "SUPER-RESOLUTION PASS", speed: 2 },
    { id: "deblur", label: "DEBLUR-GAN ENHANCEMENT", speed: 1.8 },
    { id: "extract", label: "OCR PLATE EXTRACTION", speed: 1 },
];

export default function AIDetectionView() {
    const [currentStage, setCurrentStage] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [plate, setPlate] = useState("");

    useEffect(() => {
        if (currentStage < STAGES.length) {
            const timer = setTimeout(() => {
                setCurrentStage(prev => prev + 1);
            }, STAGES[currentStage].speed * 1000);
            return () => clearTimeout(timer);
        } else {
            setIsComplete(true);
            // Typewriter effect for plate
            const targetPlate = "GJ 01 BV 4220";
            let i = 0;
            const typeInterval = setInterval(() => {
                setPlate(targetPlate.slice(0, i));
                i++;
                if (i > targetPlate.length) clearInterval(typeInterval);
            }, 100);
        }
    }, [currentStage]);

    return (
        <div className="w-full max-w-4xl mx-auto p-8 glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Visual Enhancement Side */}
                <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                    {/* Blurry Background */}
                    <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center transition-all duration-1000 ${isComplete ? 'blur-0' : 'blur-xl'}`} />

                    {/* Scanning Line */}
                    {!isComplete && (
                        <motion.div
                            animate={{ top: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-neon-cyan shadow-[0_0_15px_#22d3ee] z-10"
                        />
                    )}

                    {/* Holographic Overlay on Image */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-24 border-2 border-dashed border-neon-cyan/50 rounded-lg flex items-center justify-center">
                            <span className="text-[10px] text-neon-cyan font-mono animate-pulse">
                                TARGET_LOCATED: SECTOR_7
                            </span>
                        </div>
                    </div>
                </div>

                {/* Data/Status Side */}
                <div className="flex flex-col justify-between py-4">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                            <Database className="text-neon-cyan" size={20} />
                            Neural Processing Unit
                        </h3>

                        <div className="space-y-4">
                            {STAGES.map((stage, i) => (
                                <div key={stage.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${i <= currentStage ? 'border-neon-cyan bg-neon-cyan/10' : 'border-slate-800'}`}>
                                            {i < currentStage ? <CheckCircle className="text-neon-cyan" size={14} /> :
                                                i === currentStage ? <Loader2 className="text-neon-cyan animate-spin" size={14} /> :
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />}
                                        </div>
                                        <span className={`text-xs font-mono tracking-tighter ${i === currentStage ? 'text-neon-cyan' : i < currentStage ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                    {i === currentStage && (
                                        <span className="text-[10px] text-neon-cyan font-mono animate-pulse">ACTIVE</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] uppercase text-slate-500 tracking-widest mb-1">Decoded Plate</p>
                                <p className="text-4xl font-black hologram-text font-mono h-10">{plate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase text-slate-500 tracking-widest mb-1">Confidence</p>
                                <p className="text-2xl font-mono text-neon-cyan">{isComplete ? "98.42%" : "---"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
