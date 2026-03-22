import { useEffect, useState, useRef } from "react";
import { fetchQuantumHistory, QuantumLog } from "@/lib/weather-api";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, History, AlertOctagon, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';

interface QuantumTimelineProps {
    city: string;
    onDataSelect: (log: QuantumLog) => void;
}

export const QuantumTimeline = ({ city, onDataSelect }: QuantumTimelineProps) => {
    const [history, setHistory] = useState<QuantumLog[]>([]);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const load = async () => {
            if (!city) return;
            const data = await fetchQuantumHistory(city);
            if (data.length > 0) {
                // Determine order. API returns DESC (newest first). 
                // For timeline, we want Oldest -> Newest (Left -> Right)
                const sorted = [...data].reverse();
                setHistory(sorted);
                // Only set index to latest if it's the first load or if we are already at the latest
                setIndex(prev => prev === 0 ? sorted.length - 1 : prev); 
            }
        };
        load();
        const interval = setInterval(load, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [city]);

    useEffect(() => {
        if (playing) {
            timerRef.current = setInterval(() => {
                setIndex(prev => {
                    if (prev >= history.length - 1) {
                        setPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000); // 1 sec per step
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [playing, history.length]);

    // Notify parent when index changes
    useEffect(() => {
        if (history.length > 0 && history[index]) {
            onDataSelect(history[index]);
        }
    }, [index, history, onDataSelect]);

    const handleSliderChange = (vals: number[]) => {
        setIndex(vals[0]);
        setPlaying(false);
    };

    // Format data for Recharts
    const chartData = history.map((log, i) => ({
        index: i,
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round(log.forecast_reliability * 100),
        storm: Math.round(log.storm_probability * 100),
    }));

    if (history.length === 0) return (
        <div className="p-4 text-center text-primary/50 text-xs font-mono border border-primary/20 rounded-lg">
            Waiting for historical data... (Run analysis to populate)
        </div>
    );

    const currentLog = history[index];
    const timeLabel = new Date(currentLog?.timestamp).toLocaleTimeString();

    return (
        <Card className="p-5 bg-card/60 backdrop-blur-xl border-border/50 mb-6 shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Evolution Graph</h3>
                        <p className="text-xs text-muted-foreground font-mono">Quantum Accuracy & Risk Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                        {timeLabel}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-primary/30 text-primary hover:bg-primary/20"
                        onClick={() => setPlaying(!playing)}
                    >
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Recharts Graph */}
            <div className="h-40 w-full mb-6 mt-2 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorStorm" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="time" 
                            stroke="#888888" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#888888" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value}%`} 
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="accuracy" 
                            name="Model Accuracy"
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorAcc)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="storm" 
                            name="Storm Risk"
                            stroke="#ef4444" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorStorm)" 
                        />
                        {/* Show indicator for current slider position */}
                        {chartData[index] && (
                             <ReferenceDot 
                                 x={chartData[index].time} 
                                 y={chartData[index].accuracy} 
                                 r={4} 
                                 fill="#10b981" 
                                 stroke="white" 
                             />
                        )}
                         {chartData[index] && (
                             <ReferenceDot 
                                 x={chartData[index].time} 
                                 y={chartData[index].storm} 
                                 r={4} 
                                 fill="#ef4444" 
                                 stroke="white" 
                             />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="relative pt-2 pb-2 px-2 z-10">
                <Slider
                    value={[index]}
                    max={Math.max(0, history.length - 1)}
                    step={1}
                    onValueChange={handleSliderChange}
                    className="cursor-pointer"
                />

                <div className="flex justify-between mt-3 text-[10px] text-muted-foreground font-mono uppercase">
                    <span>- {history.length} Snapshots</span>
                    <span>Live Now</span>
                </div>
            </div>

            {/* Context Alert for Past States */}
            {index < history.length - 1 && (
                <div className="flex items-center gap-2 text-primary text-xs bg-primary/10 p-2.5 rounded-lg border border-primary/20 mt-4 animate-pulse">
                    <History className="w-3.5 h-3.5" />
                    <span className="font-medium">Viewing Historical State Sequence</span>
                </div>
            )}
        </Card>
    );
};
