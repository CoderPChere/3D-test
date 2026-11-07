"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/UI/Navbar";
import NotConfigured from "@/components/UI/NotConfigured";
import { site } from "@/config/site";
import { readSession } from "@/lib/auth";

export default function RealTimeTraffic() {
  const [user, setUser] = useState<{ name: string; email: string; role?: string; token?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!site.features.auth) return; // auth off → page is open, no session needed

    const s = readSession();
    if (!s || !s.email) {
      // Not logged in
      router.push("/");
    } else {
      setUser({ name: s.name || s.email.split("@")[0], email: s.email, role: s.role || "viewer", token: s.token });
    }
  }, [router]);

  if (site.features.auth && !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neon-cyan animate-pulse">Authenticating Secure Access...</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-black flex flex-col">
      <Navbar 
        user={user} 
        onLoginClick={() => {}} 
        onProfileClick={() => {}} 
      />
      <div className="flex-1 mt-[72px] w-full relative">
        {site.features.traffic ? (
          <iframe 
            src="/realtime-traffic.html" 
            className="w-full h-full absolute inset-0 border-none"
            title="Real-Time Traffic Dashboard"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <NotConfigured service="Real-time traffic map" />
          </div>
        )}
      </div>
    </main>
  );
}
