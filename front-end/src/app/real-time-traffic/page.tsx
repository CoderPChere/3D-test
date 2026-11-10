"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/UI/Navbar";
import NotConfigured from "@/components/UI/NotConfigured";
import { site } from "@/config/site";
import { useSession } from "@/lib/auth";

export default function RealTimeTraffic() {
  const router = useRouter();

  // Session restore from localStorage (external store, read without an effect);
  // auth off → no session needed, page is open.
  const session = useSession();
  const hasSession = !!session?.email;
  const user =
    site.features.auth && hasSession
      ? { name: session.name || session.email.split("@")[0], email: session.email, role: session.role || "viewer", token: session.token }
      : null;

  useEffect(() => {
    if (site.features.auth && !hasSession) {
      // Not logged in
      router.push("/");
    }
  }, [router, hasSession]);

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
