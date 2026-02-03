/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchHistoricalWeather, fetchAirQualityHistory } from "@/lib/weather-api";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { MetricSelector, AVAILABLE_METRICS } from "./MetricSelector";
import { DateRangePicker } from "./DateRangePicker";
import { CitySelector, type SelectedCity } from "./CitySelector";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
  "#22d3ee", // sky
];

interface HistoricalChartProps {
  initialLocation: { name: string; lat: number; lon: number };
}

export const HistoricalChart = ({ initialLocation }: HistoricalChartProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["temp", "humidity", "precipitation", "dewpoint"]);
  const [visibleMetrics, setVisibleMetrics] = useState<{ [key: string]: boolean }>({
    temp: true,
    humidity: true,
    precipitation: true,
    dewpoint: true,
  });
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([
    { ...initialLocation, color: CHART_COLORS[0] }
  ]);
  const [rawData, setRawData] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (selectedMetrics.length === 0) {
        setRawData(new Map());
        return;
      }
      
      setLoading(true);
      setError(null);
      const newData = new Map<string, any>();
      
      try {
        // Separate weather and air quality metrics
        const weatherMetrics = selectedMetrics
          .map(id => AVAILABLE_METRICS.find(m => m.id === id))
          .filter(m => m?.category === "weather")
          .map(m => m!.apiParam);
        
        const airQualityMetrics = selectedMetrics
          .map(id => AVAILABLE_METRICS.find(m => m.id === id))
          .filter(m => m?.category === "airQuality")
          .map(m => m!.apiParam);

        for (const city of selectedCities) {
          const cityDataObj: any = { weather: null, airQuality: null };
          
          // Fetch weather data
          if (weatherMetrics.length > 0) {
            try {
              const weatherData = await fetchHistoricalWeather(
                city.lat, 
                city.lon, 
                startDate, 
                endDate,
                weatherMetrics
              );
              cityDataObj.weather = weatherData;
            } catch (err) {
              console.warn(`Weather data error for ${city.name}:`, err);
            }
          }
          
          // Fetch air quality data
          if (airQualityMetrics.length > 0) {
            try {
              const aqData = await fetchAirQualityHistory(
                city.lat,
                city.lon,
                startDate,
                endDate,
                airQualityMetrics
              );
              cityDataObj.airQuality = aqData;
            } catch (err) {
              console.warn(`Air quality data not available for ${city.name}`);
            }
          }
          
          newData.set(city.name, cityDataObj);
        }
        
        if (isMounted) {
          setRawData(newData);
        }
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
        if (isMounted) {
          setError("Failed to fetch historical data.");
          toast({
            title: "Error",
            description: "Failed to fetch historical data.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCities, startDate, endDate, selectedMetrics]);

  const toggleMetric = (metricId: string) => {
    setVisibleMetrics(prev => ({ ...prev, [metricId]: !prev[metricId] }));
  };

  const handleMetricsChange = (newMetrics: string[]) => {
    setSelectedMetrics(newMetrics);
    const newVisible: { [key: string]: boolean } = {};
    newMetrics.forEach(id => {
      newVisible[id] = visibleMetrics[id] !== undefined ? visibleMetrics[id] : true;
    });
    setVisibleMetrics(newVisible);
  };

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Transform raw API data into chart format
  const combinedData = useMemo(() => {
    if (rawData.size === 0) return [];
    
    const timeMap = new Map<string, any>();
    
    selectedCities.forEach(city => {
      const cityDataObj = rawData.get(city.name);
      if (!cityDataObj) return;
      
      // Process weather data
      if (cityDataObj.weather?.hourly) {
        const times = cityDataObj.weather.hourly.time || [];
        times.forEach((time: string, idx: number) => {
          const dateKey = format(new Date(time), "MMM dd HH:mm");
          if (!timeMap.has(dateKey)) {
            timeMap.set(dateKey, { time: dateKey, timestamp: new Date(time).getTime() });
          }
          const point = timeMap.get(dateKey);
          
          selectedMetrics.forEach(metricId => {
            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
            if (metric?.category === "weather") {
              const apiData = cityDataObj.weather.hourly[metric.apiParam];
              if (apiData && apiData[idx] !== undefined) {
                point[`${city.name}_${metricId}`] = apiData[idx];
              }
            }
          });
        });
      }
      
      // Process air quality data
      if (cityDataObj.airQuality?.hourly) {
        const times = cityDataObj.airQuality.hourly.time || [];
        times.forEach((time: string, idx: number) => {
          const dateKey = format(new Date(time), "MMM dd HH:mm");
          if (!timeMap.has(dateKey)) {
            timeMap.set(dateKey, { time: dateKey, timestamp: new Date(time).getTime() });
          }
          const point = timeMap.get(dateKey);
          
          selectedMetrics.forEach(metricId => {
            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
            if (metric?.category === "airQuality") {
              const apiData = cityDataObj.airQuality.hourly[metric.apiParam];
              if (apiData && apiData[idx] !== undefined) {
                point[`${city.name}_${metricId}`] = apiData[idx];
              }
            }
          });
        });
      }
    });
    
    return Array.from(timeMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rawData, selectedCities, selectedMetrics]);

  // Group metrics by their unit type for multi-axis support
  const metricsByAxis = useMemo(() => {
    const axes: { [key: string]: string[] } = {
      temperature: [], // °C
      percentage: [], // %
      precipitation: [], // mm
      pressure: [], // hPa
      speed: [], // km/h
      distance: [], // m
      concentration: [], // μg/m³
      other: []
    };
    
    selectedMetrics.forEach(metricId => {
      const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
      if (!metric) return;
      
      if (metric.unit === "°C") axes.temperature.push(metricId);
      else if (metric.unit === "%") axes.percentage.push(metricId);
      else if (metric.unit === "mm" || metric.unit === "cm") axes.precipitation.push(metricId);
      else if (metric.unit === "hPa") axes.pressure.push(metricId);
      else if (metric.unit === "km/h") axes.speed.push(metricId);
      else if (metric.unit === "m") axes.distance.push(metricId);
      else if (metric.unit === "μg/m³") axes.concentration.push(metricId);
      else axes.other.push(metricId);
    });
    
    return axes;
  }, [selectedMetrics]);

  // Determine which axes to show
  const axisConfig = useMemo(() => {
    const config: any[] = [];
    let yAxisId = 0;
    
    Object.entries(metricsByAxis).forEach(([axisType, metrics]) => {
      if (metrics.length > 0) {
        const metric = AVAILABLE_METRICS.find(m => m.id === metrics[0]);
        config.push({
          id: `axis-${yAxisId}`,
          type: axisType,
          unit: metric?.unit || "",
          orientation: config.length === 0 ? "left" : "right",
          metrics: metrics
        });
        yAxisId++;
      }
    });
    
    return config;
  }, [metricsByAxis]);

  // All hooks called - now safe to do early returns
  
  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <MetricSelector
          selectedMetrics={selectedMetrics}
          onMetricsChange={handleMetricsChange}
        />
        <Card className="p-6 bg-card animate-fade-in">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-[400px] w-full" />
        </Card>
      </div>
    );
  }

  // Show empty state when no metrics selected
  if (selectedMetrics.length === 0) {
    return (
      <div className="space-y-4">
        <MetricSelector
          selectedMetrics={selectedMetrics}
          onMetricsChange={handleMetricsChange}
        />
        <Card className="p-6 bg-card animate-fade-in border-2 border-border/50">
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Select metrics above to display the chart
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <MetricSelector
          selectedMetrics={selectedMetrics}
          onMetricsChange={handleMetricsChange}
        />
        <Card className="p-6 bg-destructive/10 animate-fade-in border-2 border-destructive/50">
          <div className="h-96 flex items-center justify-center text-destructive">
            {error} - Please try again or select different metrics.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MetricSelector
        selectedMetrics={selectedMetrics}
        onMetricsChange={handleMetricsChange}
      />
      
      <Card className="p-6 bg-card animate-fade-in border-2 border-border/50">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Historical Weather Trends</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCities.length} {selectedCities.length === 1 ? 'location' : 'locations'} • {combinedData.length} data points
                </p>
              </div>
            </div>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
          </div>

          <CitySelector
            selectedCities={selectedCities}
            onCitiesChange={setSelectedCities}
          />
        </div>

        {/* Metric Toggle Buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {selectedMetrics.map((metricId, index) => {
            const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
            if (!metric) return null;
            const colorIndex = selectedCities.length > 1 
              ? Math.floor(index / selectedCities.length) 
              : index;
            const color = CHART_COLORS[colorIndex % CHART_COLORS.length];
            return (
              <Button
                key={metricId}
                variant={visibleMetrics[metricId] ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMetric(metricId)}
                className="text-xs transition-all"
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: color }}
                />
                {metric.label}
              </Button>
            );
          })}
        </div>

        {/* Multi-Axis Chart */}
        <div className="bg-background/60 p-4 rounded-lg border border-border/30">
          {combinedData.length === 0 || axisConfig.length === 0 ? (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              {loading ? "Loading chart data..." : "No data available for the selected metrics and date range"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={combinedData} margin={{ top: 5, right: 60, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                
                {/* Multiple Y-Axes based on metric units */}
                {axisConfig.map((axis) => (
                  <YAxis
                    key={axis.id}
                    yAxisId={axis.id}
                    orientation={axis.orientation}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '10px' }}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ 
                      value: axis.unit, 
                      angle: -90, 
                      position: axis.orientation === 'left' ? 'insideLeft' : 'insideRight',
                      style: { fontSize: '11px', fill: 'hsl(var(--muted-foreground))' }
                    }}
                    domain={['auto', 'auto']}
                  />
                ))}
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "11px"
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                />
                
                <Legend 
                  wrapperStyle={{
                    fontSize: '10px',
                    paddingTop: '10px'
                  }}
                  iconType="line"
                />
                
                {/* Render lines for each city and metric combination */}
                {selectedCities.map((city, cityIdx) => 
                  selectedMetrics.map((metricId, metricIdx) => {
                    const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                    if (!metric || !visibleMetrics[metricId]) return null;
                    
                    // Find which axis this metric belongs to
                    const axisForMetric = axisConfig.find(a => a.metrics.includes(metricId));
                    if (!axisForMetric) return null;
                    
                    const dataKey = `${city.name}_${metricId}`;
                    const colorIndex = (cityIdx * selectedMetrics.length + metricIdx) % CHART_COLORS.length;
                    const color = CHART_COLORS[colorIndex];
                    
                    return (
                      <Line
                        key={`${city.name}-${metricId}`}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        name={`${city.name} - ${metric.label}${metric.unit ? ` (${metric.unit})` : ''}`}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        animationDuration={1000}
                        connectNulls
                        yAxisId={axisForMetric.id}
                      />
                    );
                  })
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};
