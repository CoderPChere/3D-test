"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Filter, MoreHorizontal, AlertCircle, Camera, Loader2 } from "lucide-react";

const DATA = [
    { id: "V-9842", plate: "GJ 01 BV 4220", type: "SUV", status: "CLEARED", confidence: "98.4%", time: "12:42:01" },
    { id: "V-9843", plate: "MH 12 CT 1111", type: "Sedan", status: "VIOLATION", confidence: "94.2%", time: "12:45:12" },
    { id: "V-9844", plate: "DL 03 KA 8892", type: "Truck", status: "CLEARED", confidence: "99.1%", time: "12:48:33" },
    { id: "V-9845", plate: "KA 05 MN 3341", type: "Coupe", status: "PENDING", confidence: "82.5%", time: "12:51:05" },
    { id: "V-9846", plate: "HR 26 DQ 5560", type: "Van", status: "VIOLATION", confidence: "96.8%", time: "12:55:42" },
];

interface InvestigationDashboardProps {
    user: any;
}

export default function InvestigationDashboard({ user }: InvestigationDashboardProps) {
    const handleCCTVClick = () => {
        window.location.href = "/cctv";
    };

    return (
        <div className="w-full space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-2">
                    <button className="glass px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neon-cyan border border-neon-cyan/20">
                        <Filter size={14} /> Filter Results
                    </button>
                    <button className="glass px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                        <FileText size={14} /> Export CSV
                    </button>
                    {user && (
                        <button 
                            onClick={handleCCTVClick}
                            className="neon-border bg-neon-purple/10 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neon-purple transition-all hover:bg-neon-purple/20"
                        >
                            <Camera size={14} />
                            Live CCTV Access
                        </button>
                    )}
                </div>
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 uppercase text-[10px] tracking-widest text-slate-500 font-bold">
                            <th className="px-6 py-4">Scan ID</th>
                            <th className="px-6 py-4">Plate Number</th>
                            <th className="px-6 py-4">Vehicle Type</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Confidence</th>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {DATA.map((row, i) => (
                            <motion.tr
                                key={row.id}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="hover:bg-white/5 transition-colors group"
                            >
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{row.id}</td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-white font-mono tracking-wider bg-slate-800 px-2 py-1 rounded border border-white/10">
                                        {row.plate}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-300 uppercase">{row.type}</td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${row.status === "VIOLATION" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                            row.status === "CLEARED" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                                "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${row.status === "VIOLATION" ? "bg-red-500 shadow-[0_0_8px_red]" :
                                                row.status === "CLEARED" ? "bg-green-500 shadow-[0_0_8px_green]" :
                                                    "bg-yellow-500 shadow-[0_0_8px_amber]"
                                            }`} />
                                        {row.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-full max-w-[80px] bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-neon-cyan"
                                            style={{ width: row.confidence }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-1 block font-mono">{row.confidence}</span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.time}</td>
                                <td className="px-6 py-4">
                                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-500 group-hover:text-neon-cyan">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-6">
                <div className="flex-1 glass p-6 rounded-2xl border border-red-500/10 bg-gradient-to-br from-red-500/5 to-transparent">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-500" size={24} />
                        <h4 className="text-lg font-bold text-white uppercase tracking-tight">System Alert</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-4 font-light">
                        Vehicle GJ 01 BV 4220 has been flagged for lane violation in SECTOR-07. Automated citation pending officer review.
                    </p>
                    <button className="text-xs font-bold uppercase tracking-widest text-red-500 border-b border-red-500/30 hover:border-red-500 transition-all pb-1">
                        Review Incident Footage
                    </button>
                </div>
                <div className="flex-1 glass p-6 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Network Load</h4>
                    <div className="space-y-4">
                        {[
                            { label: "Neural Engine", val: 84 },
                            { label: "Stream Synthesis", val: 42 },
                            { label: "Data Indexing", val: 12 }
                        ].map((item, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">{item.label}</span>
                                    <span className="text-neon-cyan">{item.val}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${item.val}%` }}
                                        className="h-full bg-neon-cyan shadow-[0_0_10px_#22d3ee]"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
