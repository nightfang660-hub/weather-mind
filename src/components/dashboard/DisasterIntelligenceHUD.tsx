import { AlertTriangle, CloudRain, Wind, Activity, Zap, Info, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface DisasterMetricsProps {
    stormProb: number;
    cycloneIndex: number;
    floodRisk: number;
    chaosVelocity: number;
    stateLockIn: boolean;
}

export const DisasterIntelligenceHUD = ({ stormProb, cycloneIndex, floodRisk, chaosVelocity, stateLockIn }: DisasterMetricsProps) => {

    return (
        <div className="glass-panel p-5 space-y-5 border-l-4 border-l-primary/50 relative overflow-hidden min-h-[300px] flex flex-col justify-center bg-black/40 backdrop-blur-2xl">
            {/* Tech Deco Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-primary/10 to-transparent blur-2xl -z-10" />

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Disaster Intelligence
                </h3>
                <div className="text-[10px] font-mono text-white/30">ID: Q-9921</div>
            </div>

            <div className="space-y-6">

                {/* CYCLONE MONITOR */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-semibold text-white/80 flex items-center gap-2">
                            <Wind className="w-3 h-3 text-cyan-400" /> Cyclone Formation
                        </span>
                        <span className="text-lg font-bold font-mono text-cyan-400">{(cycloneIndex * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000"
                            style={{ width: `${cycloneIndex * 100}%` }}
                        />
                    </div>
                </div>

                {/* FLOOD MONITOR */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-semibold text-white/80 flex items-center gap-2">
                            <CloudRain className="w-3 h-3 text-blue-400" /> Flood Probability
                        </span>
                        <span className="text-lg font-bold font-mono text-blue-400">{(floodRisk * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-1000"
                            style={{ width: `${floodRisk * 100}%` }}
                        />
                    </div>
                </div>

                {/* STORM ALERT BOX */}
                <div className={`rounded-xl p-4 border ${stormProb > 0.5 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/40 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                            <Zap className={`w-3 h-3 ${stormProb > 0.5 ? 'text-red-500' : 'text-yellow-500'}`} />
                            Storm Warnings
                        </span>
                        <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold font-mono ${stormProb > 0.5 ? 'text-red-500' : 'text-yellow-500'}`}>{(stormProb * 100).toFixed(0)}%</span>
                            {stormProb > 0.5 ?
                                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded animate-pulse">ACTIVE</span> :
                                <span className="text-[10px] text-white/30">NONE</span>
                            }
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                            <div className={`h-full rounded-full ${stormProb > 0.5 ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${stormProb * 100}%` }} />
                        </div>
                    </div>
                    {stormProb > 0.5 && <p className="text-[10px] text-red-300 mt-2">High voltage convective signals detected.</p>}
                </div>
            </div>
        </div>
    );
};
