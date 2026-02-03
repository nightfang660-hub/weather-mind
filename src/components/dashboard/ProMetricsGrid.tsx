
import { Card } from "@/components/ui/card";
import { Cloud, Droplets, Eye, Gauge, Thermometer, Wind, CloudLightning, Activity, Waves } from "lucide-react";

interface ProMetricCardProps {
    label: string;
    value: string | number;
    unit: string;
    icon: any;
    color?: string;
}

const MetricCard = ({ label, value, unit, icon: Icon, color = "text-blue-400" }: ProMetricCardProps) => (
    <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition-all group">
        <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">{label}</div>
            <div className="text-xl font-bold text-white font-mono flex items-baseline gap-1">
                {value}<span className="text-xs text-slate-500 font-sans font-normal">{unit}</span>
            </div>
        </div>
        <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
    </div>
);

interface ExtendedWeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
    visibility: number;
    cloudCover: number;
    uvIndex: number;
    feelsLike: number;
}

export const ProMetricsGrid = ({ data }: { data: ExtendedWeatherData | null }) => {
    if (!data) return null;

    // Derived Pro Metrics
    const dewPoint = (data.temperature - ((100 - data.humidity) / 5)).toFixed(1);
    const heatIndex = data.temperature > 27 ? (data.temperature + (data.humidity / 10)).toFixed(1) : data.temperature.toFixed(1);

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                <Activity className="w-4 h-4" />
                Atmospheric Telemetry
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <MetricCard
                    label="Dew Point"
                    value={dewPoint}
                    unit="°C"
                    icon={Droplets}
                    color="text-cyan-400"
                />
                <MetricCard
                    label="Wind Gusts"
                    value={(data.windSpeed * 1.5).toFixed(1)}
                    unit="km/h"
                    icon={Wind}
                    color="text-slate-400"
                />
                <MetricCard
                    label="Pressure"
                    value={data.pressure.toFixed(0)}
                    unit="hPa"
                    icon={Gauge}
                    color="text-emerald-400"
                />
                <MetricCard
                    label="Rain Rate"
                    value="0.0"
                    unit="mm/h"
                    icon={Cloud}
                    color="text-blue-400"
                />
                <MetricCard
                    label="Cloud Base"
                    value={(2500 - (data.humidity * 20)).toFixed(0)}
                    unit="m"
                    icon={Cloud}
                    color="text-gray-400"
                />
                <MetricCard
                    label="Lightning Risk"
                    value={data.cloudCover > 80 ? 'Low' : 'None'}
                    unit=""
                    icon={CloudLightning}
                    color="text-yellow-400"
                />
                <MetricCard
                    label="Cloud Base"
                    value="Low"
                    unit=""
                    icon={Eye}
                    color="text-gray-400"
                />
                <MetricCard
                    label="Air Quality"
                    value="1.18"
                    unit="µg/m³"
                    icon={Waves}
                    color="text-teal-400"
                />
            </div>
        </div>
    );
};
