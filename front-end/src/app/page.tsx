"use client";

import { useState, useEffect } from "react";
import Scene from "@/components/Three/Scene";
import City from "@/components/Three/City";
import CityHUD from "@/components/UI/CityHUD";
import AIDetectionView from "@/components/UI/AIDetectionView";
import InvestigationDashboard from "@/components/UI/InvestigationDashboard";
import CursorGlow from "@/components/UI/CursorGlow";
import AuthSection from "@/components/UI/AuthSection";
import Navbar from "@/components/UI/Navbar";
import ProfileModal from "@/components/UI/ProfileModal";

type User = { name: string; email: string; role?: string; token?: string };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Restore session from localStorage on mount
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
    <main className="relative min-h-[500vh] bg-background">
      <CursorGlow />
      
      {/* Global Navigation */}
      <Navbar 
        user={user} 
        onLoginClick={() => setIsAuthOpen(true)} 
        onProfileClick={() => setIsProfileOpen(true)} 
      />

      {/* 3D Smart City Experience */}
      <Scene>
        <City />
      </Scene>

      {/* Futuristic Overlay UI */}
      <CityHUD />

      {/* Modals */}
      <AuthSection 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={(userData) => setUser(userData)} 
      />
      
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
        onSave={(updatedUser) => setUser(updatedUser)} 
        onLogout={() => { 
          setUser(null); 
          setIsProfileOpen(false);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_role");
          localStorage.removeItem("auth_name");
          localStorage.removeItem("auth_email");
        }} 
      />

      {/* Scroll Sections for GSAP Transitions */}
      <section className="relative h-screen flex items-center justify-center pointer-events-none">
        <div className="max-w-4xl px-12 text-center pointer-events-auto">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter hologram-text mb-4 mt-16">
            CITYFLUXY
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto uppercase tracking-[0.2em] font-light">
            Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <div className="w-12 h-[1px] bg-neon-cyan/50 self-center" />
            <span className="text-xs text-neon-cyan tracking-widest font-mono">INITIATING SECTOR SCAN</span>
            <div className="w-12 h-[1px] bg-neon-cyan/50 self-center" />
          </div>
        </div>
      </section>

      <section className="relative h-screen flex items-center px-24 pointer-events-none">
        <div className="max-w-xl glass p-8 rounded-2xl pointer-events-auto border-l-4 border-l-neon-blue">
          <h2 className="text-3xl font-bold mb-4 text-white uppercase tracking-tight">Smart Surveillance</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Real-time multi-agent vehicle tracking across metropolitan sectors. Our platform leverages YOLOv8x architectures for 99.8% detection accuracy in any weather conditions.
          </p>
          <ul className="space-y-3">
            {[
              "Multi-camera synthesis",
              "Path prediction modeling",
              "Behavioral anomaly detection"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-neon-cyan font-mono">
                <div className="w-2 h-2 bg-neon-cyan rounded-full shadow-[0_0_8px_#22d3ee]" />
                {item.toUpperCase()}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative h-screen flex items-center justify-end px-24 pointer-events-none">
        <div className="max-w-2xl pointer-events-auto">
          <AIDetectionView />
        </div>
      </section>

      {/* Investigation Dashboard Section */}
      <section id="investigation-dashboard" className="relative min-h-screen p-12 pointer-events-none">
        <div className="max-w-7xl mx-auto glass rounded-3xl p-12 border border-white/10 pointer-events-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-tight">Investigation Dashboard</h2>
              <p className="text-slate-500 font-mono text-sm">SECURE TERMINAL // SECTOR-07 ACCESS</p>
            </div>
            <button className="neon-border px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-neon-cyan hover:text-black transition-all">
              Download Incident Reports
            </button>
          </div>

          <InvestigationDashboard user={user} />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-24 border-t border-white/5 flex justify-between items-center bg-black/50 backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold hologram-text">CITYFLUXY</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">© 2026 NEXUS SYSTEMS CORP</p>
        </div>
        <div className="flex gap-8">
          {["Sectors", "Protocols", "Authentication", "API"].map(item => (
            <a key={item} href="#" className="text-[10px] uppercase font-bold text-slate-400 hover:text-neon-cyan transition-colors tracking-[0.2em]">{item}</a>
          ))}
        </div>
      </footer>
    </main>
  );
}
