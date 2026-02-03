/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, CloudRain } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface ForecastData {
  date: string;
  temperature: number;
  rainfall: number;
}

interface ForecastChartProps {
  data: ForecastData[];
  loading: boolean;
}

export const ForecastChart = ({ data, loading }: ForecastChartProps) => {
  const { formatTemp } = useSettings();

  if (loading || !data || data.length === 0) {
    return (
      <div className="h-[250px] w-full bg-white/5 animate-pulse rounded-3xl" />
    );
  }

  // Pre-process data
  const chartData = data.map(item => ({
    ...item,
    displayTemp: parseFloat(formatTemp(item.temperature).replace(/[^0-9.-]/g, ''))
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <p className="text-slate-400 text-xs uppercase font-bold mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium">
              <span>Temperature:</span>
              <span>{payload.find((p: any) => p.dataKey === 'displayTemp')?.value}°</span>
            </div>
            {payload.find((p: any) => p.dataKey === 'rainfall') && (
              <div className="flex items-center gap-2 text-sm text-blue-400 font-medium">
                <span>Rainfall:</span>
                <span>{payload.find((p: any) => p.dataKey === 'rainfall')?.value}mm</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full relative">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, dy: 10 }}
            />
            <YAxis
              yAxisId="temp"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="rain"
              orientation="right"
              hide={true} // Hidden axis but scaling bars
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />

            <Bar
              yAxisId="rain"
              dataKey="rainfall"
              barSize={20}
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              opacity={0.3}
            />

            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="displayTemp"
              stroke="#06b6d4"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTemp)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Cards Row */}
      <div className="grid grid-cols-7 gap-2 mt-2">
        {chartData.map((day, i) => (
          <div key={i} className="bg-slate-900/40 rounded-xl p-2 text-center border border-white/5 transition-colors hover:bg-white/5">
            <div className="text-[10px] text-slate-400 uppercase mb-1">{day.date.substring(0, 3)}</div>
            <div className="font-bold text-white text-sm">
              {Math.round(day.displayTemp)}°
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {day.rainfall > 0 ? (
                <>
                  <CloudRain className="w-2.5 h-2.5 text-blue-400" />
                  <span className="text-[9px] text-blue-400 font-mono">{day.rainfall}mm</span>
                </>
              ) : (
                <span className="text-[9px] text-slate-600">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};