import { useState } from "react";
import { 
  Layers, Thermometer, Wind, Droplets, Cloud, CloudRain, Gauge, 
  Satellite, CloudRainWind, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type LayerType = "forecast" | "satellite";
export type ForecastLayer = "temp" | "wind" | "humidity" | "cloudcover" | "precipitation" | "pressure";
export type SatelliteLayer = "truecolor" | "infrared" | "watervapor";

interface MapLayerSelectorProps {
  activeLayerType: LayerType;
  activeForecastLayer: ForecastLayer;
  activeSatelliteLayer: SatelliteLayer;
  showRadar: boolean;
  opacity: number;
  onLayerTypeChange: (type: LayerType) => void;
  onForecastLayerChange: (layer: ForecastLayer) => void;
  onSatelliteLayerChange: (layer: SatelliteLayer) => void;
  onRadarToggle: (show: boolean) => void;
  onOpacityChange: (opacity: number) => void;
}

const forecastLayers = [
  { id: "temp" as const, label: "Temperature", icon: Thermometer, color: "text-red-400" },
  { id: "wind" as const, label: "Wind", icon: Wind, color: "text-blue-400" },
  { id: "humidity" as const, label: "Humidity", icon: Droplets, color: "text-cyan-400" },
  { id: "cloudcover" as const, label: "Clouds", icon: Cloud, color: "text-gray-400" },
  { id: "precipitation" as const, label: "Rain", icon: CloudRain, color: "text-indigo-400" },
  { id: "pressure" as const, label: "Pressure", icon: Gauge, color: "text-purple-400" },
];

const satelliteLayers = [
  { id: "truecolor" as const, label: "True Color" },
  { id: "infrared" as const, label: "Infrared" },
  { id: "watervapor" as const, label: "Water Vapor" },
];

export const MapLayerSelector = ({
  activeLayerType,
  activeForecastLayer,
  activeSatelliteLayer,
  showRadar,
  opacity,
  onLayerTypeChange,
  onForecastLayerChange,
  onSatelliteLayerChange,
  onRadarToggle,
  onOpacityChange,
}: MapLayerSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeLayer = activeLayerType === "forecast" 
    ? forecastLayers.find(l => l.id === activeForecastLayer)
    : null;

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 right-3 sm:bottom-6 sm:right-4 z-[1000] max-h-[calc(100vh-120px)] flex flex-col-reverse">
        {/* Expanded Panel */}
        {isExpanded && (
          <div className="mb-2 sm:mb-3 bg-card/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-200 w-48 sm:w-56 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
            {/* Header */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/30 flex items-center justify-between bg-muted/30">
              <span className="text-xs sm:text-sm font-semibold text-foreground">Map Layers</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronUp className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Layer Type Toggle */}
            <div className="p-2 sm:p-3 border-b border-border/30">
              <div className="flex gap-1 bg-muted/50 p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
                <button
                  onClick={() => onLayerTypeChange("forecast")}
                  className={cn(
                    "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                    activeLayerType === "forecast"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Weather
                </button>
                <button
                  onClick={() => onLayerTypeChange("satellite")}
                  className={cn(
                    "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                    activeLayerType === "satellite"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Satellite
                </button>
              </div>
            </div>

            {/* Weather Layers */}
            {activeLayerType === "forecast" && (
              <div className="p-2 sm:p-3 space-y-0.5 sm:space-y-1">
                {forecastLayers.map((layer) => {
                  const Icon = layer.icon;
                  const isActive = activeForecastLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => onForecastLayerChange(layer.id)}
                      className={cn(
                        "w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-3.5 sm:w-4 h-3.5 sm:h-4", isActive ? layer.color : "")} />
                      <span className="font-medium">{layer.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Satellite Layers */}
            {activeLayerType === "satellite" && (
              <div className="p-2 sm:p-3 space-y-0.5 sm:space-y-1">
                {satelliteLayers.map((layer) => {
                  const isActive = activeSatelliteLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => onSatelliteLayerChange(layer.id)}
                      className={cn(
                        "w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Satellite className={cn("w-3.5 sm:w-4 h-3.5 sm:h-4", isActive ? "text-primary" : "")} />
                      <span className="font-medium">{layer.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Radar Toggle */}
            <div className="px-2 sm:px-3 pb-2 sm:pb-3">
              <button
                onClick={() => onRadarToggle(!showRadar)}
                className={cn(
                  "w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all border",
                  showRadar
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                <CloudRainWind className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                <span className="font-medium">Live Radar</span>
                {showRadar && (
                  <span className="ml-auto text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    ON
                  </span>
                )}
              </button>
            </div>

            {/* Opacity */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-border/30 bg-muted/20">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">Opacity</span>
                <span className="text-[10px] sm:text-xs font-medium text-foreground">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity * 100}
                onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
                className="w-full h-1 sm:h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}

        {/* Main Toggle Button - Google Maps Style */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-card/95 backdrop-blur-xl rounded-lg sm:rounded-xl shadow-lg border border-border/50 hover:shadow-xl transition-all hover:scale-105 active:scale-95",
                isExpanded && "ring-2 ring-primary/30"
              )}
            >
              <Layers className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                {activeLayer?.label || "Satellite"}
              </span>
              {showRadar && (
                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Change map layers</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
