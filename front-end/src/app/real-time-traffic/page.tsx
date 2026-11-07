"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/UI/Navbar";

export default function RealTimeTraffic() {
  const [user, setUser] = useState<{ name: string; email: string; role?: string; token?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const name = localStorage.getItem("auth_name");
    const email = localStorage.getItem("auth_email");
    const role = localStorage.getItem("auth_role");

    if (!token || !email) {
      // Not logged in
      router.push("/");
    } else {
      setUser({ name: name || email.split("@")[0], email, role: role || "viewer", token });
    }
  }, [router]);

  if (!user) {
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
        <iframe 
          src="/realtime-traffic.html" 
          className="w-full h-full absolute inset-0 border-none"
          title="Real-Time Traffic Dashboard"
        />
      </div>
    </main>
  );
}
