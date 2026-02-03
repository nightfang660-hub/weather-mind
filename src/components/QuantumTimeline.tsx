import { useEffect, useState, useRef } from "react";
import { fetchQuantumHistory, QuantumLog } from "@/lib/weather-api";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, History, AlertOctagon } from "lucide-react";

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
                setIndex(sorted.length - 1); // Start at latest
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
        if (history[index]) {
            onDataSelect(history[index]);
        }
    }, [index, history, onDataSelect]);

    const handleSliderChange = (vals: number[]) => {
        setIndex(vals[0]);
        setPlaying(false);
    };

    if (history.length === 0) return (
        <div className="p-4 text-center text-indigo-300/50 text-xs font-mono">
            Waiting for historical data... (Run analysis to populate)
        </div>
    );

    const currentLog = history[index];
    const timeLabel = new Date(currentLog.timestamp).toLocaleTimeString();

    // Markers for Storm Events
    const criticalIndices = history.map((h, i) => h.storm_probability > 0.7 ? i : -1).filter(i => i !== -1);
    const warningIndices = history.map((h, i) => h.storm_probability > 0.5 && h.storm_probability <= 0.7 ? i : -1).filter(i => i !== -1);

    return (
        <Card className="p-4 bg-black/40 border-indigo-500/20 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-white">Quantum Time Evolution</span>
                    <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {timeLabel}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-indigo-300 hover:text-white"
                    onClick={() => setPlaying(!playing)}
                >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
            </div>

            <div className="relative pt-2 pb-6 px-1">
                {/* Visual Markers */}
                <div className="absolute top-0 left-0 right-0 h-1">
                    {criticalIndices.map(i => (
                        <div key={i} className="absolute w-1 h-3 bg-red-500 rounded-full top-[-8px]" style={{ left: `${(i / (history.length - 1)) * 100}%` }} title="Critical Risk"></div>
                    ))}
                    {warningIndices.map(i => (
                        <div key={i} className="absolute w-1 h-2 bg-orange-400 rounded-full top-[-6px]" style={{ left: `${(i / (history.length - 1)) * 100}%` }} title="Warning"></div>
                    ))}
                </div>

                <Slider
                    value={[index]}
                    max={history.length - 1}
                    step={1}
                    onValueChange={handleSliderChange}
                    className="cursor-pointer"
                />

                <div className="flex justify-between mt-2 text-[10px] text-indigo-400/50 font-mono uppercase">
                    <span>- {history.length} Events</span>
                    <span>Live Now</span>
                </div>
            </div>

            {/* Context Alert for Past States */}
            {index < history.length - 1 && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs bg-yellow-400/10 p-2 rounded border border-yellow-400/20 mt-2">
                    <AlertOctagon className="w-3 h-3" />
                    <span>Viewing Historical Quantum State</span>
                </div>
            )}
        </Card>
    );
};
