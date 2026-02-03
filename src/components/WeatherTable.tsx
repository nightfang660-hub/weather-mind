import { Card } from "@/components/ui/card";
import { getWeatherIcon, getWeatherDescription, getUVLevel } from "@/lib/weather-icons";
import { Sunrise, Sunset, Eye, Thermometer, Droplets, Wind, Gauge, CloudRain, Cloud, Navigation } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  rainfall: number;
  cloudCover: number;
  feelsLike: number;
  uvIndex: number;
  visibility: number;
  sunrise: string;
  sunset: string;
  weatherCode: number;
}

interface WeatherTableProps {
  data: WeatherData | null;
  loading: boolean;
}

export const WeatherTable = ({ data, loading }: WeatherTableProps) => {
  const { formatTemp, formatSpeed, formatPressure } = useSettings();

  if (loading || !data) {
    return (
      // Skeleton Loader
      <div className="hero-glass h-[400px] w-full p-8 animate-pulse flex items-center justify-center">
        <div className="text-white/20">Loading Atmosphere Data...</div>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(data.weatherCode);
  const weatherDesc = getWeatherDescription(data.weatherCode);
  const uvLevel = getUVLevel(data.uvIndex);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="hero-glass p-8 relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(0,229,255,0.15)] group">

      {/* Dynamic Glow - Background */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

        {/* Left Col: Main Temps & Icon */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Live Weather</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative">
                {/* Icon Glow */}
                <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full scale-150 opacity-50" />
                <WeatherIcon className="w-24 h-24 text-white relative drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-float" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-8xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-none tracking-tighter">
                  {Math.round(data.temperature)}°
                </h1>
                <p className="text-xl text-blue-200 font-medium capitalize mt-2 flex items-center gap-2">
                  {weatherDesc}
                  <span className="text-white/20 text-sm">|</span>
                  <span className="text-white/60 text-base">Feels {Math.round(data.feelsLike)}°</span>
                </p>
              </div>
            </div>
          </div>

          {/* Sun Times */}
          <div className="flex gap-8 mt-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Sunrise className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Sunrise</p>
                <p className="text-sm font-semibold text-white">{formatTime(data.sunrise)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Sunset className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Sunset</p>
                <p className="text-sm font-semibold text-white">{formatTime(data.sunset)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Grid Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricTile icon={Wind} label="Wind" value={`${Math.round(data.windSpeed)} km/h`} color="text-cyan-400" />
          <MetricTile icon={Droplets} label="Humidity" value={`${data.humidity}%`} color="text-blue-400" />
          <MetricTile icon={Gauge} label="Pressure" value={`${Math.round(data.pressure)} hPa`} color="text-purple-400" />

          <MetricTile icon={CloudRain} label="Rainfall" value={`${data.rainfall} mm`} color="text-indigo-400" />
          <MetricTile icon={Eye} label="Visibility" value={`${data.visibility} km`} color="text-emerald-400" />
          <MetricTile icon={Navigation} label="UV Index" value={`${data.uvIndex}`} sub={uvLevel.level} color={uvLevel.level === 'High' ? 'text-red-400' : 'text-amber-400'} />
        </div>
      </div>
    </div>
  );
};

// Sub-Component for Clean Metrics
const MetricTile = ({ icon: Icon, label, value, sub, color }: any) => (
  <div className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all rounded-2xl p-4 flex flex-col justify-center gap-2 group">
    <div className="flex justify-between items-start">
      <Icon className={`w-5 h-5 ${color} opacity-80 group-hover:scale-110 transition-transform`} />
      {sub && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 ${color}`}>{sub}</span>}
    </div>
    <div>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-white/50 uppercase font-medium">{label}</p>
    </div>
  </div>
);