import { useEffect, useState } from "react";
import { fetchWeatherData, fetchQuantumBatch } from "@/lib/weather-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CloudLightning, ShieldCheck, Activity } from "lucide-react";

const CITIES = [
    { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
    { name: "Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 }
];

interface CityResult {
    location: { name: string; lat: number; lon: number };
    analysis: any;
    error?: string;
}

export const CityComparison = () => {
    const [results, setResults] = useState<CityResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // 1. Fetch Weather for all cities
                // 1. Fetch Weather for all cities
                const weatherPromises = CITIES.map(async (city) => {
                    try {
                        const w = await fetchWeatherData(city.lat, city.lon);
                        // Map to Python backend expected format
                        const backendPayload = {
                            temperature: w.temperature,
                            humidity: w.humidity,
                            pressure: w.pressure,
                            wind: w.windSpeed,
                            clouds: w.cloudCover
                        };
                        return { weather: backendPayload, location: city };
                    } catch (e) {
                        return null;
                    }
                });

                const weatherResults = (await Promise.all(weatherPromises)).filter(Boolean);

                // 2. Batch Analysis
                const quantumResults = await fetchQuantumBatch(weatherResults);
                setResults(quantumResults);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getRiskColor = (prob: number) => {
        if (prob > 0.8) return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse";
        if (prob > 0.5) return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]";
        if (prob > 0.2) return "bg-yellow-500";
        return "bg-emerald-500";
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 w-full bg-slate-800/50" />)}
            </div>
        );
    }

    // Rank by Storm Probability
    const sorted = [...results].sort((a, b) => (b.analysis?.storm_probability || 0) - (a.analysis?.storm_probability || 0));

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-mono text-indigo-300/60 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4" /> Global Quantum Watch (Real-time Entanglement)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sorted.map((res, i) => {
                    const analysis = res.analysis || {};
                    const prob = analysis.storm_probability || 0;
                    const chaos = analysis.atmospheric_chaos || 0;
                    const isOffline = analysis.quantum_summary?.includes("Offline");

                    return (
                        <Card key={i} className="relative p-4 bg-slate-900/40 border-indigo-500/10 hover:bg-slate-900/60 transition-colors overflow-hidden group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-100">{res.location.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        {isOffline ? '⚠ SIMULATION' : '● QUANTUM LINK'}
                                    </p>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-slate-600' : getRiskColor(prob)}`} />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs items-center">
                                    <span className="text-slate-400 flex items-center gap-1">
                                        <CloudLightning className="w-3 h-3" /> Storm Risk
                                    </span>
                                    <span className={`font-mono font-bold ${(prob > 0.5) ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {(prob * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${prob > 0.5 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-indigo-500'}`}
                                        style={{ width: `${Math.max(2, prob * 100)}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-white/5 pt-2 mt-2">
                                    <div>
                                        <span className="text-slate-500 block">Stability</span>
                                        <span className="font-mono text-slate-300">{((1 - chaos) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500 block">Reliability</span>
                                        <span className="font-mono text-indigo-300">{(analysis.forecast_reliability * 100 || 0).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>

                            {prob > 0.7 && (
                                <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
