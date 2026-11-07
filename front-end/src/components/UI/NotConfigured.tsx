export default function NotConfigured({ service }: { service: string }) {
    return (
        <div className="glass rounded-2xl border border-white/10 p-10 max-w-md w-full text-center flex flex-col items-center gap-4">
            <p className="text-neon-cyan text-xs font-bold uppercase tracking-[0.4em]">Service Not Configured</p>
            <p className="text-slate-500 text-[11px] font-mono uppercase tracking-widest leading-relaxed">
                {service} is disabled — enable it in{" "}
                <span className="text-slate-300">src/config/site.ts</span>
            </p>
        </div>
    );
}
