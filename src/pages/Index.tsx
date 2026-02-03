import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SearchBox } from "@/components/SearchBox";
import { UserProfile } from "@/components/UserProfile";
import { WeatherMapWithLayers } from "@/components/WeatherMapWithLayers";
import { RadarOverlay } from "@/components/RadarOverlay";
import { AQICard } from "@/components/AQICard";
import { ThemeToggle } from "@/components/ThemeToggle";

import { WeatherTable } from "@/components/WeatherTable";
import { ForecastChart } from "@/components/ForecastChart";
import { HourlyForecast } from "@/components/HourlyForecast";
import { SavedLocations } from "@/components/SavedLocations";
import { HistoricalChart } from "@/components/HistoricalChart";
import { WeatherComparison } from "@/components/WeatherComparison";
import { WeatherAlerts } from "@/components/WeatherAlerts";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DynamicBackground } from "@/components/layout/DynamicBackground";
import {
  fetchWeatherData,
  fetchForecastData,
  fetchHourlyForecast,
  fetchQuantumAnalysis,
  analyzeWeatherAlerts,
  geocodeCity,
  getUserLocation,
  type WeatherData,
  type ForecastData,
  type HourlyForecastData,
  type WeatherAlert,
  type GeocodingResult,
  type QuantumAnalysisResult,
  type QuantumLog,
} from "@/lib/weather-api";
import { Menu, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

import { QuantumPanel } from "@/components/QuantumPanel";
import { DisasterIntelligenceHUD } from "@/components/dashboard/DisasterIntelligenceHUD";
import { ProMetricsGrid } from "@/components/dashboard/ProMetricsGrid";
import { LayoutDashboard, Globe, Radio, ArrowRightLeft } from "lucide-react";

const Index = () => {
  const [activeView, setActiveView] = useState<"forecast" | "map" | "climate" | "historical" | "comparison" | "radar">("forecast");
  const [location, setLocation] = useState<{ lat: number; lon: number }>({
    lat: 17.385,
    lon: 78.4867,
  });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyForecastData[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [quantumData, setQuantumData] = useState<QuantumAnalysisResult | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [skipReverseGeocode, setSkipReverseGeocode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const { toast } = useToast();

  // Fetch weather data when location changes
  useEffect(() => {
    const loadWeatherData = async () => {
      setLoading(true);
      try {
        const [weather, forecast, hourly] = await Promise.all([
          fetchWeatherData(location.lat, location.lon),
          fetchForecastData(location.lat, location.lon),
          fetchHourlyForecast(location.lat, location.lon),
        ]);
        setWeatherData(weather);
        setForecastData(forecast);
        setHourlyData(hourly);

        // Analyze for weather alerts
        const alerts = analyzeWeatherAlerts(weather);
        setWeatherAlerts(alerts);

        // Fetch Quantum Analysis
        try {
          const quantum = await fetchQuantumAnalysis(weather, {
            name: locationName || "Unknown",
            lat: location.lat,
            lon: location.lon
          });
          setQuantumData(quantum);
        } catch (error) {
          console.error("Failed to fetch quantum analysis:", error);
        }

        // Only reverse geocode if location wasn't set from search
        if (!skipReverseGeocode) {
          try {
            // Use zoom=18 for more precise results (village/locality level)
            const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lon}&zoom=18&addressdetails=1`;
            const reverseResponse = await fetch(reverseGeocodeUrl, {
              headers: {
                'User-Agent': 'WeatherDashboard/1.0'
              }
            });
            if (reverseResponse.ok) {
              const reverseData = await reverseResponse.json();
              const address = reverseData.address;
              // Get the most specific location name available
              const locality = address.village || address.hamlet || address.suburb ||
                address.town || address.city || address.county;
              const state = address.state;
              const country = address.country;

              if (locality && state && country) {
                setLocationName(`${locality}, ${state}, ${country}`);
              } else if (locality && country) {
                setLocationName(`${locality}, ${country}`);
              } else if (reverseData.display_name) {
                const parts = reverseData.display_name.split(',');
                setLocationName(parts.slice(0, 3).join(',').trim());
              }
            }
          } catch (reverseError) {
            console.error('Reverse geocoding failed:', reverseError);
            setLocationName(`Location (${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°)`);
          }
        }
        // Reset the skip flag after loading
        setSkipReverseGeocode(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch weather data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadWeatherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Try to get user's location on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const loc = await getUserLocation();
        setLocation(loc);
        toast({
          title: "Location detected",
          description: "Showing weather for your current location",
        });
      } catch (error) {
        // Silently fail and use default location (Hyderabad)
        console.warn('Location detection failed (requires HTTPS or localhost):', error);
      }
    };
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (cityName: string) => {
    try {
      const result = await geocodeCity(cityName);
      if (result) {
        setLocation({ lat: result.latitude, lon: result.longitude });
        setLocationName(`${result.name}, ${result.country}`);
        toast({
          title: "Location updated",
          description: `Showing weather for ${result.name}, ${result.country}`,
        });
      } else {
        toast({
          title: "City not found",
          description: "Please try a different city name.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search for city. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    setLocation({ lat, lon });
    toast({
      title: "Location updated",
      description: `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    });
  };

  const handleLocationSelect = (loc: GeocodingResult) => {
    // Set flag to skip reverse geocoding since we have the exact location name
    setSkipReverseGeocode(true);
    const displayName = loc.admin1
      ? `${loc.name}, ${loc.admin1}, ${loc.country}`
      : `${loc.name}, ${loc.country}`;
    setLocationName(displayName);
    setLocation({ lat: loc.latitude, lon: loc.longitude });
    toast({
      title: "Location updated",
      description: `Showing weather for ${displayName}`,
    });
  };

  return (
    <div className="flex min-h-screen text-foreground font-sans overflow-hidden relative">

      {/* DYNAMIC BACKGROUND LAYER */}
      <DynamicBackground weatherCode={weatherData?.weatherCode || 0} />

      {/* Mobile Menu Button - Enhanced */}
      {!isMapFullscreen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-background/50 backdrop-blur-md border-primary/20"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Sidebar - Peaceful Glass Style */}
      {!isMapFullscreen && (
        <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 fixed md:relative inset-y-0 left-0 z-40 w-64 md:w-auto h-full border-r border-white/5 bg-card/10 backdrop-blur-xl`}>
          <Sidebar
            activeView={activeView}
            onViewChange={(view) => {
              setActiveView(view);
              setSidebarOpen(false);
            }}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 relative ${isMapFullscreen ? '' : 'h-screen overflow-y-auto scrollbar-hide'}`}>

        {/* Pro Header - Sticky Glass */}
        {!isMapFullscreen && (
          <header className="sticky top-0 z-30 px-6 py-4 bg-background/20 backdrop-blur-md border-b border-white/5 transition-all">
            <div className="max-w-[1920px] mx-auto flex items-center justify-between">

              <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                <div className="p-2 rounded-xl bg-primary/20 border border-primary/20 text-primary shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight truncate text-white border-none">{locationName || "Locating..."}</h1>
                  <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
                    <span>{location.lat.toFixed(4)}°N</span>
                    <span>{location.lon.toFixed(4)}°E</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <SearchBox onSearch={handleSearch} onLocationSelect={handleLocationSelect} />
                <ThemeToggle />
                <UserProfile />
              </div>

            </div>
          </header>
        )}

        <div className={`p-4 md:p-6 lg:p-8 space-y-6 max-w-[1920px] mx-auto ${isMapFullscreen ? 'p-0' : ''}`}>


          {/* DASHBOARD VIEW - PROFESSIONAL 3-PANEL LAYOUT */}
          {activeView === "forecast" && (
            <div className="animate-fade-in grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-8rem)] min-h-[800px]">


              {/* CENTER PANEL: Main Intelligence (8 Cols) */}
              <div className="xl:col-span-8 space-y-6 overflow-y-auto px-2 scrollbar-none pb-20">

                {/* Alert Banner */}
                {weatherAlerts.length > 0 && (
                  <div className="animate-pulse">
                    <WeatherAlerts alerts={weatherAlerts} />
                  </div>
                )}

                {/* Main Hero: Current Conditions */}
                <div className="w-full">
                  <WeatherTable data={weatherData} loading={loading} />
                </div>

                {/* Hourly & Forecast Strip - Wrapped in Glass Panel if needed */}
                <div className="glass-panel p-6">
                  <h3 className="text-sm font-bold text-white/50 uppercase mb-4 tracking-wider">Hourly Forecast</h3>
                  <HourlyForecast data={hourlyData} loading={loading} />
                </div>

                {/* Chart for Trends */}
                <div className="glass-panel p-6">
                  <h3 className="text-sm font-bold text-white/50 uppercase mb-4 tracking-wider">7-Day Projection</h3>
                  <ForecastChart data={forecastData} loading={loading} />
                </div>

                {/* QUANTUM CORE PANEL - Moved Here */}
                <div className="glass-panel p-6 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/50 uppercase">Quantum Core Intelligence</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                      </div>
                    </div>
                  </div>
                  {/* Fixed: Passing location data for Timeline */}
                  <QuantumPanel weather={weatherData} location={location} locationName={locationName} />
                </div>

              </div>

              {/* RIGHT PANEL: Risk & Quantum HUD (4 Cols) */}
              <div className="xl:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 scrollbar-none pb-20">

                {/* Disaster Intelligence HUD - Primary Risk Monitor */}
                <div className="relative min-h-[300px] w-full animate-fade-in z-20">
                  <DisasterIntelligenceHUD
                    stormProb={quantumData?.storm_probability || 0}
                    cycloneIndex={quantumData?.cyclone_index || 0}
                    floodRisk={quantumData?.flood_risk || 0}
                    chaosVelocity={quantumData?.chaos_velocity || 0}
                    stateLockIn={quantumData?.state_lock_in || false}
                  />
                </div>

                {/* Pro Metrics Grid - Telemetry */}
                {weatherData && <ProMetricsGrid data={weatherData} />}

                {/* Saved Locations Moved Here */}
                <div className="mt-4 glass-panel p-4">
                  <h4 className="text-xs font-bold text-white/50 uppercase mb-3">Watchlist</h4>
                  <SavedLocations
                    currentLocation={location}
                    onLocationSelect={(lat, lon) => setLocation({ lat, lon })}
                    currentLocationName={locationName}
                  />
                </div>
              </div>

            </div>
          )}

          {/* OTHER VIEWS (Full Page) */}
          {activeView === "map" && (
            <Card className={`${isMapFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none border-0' : 'h-[85vh]'} bg-card/10 overflow-hidden animate-fade-in border-white/10`}>
              <WeatherMapWithLayers
                center={[location.lat, location.lon]}
                onMapClick={handleMapClick}
                isFullscreen={isMapFullscreen}
                onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
                showMiniMap={false}
              />
              {/* Floating Back Button for Fullscreen */}
              {isMapFullscreen && (
                <Button className="absolute top-4 left-4 z-[60]" variant="secondary" onClick={() => setIsMapFullscreen(false)}>
                  Exit Fullscreen
                </Button>
              )}
            </Card>
          )}

          {activeView === "radar" && (
            <div className="h-[85vh] animate-fade-in glass-panel overflow-hidden p-0">
              <RadarOverlay center={[location.lat, location.lon]} />
            </div>
          )}

          {activeView === "historical" && (
            <div className="animate-fade-in glass-panel p-6">
              <HistoricalChart
                initialLocation={{
                  name: locationName,
                  lat: location.lat,
                  lon: location.lon
                }}
              />
            </div>
          )}

          {activeView === "comparison" && (
            <div className="animate-fade-in glass-panel p-6">
              <WeatherComparison />
            </div>
          )}

          {activeView === "climate" && (
            <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
              <AQICard lat={location.lat} lon={location.lon} />
            </div>
          )}

        </div>
        <footer className="mt-12 py-6 border-t border-white/5 bg-slate-950/20 backdrop-blur-sm text-[10px] sm:text-xs text-muted-foreground/60 flex flex-col sm:flex-row items-center justify-between gap-4 px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse"></span>
              <span className="font-mono tracking-widest uppercase">Quantum System Online</span>
            </div>
            <span className="hidden sm:inline text-white/10">|</span>
            <span className="font-mono">v2.4.0-PRO</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Latency: <span className="text-emerald-400 font-mono">24ms</span></span>
            <span>Data: <span className="text-blue-400">Open-Meteo High-Res</span></span>
            <span className="hidden sm:inline">© 2026 Climate Mosaic</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
