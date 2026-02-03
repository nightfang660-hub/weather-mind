import { useEffect, useState } from "react";
import { Atom, CloudLightning, Activity, Zap, BrainCircuit, ShieldAlert, Globe, Clock, Radio, Lock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchQuantumAnalysis, QuantumAnalysisResult, WeatherData, QuantumLog } from "@/lib/weather-api";
import { Skeleton } from "@/components/ui/skeleton";
import { QuantumTimeline } from "./QuantumTimeline";
import { CityComparison } from "./CityComparison";

interface QuantumPanelProps {
    weather: WeatherData | null;
    location?: { lat: number; lon: number };
    locationName?: string;
}

export const QuantumPanel = ({ weather, location, locationName }: QuantumPanelProps) => {
    const [liveAnalysis, setLiveAnalysis] = useState<QuantumAnalysisResult | null>(null);
    const [displayAnalysis, setDisplayAnalysis] = useState<QuantumAnalysisResult | null>(null); // What we show (Live or History)

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState("live");
    const [isHistoryMode, setIsHistoryMode] = useState(false);

    // FETCH LIVE DATA
    useEffect(() => {
        if (weather) {
            setLoading(true);
            const locPayload = location && locationName ? { name: locationName, lat: location.lat, lon: location.lon } : undefined;

            fetchQuantumAnalysis(weather, locPayload)
                .then((data) => {
                    setLiveAnalysis(data);
                    if (!isHistoryMode) {
                        setDisplayAnalysis(data);
                    }
                    setError(false);
                })
                .catch(() => setError(true))
                .finally(() => setLoading(false));
        }
    }, [weather, location, locationName, isHistoryMode]);

    // Update display when switching back to live
    useEffect(() => {
        if (activeTab === "live") {
            setIsHistoryMode(false);
            setDisplayAnalysis(liveAnalysis);
        } else if (activeTab === "timeline") {
            setIsHistoryMode(true);
        }
    }, [activeTab, liveAnalysis]);

    const handleHistorySelect = (log: QuantumLog) => {
        setDisplayAnalysis({
            storm_probability: log.storm_probability,
            rain_confidence: log.rain_confidence,
            atmospheric_chaos: log.atmospheric_chaos,
            forecast_reliability: log.forecast_reliability,
            quantum_summary: log.quantum_summary,
            top_states: log.top_states
        });
    };

    if (!weather) return null;

    if (loading && !displayAnalysis) {
        return (
            <Card className="p-6 border-indigo-500/30 bg-black/40 backdrop-blur-md relative overflow-hidden group mb-6">
                {/* Skeleton Layout */}
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="mt-8 space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </Card>
        );
    }

    if (error || !displayAnalysis) return null;

    // --- DISPLAY LOGIC ---
    const analysis = displayAnalysis;
    const isStormAlert = analysis.storm_probability > 0.85;

    const getRiskColor = (val: number) => {
        if (val > 0.7) return "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]";
        if (val > 0.4) return "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
        return "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]";
    };

    const getStabilityColor = (val: number) => {
        if (val > 0.7) return "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]";
        if (val > 0.4) return "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
        return "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]";
    };

    return (
        <Card className={`relative p-0 border border-border/80 bg-card/60 backdrop-blur-xl shadow-lg overflow-hidden mb-6 group future-breathe holo-materialize ${isStormAlert ? 'animate-pulse border-destructive/80 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : ''}`}>

            {/* Global Background Effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* STORM ALERT OVERLAY */}
            {isStormAlert && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive via-yellow-500 to-destructive z-50 animate-shimmer" />
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Header Section */}
                <div className="p-6 border-b border-border/50 bg-muted/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Title Block */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`absolute inset-0 blur-lg rounded-full animate-pulse ${isStormAlert ? 'bg-destructive/30' : 'bg-primary/30'}`} />
                                <div className="relative p-2 rounded-lg bg-primary/10 border border-primary/20 shadow-inner">
                                    <Atom className={`w-6 h-6 animate-spin-slow ${isStormAlert ? 'text-destructive' : 'text-primary'}`} />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-foreground tracking-wide flex items-center gap-2">
                                    Quantum Storm Intelligence
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">v2.0</span>
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {isStormAlert ? "CRITICAL: QUANTUM STORM ALERT RAISED" : "QISKIT STATEVECTOR SIMULATION"}
                                </p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <TabsList className="bg-muted border border-border/20">
                            <TabsTrigger value="live" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <Radio className="w-3 h-3" /> Live
                            </TabsTrigger>
                            <TabsTrigger value="timeline" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <Clock className="w-3 h-3" /> Evolution
                            </TabsTrigger>
                            <TabsTrigger value="global" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <Globe className="w-3 h-3" /> Global Watch
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                <div className="p-6">
                    {/* LIVE & TIMELINE CONTENT - Shares the Metrics View */}
                    <TabsContent value="live" className="m-0 space-y-6 animate-in slide-in-from-bottom-2">
                        <MetricsView
                            analysis={analysis}
                            getRiskColor={getRiskColor}
                            getStabilityColor={getStabilityColor}
                            isLive={true}
                        />
                    </TabsContent>

                    <TabsContent value="timeline" className="m-0 space-y-4 animate-in slide-in-from-bottom-2">
                        <QuantumTimeline
                            city={locationName?.split(',')[0].trim() || ''}
                            onDataSelect={handleHistorySelect}
                        />
                        <MetricsView
                            analysis={analysis}
                            getRiskColor={getRiskColor}
                            getStabilityColor={getStabilityColor}
                            isLive={false}
                        />
                    </TabsContent>

                    <TabsContent value="global" className="m-0 animate-in slide-in-from-bottom-2">
                        <CityComparison />
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    );
};

