import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Thermometer, Wind, Droplets, Cloud, CloudRain, Gauge, Satellite, 
  CloudRainWind, Layers, Eye, ChevronUp, ChevronDown, X, RefreshCw,
  Sun, Moon, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LayerType = "forecast" | "satellite";
export type ForecastLayer = "temp" | "wind" | "humidity" | "cloudcover" | "precipitation" | "pressure";
export type SatelliteLayer = "truecolor" | "infrared" | "watervapor";
export type ThemeMode = "light" | "dark" | "system";

interface LayerControlProps {
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
  { id: "temp" as const, label: "Temp", fullLabel: "Temperature", icon: Thermometer, unit: "°C" },
  { id: "wind" as const, label: "Wind", fullLabel: "Wind Speed", icon: Wind, unit: "km/h" },
  { id: "humidity" as const, label: "Humidity", fullLabel: "Humidity Level", icon: Droplets, unit: "%" },
  { id: "cloudcover" as const, label: "Cloud", fullLabel: "Cloud Cover", icon: Cloud, unit: "%" },
  { id: "precipitation" as const, label: "Rain", fullLabel: "Precipitation", icon: CloudRain, unit: "mm" },
  { id: "pressure" as const, label: "Pressure", fullLabel: "Air Pressure", icon: Gauge, unit: "hPa" },
];

const satelliteLayers = [
  { id: "truecolor" as const, label: "True Color", description: "Natural satellite view" },
  { id: "infrared" as const, label: "Infrared", description: "Heat signature imagery" },
  { id: "watervapor" as const, label: "Water Vapor", description: "Atmospheric moisture" },
];

