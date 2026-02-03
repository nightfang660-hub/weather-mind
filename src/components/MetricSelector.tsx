import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X } from "lucide-react";

export type MetricCategory = "weather" | "airQuality";

export interface MetricOption {
  id: string;
  label: string;
  category: MetricCategory;
  unit: string;
  apiParam: string;
}

export const AVAILABLE_METRICS: MetricOption[] = [
  // Weather Metrics
  { id: "temp", label: "Temperature", category: "weather", unit: "°C", apiParam: "temperature_2m" },
  { id: "humidity", label: "Relative Humidity", category: "weather", unit: "%", apiParam: "relative_humidity_2m" },
  { id: "precipitation", label: "Precipitation", category: "weather", unit: "mm", apiParam: "precipitation" },
  { id: "rain", label: "Rain", category: "weather", unit: "mm", apiParam: "rain" },
  { id: "showers", label: "Showers", category: "weather", unit: "mm", apiParam: "showers" },
  { id: "snowfall", label: "Snowfall", category: "weather", unit: "cm", apiParam: "snowfall" },
  { id: "cloud_cover", label: "Cloud Cover", category: "weather", unit: "%", apiParam: "cloud_cover" },
  { id: "wind_speed", label: "Wind Speed", category: "weather", unit: "km/h", apiParam: "wind_speed_10m" },
  { id: "wind_gusts", label: "Wind Gusts", category: "weather", unit: "km/h", apiParam: "wind_gusts_10m" },
  { id: "pressure", label: "Sea Level Pressure", category: "weather", unit: "hPa", apiParam: "pressure_msl" },
  { id: "visibility", label: "Visibility", category: "weather", unit: "m", apiParam: "visibility" },
  { id: "dewpoint", label: "Dewpoint", category: "weather", unit: "°C", apiParam: "dew_point_2m" },
  { id: "apparent_temp", label: "Apparent Temperature", category: "weather", unit: "°C", apiParam: "apparent_temperature" },
  { id: "evapotranspiration", label: "Evapotranspiration", category: "weather", unit: "mm", apiParam: "evapotranspiration" },
  
  // Air Quality Metrics
  { id: "pm10", label: "PM10", category: "airQuality", unit: "μg/m³", apiParam: "pm10" },
  { id: "pm2_5", label: "PM2.5", category: "airQuality", unit: "μg/m³", apiParam: "pm2_5" },
  { id: "carbon_monoxide", label: "Carbon Monoxide (CO)", category: "airQuality", unit: "μg/m³", apiParam: "carbon_monoxide" },
  { id: "nitrogen_dioxide", label: "Nitrogen Dioxide (NO₂)", category: "airQuality", unit: "μg/m³", apiParam: "nitrogen_dioxide" },
  { id: "sulphur_dioxide", label: "Sulphur Dioxide (SO₂)", category: "airQuality", unit: "μg/m³", apiParam: "sulphur_dioxide" },
  { id: "ozone", label: "Ozone (O₃)", category: "airQuality", unit: "μg/m³", apiParam: "ozone" },
  { id: "dust", label: "Dust", category: "airQuality", unit: "μg/m³", apiParam: "dust" },
  { id: "uv_index", label: "UV Index", category: "airQuality", unit: "", apiParam: "uv_index" },
  { id: "aerosol", label: "Aerosol Optical Depth", category: "airQuality", unit: "", apiParam: "aerosol_optical_depth" },
];

interface MetricSelectorProps {
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
}

export const MetricSelector = ({ selectedMetrics, onMetricsChange }: MetricSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<MetricCategory>("weather");

  const filteredMetrics = AVAILABLE_METRICS.filter(
    (metric) =>
      metric.category === activeCategory &&
      metric.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleMetric = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      onMetricsChange(selectedMetrics.filter((id) => id !== metricId));
    } else {
      onMetricsChange([...selectedMetrics, metricId]);
    }
  };

  const handleSelectAll = () => {
    const categoryMetrics = AVAILABLE_METRICS
      .filter((m) => m.category === activeCategory)
      .map((m) => m.id);
    const otherMetrics = selectedMetrics.filter(
      (id) => !AVAILABLE_METRICS.find((m) => m.id === id && m.category === activeCategory)
    );
    onMetricsChange([...otherMetrics, ...categoryMetrics]);
  };

  const handleClearAll = () => {
    const otherMetrics = selectedMetrics.filter(
      (id) => !AVAILABLE_METRICS.find((m) => m.id === id && m.category === activeCategory)
    );
    onMetricsChange(otherMetrics);
  };

  return (
    <Card className="p-4 bg-card border-2 border-border/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Metrics</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as MetricCategory)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="airQuality">Air Quality</TabsTrigger>
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {filteredMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                    <Checkbox
                      id={metric.id}
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => handleToggleMetric(metric.id)}
                    />
                    <Label
                      htmlFor={metric.id}
                      className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {metric.label}
                      <span className="ml-2 text-xs text-muted-foreground">({metric.unit})</span>
                    </Label>
                  </div>
                ))}
                {filteredMetrics.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No metrics found matching "{searchQuery}"
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-semibold text-foreground">{selectedMetrics.length}</span> metrics
          </p>
        </div>
      </div>
    </Card>
  );
};