// --- SUB-COMPONENT: Metrics Grid & Details ---
const MetricsView = ({ analysis, getRiskColor, getStabilityColor, isLive }: {
    analysis: QuantumAnalysisResult,
    getRiskColor: (n: number) => string,
    getStabilityColor: (n: number) => string,
    isLive: boolean
}) => (
    <>
        {/* Status Badge */}
        <div className="flex justify-end mb-2">
            <Badge variant="outline" className={`border-indigo-500/30 font-mono text-xs px-3 py-1 ${isLive ? 'text-green-400 bg-green-400/5' : 'text-yellow-400 bg-yellow-400/5'}`}>
                <span className={`relative flex h-2 w-2 mr-2`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </span>
                {isLive ? 'LIVE ENTANGLEMENT' : 'HISTORICAL REPLAY'}
            </Badge>
        </div>

        {/* --- DISASTER PREDICTION SECTION --- */}
        {((analysis.cyclone_index || 0) > 0.6 || (analysis.flood_risk || 0) > 0.6) && (
            <div className="mb-6 animate-pulse">
                <Card className="bg-red-950/40 border-red-500/50 p-4 border-l-4 border-l-red-500 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                        <div>
                            <h4 className="font-bold text-red-400 text-lg uppercase tracking-widest">
                                {(analysis.cyclone_index || 0) > (analysis.flood_risk || 0) ? 'Cyclone Formation Detected' : 'Flash Flood Warning'}
                            </h4>
                            <p className="text-red-300/70 text-sm">
                                Quantum Pattern Match: {Math.max(analysis.cyclone_index || 0, analysis.flood_risk || 0).toFixed(2)} Risk Index
                            </p>
                        </div>
                    </div>
                    <Badge variant="destructive" className="animate-bounce">CRITICAL</Badge>
                </Card>
            </div>
        )}
        {/* Temporal Quantum Dynamics - Live Trend Dashboard */}
        {(analysis.chaos_velocity !== undefined) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Chaos Velocity */}
                <Card className="p-3 bg-card border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Chaos Velocity (dEntropy/dt)</div>
                    <div className={`text-xl font-bold font-mono ${(analysis.chaos_velocity || 0) > 0.05 ? 'text-destructive' :
                        (analysis.chaos_velocity || 0) < -0.05 ? 'text-green-500' : 'text-foreground'
                        }`}>
                        {((analysis.chaos_velocity || 0) > 0 ? '+' : '') + (analysis.chaos_velocity || 0).toFixed(3)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Accelerating vs Stabilizing</div>
                </Card>

                {/* Cyclone Momentum */}
                <Card className="p-3 bg-card border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Cyclone Momentum</div>
                    <div className={`text-xl font-bold font-mono ${(analysis.cyclone_momentum || 0) > 0.2 ? 'text-orange-500 animate-pulse' : 'text-foreground'
                        }`}>
                        {((analysis.cyclone_momentum || 0) * 100).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">Q-Force</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Pressure Drop × Velocity</div>
                </Card>

                {/* State Lock-In */}
                <Card className={`p-3 border transition-all duration-500 ${analysis.state_lock_in ? 'bg-destructive/10 border-destructive/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-card border-border/50'
                    }`}>
                    <div className="text-xs text-muted-foreground mb-1">Future Collapse Status</div>
                    <div className="flex items-center gap-2">
                        {analysis.state_lock_in ? (
                            <>
                                <Lock className="w-4 h-4 text-destructive" />
                                <span className="text-destructive font-bold tracking-wider text-sm">LOCKED IN</span>
                            </>
                        ) : (
                            <>
                                <Unlock className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-500/80 font-mono text-sm">FLUID</span>
                            </>
                        )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                        Drift: {((analysis.state_drift || 0) * 100).toFixed(1)}%
                    </div>
                </Card>
            </div>
        )}

        {/* Metrics Grid */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 transition-opacity duration-500 ${analysis.cached ? 'opacity-80' : 'opacity-100'}`}>
            {/* Storm Probability */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                        <CloudLightning className="w-5 h-5" />
                    </div>
                    <span className={`font-mono text-xl font-bold ${getRiskColor(analysis.storm_probability)}`}>
                        {(analysis.storm_probability * 100).toFixed(0)}%
                    </span>
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-2">Storm Probability</p>
                    <Progress value={analysis.storm_probability * 100} className="h-1.5 bg-slate-800" indicatorClassName={analysis.storm_probability > 0.6 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-500'} />
                </div>
            </div>

            {/* Rain Confidence */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Zap className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xl font-bold text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">
                        {(analysis.rain_confidence * 100).toFixed(0)}%
                    </span>
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-2">Rain Confidence</p>
                    <Progress value={analysis.rain_confidence * 100} className="h-1.5 bg-slate-800" indicatorClassName="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
            </div>

            {/* Atmospheric Chaos */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <Activity className="w-5 h-5" />
                    </div>
                    <span className={`font-mono text-xl font-bold ${getRiskColor(analysis.atmospheric_chaos)}`}>
                        {(analysis.atmospheric_chaos * 100).toFixed(0)}%
                    </span>
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-2">System Entropy</p>
                    <Progress value={analysis.atmospheric_chaos * 100} className="h-1.5 bg-slate-800" indicatorClassName="bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                </div>
            </div>

            {/* Forecast Reliability */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className={`font-mono text-xl font-bold ${getStabilityColor(analysis.forecast_reliability)}`}>
                        {(analysis.forecast_reliability * 100).toFixed(0)}%
                    </span>
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-2">Model Stability</p>
                    <Progress value={analysis.forecast_reliability * 100} className="h-1.5 bg-slate-800" indicatorClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
            </div>
        </div>

        {/* Quantum Insight - Top States Table */}
        <div className="relative p-5 rounded-xl bg-muted/40 border border-primary/20 overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />

            <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                        <BrainCircuit className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        Quantum Multi-Future Analysis
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </h4>
                </div>

                {analysis.top_states && analysis.top_states.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-primary/10 text-xs text-muted-foreground font-mono uppercase">
                                    <th className="pb-2 pl-2">State Vector</th>
                                    <th className="pb-2">Probability</th>
                                    <th className="pb-2">Quantum Prediction</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary/10">
                                {analysis.top_states.map((state, i) => (
                                    <tr key={i} className="group hover:bg-primary/5 transition-colors">
                                        <td className="py-2.5 pl-2 font-mono text-primary font-medium">{state.state}</td>
                                        <td className="py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-foreground">{state.probability}%</span>
                                                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: `${state.probability}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-muted-foreground font-light group-hover:text-foreground">{state.meaning}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-light">
                        "{analysis.quantum_summary}"
                    </p>
                )}
            </div>
        </div>
    </>
);