export const LayerControl = ({
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
}: LayerControlProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as ThemeMode;
      return stored || "dark";
    }
    return "dark";
  });

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    
    if (newTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "dark" : "light");
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => setIsClosing(false), 300);
  };

  if (isClosing) {
    return (
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          onClick={() => setIsClosing(false)}
          className="layer-panel-glass p-3 rounded-xl hover:scale-105 transition-transform"
        >
          <Layers className="w-5 h-5 text-layer-icon-active" />
        </button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "absolute top-4 left-4 z-[1000] layer-panel-animate",
        isCollapsed ? "w-auto" : "w-80"
      )}>
        {/* Glass morphism container */}
        <div className="layer-panel-glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="layer-panel-header px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-layer-icon-active/20 layer-glow-subtle">
                <Layers className="w-4 h-4 text-layer-icon-active" />
              </div>
              <span className="font-semibold text-sm text-foreground">Map Layers</span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{isCollapsed ? "Expand" : "Collapse"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Close panel</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Collapsible Content */}
          <div className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            isCollapsed ? "max-h-0 opacity-0" : "max-h-[800px] opacity-100"
          )}>
            <div className="p-4 space-y-4">
              {/* Layer Type Toggle Tabs */}
              <div className="layer-tabs-container p-1 flex gap-1">
                <button
                  onClick={() => onLayerTypeChange("forecast")}
                  className={cn(
                    "layer-tab flex-1",
                    activeLayerType === "forecast" && "layer-tab-active"
                  )}
                >
                  <CloudRain className="w-4 h-4" />
                  <span>Forecast</span>
                </button>
                <button
                  onClick={() => onLayerTypeChange("satellite")}
                  className={cn(
                    "layer-tab flex-1",
                    activeLayerType === "satellite" && "layer-tab-active"
                  )}
                >
                  <Satellite className="w-4 h-4" />
                  <span>Satellite</span>
                </button>
              </div>

              {/* Weather Data Section */}
              {activeLayerType === "forecast" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Weather Data
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-muted/50 transition-colors">
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Refresh layer data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* 3x2 Grid Layout */}
                  <div className="grid grid-cols-3 gap-2">
                    {forecastLayers.map((layer) => {
                      const Icon = layer.icon;
                      const isActive = activeForecastLayer === layer.id;
                      return (
                        <Tooltip key={layer.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onForecastLayerChange(layer.id)}
                              className={cn(
                                "layer-metric-btn group",
                                isActive && "layer-metric-btn-active"
                              )}
                            >
                              <Icon className={cn(
                                "w-5 h-5 mb-1 transition-colors",
                                isActive ? "text-layer-icon-active" : "text-layer-icon-inactive group-hover:text-layer-icon-hover"
                              )} />
                              <span className={cn(
                                "text-[11px] font-medium transition-colors",
                                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                              )}>
                                {layer.label}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{layer.fullLabel} ({layer.unit})</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Satellite Layers */}
              {activeLayerType === "satellite" && (
                <div className="space-y-3">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Satellite View
                  </Label>
                  <div className="space-y-2">
                    {satelliteLayers.map((layer) => {
                      const isActive = activeSatelliteLayer === layer.id;
                      return (
                        <button
                          key={layer.id}
                          onClick={() => onSatelliteLayerChange(layer.id)}
                          className={cn(
                            "layer-satellite-btn w-full",
                            isActive && "layer-satellite-btn-active"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            isActive ? "bg-layer-icon-active/20" : "bg-muted/50"
                          )}>
                            <Satellite className={cn(
                              "w-4 h-4",
                              isActive ? "text-layer-icon-active" : "text-layer-icon-inactive"
                            )} />
                          </div>
                          <div className="text-left flex-1">
                            <div className={cn(
                              "text-sm font-medium",
                              isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {layer.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {layer.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-layer-icon-active animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Radar Toggle */}
              <div className="pt-3 border-t border-border/30">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onRadarToggle(!showRadar)}
                      className={cn(
                        "layer-radar-btn w-full",
                        showRadar && "layer-radar-btn-active"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-xl transition-all",
                          showRadar ? "bg-emerald-500/20 layer-glow-radar" : "bg-muted/50"
                        )}>
                          <CloudRainWind className={cn(
                            "w-5 h-5",
                            showRadar ? "text-emerald-400" : "text-layer-icon-inactive"
                          )} />
                        </div>
                        <div className="text-left">
                          <div className={cn(
                            "text-sm font-semibold flex items-center gap-2",
                            showRadar ? "text-foreground" : "text-muted-foreground"
                          )}>
                            Live Radar
                            {showRadar && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                                LIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Real-time rain radar overlay
                          </div>
                        </div>
                      </div>
                      
                      {/* Toggle Switch */}
                      <div className={cn(
                        "layer-toggle-switch",
                        showRadar && "layer-toggle-switch-active"
                      )}>
                        <div className={cn(
                          "layer-toggle-thumb",
                          showRadar && "layer-toggle-thumb-active"
                        )} />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Real-time precipitation radar overlay</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Opacity Slider */}
              <div className="pt-3 border-t border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Layer Opacity
                  </Label>
                  <span className="layer-opacity-badge">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <div className="layer-slider-container">
                  <Slider
                    value={[opacity * 100]}
                    onValueChange={(value) => onOpacityChange(value[0] / 100)}
                    max={100}
                    step={5}
                    className="layer-slider"
                  />
                </div>
              </div>

              {/* Theme Switcher */}
              <div className="pt-3 border-t border-border/30 space-y-3">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Theme
                </Label>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleThemeChange("light")}
                        className={cn(
                          "layer-theme-btn flex-1",
                          theme === "light" && "layer-theme-btn-active"
                        )}
                      >
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Light theme</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleThemeChange("dark")}
                        className={cn(
                          "layer-theme-btn flex-1",
                          theme === "dark" && "layer-theme-btn-active"
                        )}
                      >
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Dark theme</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleThemeChange("system")}
                        className={cn(
                          "layer-theme-btn flex-1",
                          theme === "system" && "layer-theme-btn-active"
                        )}
                      >
                        <Monitor className="w-4 h-4" />
                        <span>Auto</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>System preference</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Attribution */}
              <div className="pt-3 border-t border-border/30">
                <div className="flex items-center justify-center gap-3 text-[9px] text-muted-foreground/60">
                  <span>© OpenStreetMap</span>
                  <span>•</span>
                  <span>Open-Meteo</span>
                  <span>•</span>
                  <span>RainViewer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
