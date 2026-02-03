import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { HourlyForecastData } from "@/lib/weather-api";
import { getWeatherIcon } from "@/lib/weather-icons";
import { Clock, Droplets, Wind } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface HourlyForecastProps {
  data: HourlyForecastData[];
  loading: boolean;
}

export const HourlyForecast = ({ data, loading }: HourlyForecastProps) => {
  const { formatTemp } = useSettings();

  if (loading || !data || data.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-between gap-4 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[80px] h-full bg-white/5 animate-pulse rounded-[2rem]"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4 px-1">
          {data.map((hour, index) => {
            const WeatherIcon = getWeatherIcon(hour.weatherCode);
            const isNow = index === 0;

            return (
              <div
                key={index}
                className={`
                  flex-shrink-0 w-[90px] h-[220px] rounded-[2rem] flex flex-col justify-between items-center py-6 transition-all duration-300 group cursor-pointer
                  ${isNow
                    ? 'bg-gradient-to-b from-blue-500 to-indigo-900 shadow-[0_10px_30px_-5px_rgba(59,130,246,0.4)] scale-105 z-10'
                    : 'bg-slate-900/40 border border-white/5 hover:bg-slate-800/60 hover:-translate-y-1'
                  }
                `}
              >
                {/* Top: Time */}
                <div className={`text-sm font-semibold tracking-wider ${isNow ? 'text-white' : 'text-slate-400'}`}>
                  {isNow ? 'NOW' : hour.time}
                </div>

                {/* Middle: Icon & Precip */}
                <div className="flex flex-col items-center gap-2">
                  <WeatherIcon className={`w-8 h-8 ${isNow ? 'text-white drop-shadow-lg' : 'text-slate-300'}`} />
                  <div className="flex items-center gap-1 text-[10px] opacity-70">
                    <Droplets className="w-3 h-3" />
                    <span>{hour.precipitation > 0 ? `${hour.precipitation}mm` : '0%'}</span>
                  </div>
                </div>

                {/* Bottom: Temp */}
                <div className={`text-2xl font-bold ${isNow ? 'text-white' : 'text-slate-200'}`}>
                  {formatTemp(hour.temperature).match(/^[0-9.-]+/)?.[0]}°
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
};