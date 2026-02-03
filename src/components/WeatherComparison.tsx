import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchWeatherData, type WeatherData, type GeocodingResult } from "@/lib/weather-api";
import { getWeatherIcon } from "@/lib/weather-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, MoreVertical, Save, Trash2, Plus } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface SavedLocation {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

interface WeatherComparisonItem extends SavedLocation {
  weather: WeatherData | null;
  loading: boolean;
  isSaved?: boolean;
}

export const WeatherComparison = () => {
  const [locations, setLocations] = useState<WeatherComparisonItem[]>([]);
  const { toast } = useToast();

  // Load initial locations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("savedLocations");
    if (saved) {
      try {
        const parsed: SavedLocation[] = JSON.parse(saved);
        const initialItems: WeatherComparisonItem[] = parsed.slice(0, 4).map((loc) => ({
          ...loc,
          weather: null,
          loading: true,
          isSaved: true,
        }));
        setLocations(initialItems);

        // Fetch weather for initial items
        initialItems.forEach((item, index) => {
          fetchWeatherForIndex(index, item.lat, item.lon);
        });
      } catch (e) {
        console.error("Failed to parse saved locations", e);
      }
    }
  }, []);

  const fetchWeatherForIndex = (index: number, lat: number, lon: number) => {
    fetchWeatherData(lat, lon)
      .then((weather) => {
        setLocations((prev) =>
          prev.map((l, i) => (i === index ? { ...l, weather, loading: false } : l))
        );
      })
      .catch(() => {
        setLocations((prev) =>
          prev.map((l, i) => (i === index ? { ...l, loading: false } : l))
        );
      });
  };

  const handleLocationAdd = (location: GeocodingResult) => {
    // Check if already exists in the view
    if (locations.some(l => Math.abs(l.lat - location.latitude) < 0.001 && Math.abs(l.lon - location.longitude) < 0.001)) {
      toast({
        title: "Location already added",
        description: `${location.name} is already in the comparison view.`,
      });
      return;
    }

    const newItem: WeatherComparisonItem = {
      id: Date.now().toString(), // Temp ID
      name: location.name,
      country: location.country || "",
      lat: location.latitude,
      lon: location.longitude,
      weather: null,
      loading: true,
      isSaved: false,
    };

    setLocations(prev => [...prev, newItem]);

    // Fetch weather for the new item
    // We use the length because the new item will be at the end
    fetchWeatherForIndex(locations.length, newItem.lat, newItem.lon);
  };

  // Helper to check if a location is actually saved in localStorage
  const checkIsSaved = (lat: number, lon: number) => {
    const saved = localStorage.getItem("savedLocations");
    if (!saved) return false;
    const parsed: SavedLocation[] = JSON.parse(saved);
    return parsed.some(l => Math.abs(l.lat - lat) < 0.001 && Math.abs(l.lon - lon) < 0.001);
  };

  const saveLocation = (index: number) => {
    const item = locations[index];
    if (checkIsSaved(item.lat, item.lon)) {
      toast({ title: "Already saved", description: `${item.name} is already in your saved locations.` });
      return;
    }

    const saved = localStorage.getItem("savedLocations");
    let parsed: SavedLocation[] = saved ? JSON.parse(saved) : [];

    const newSaved: SavedLocation = {
      id: item.id, // Use the ID we created or existing
      name: item.name,
      country: item.country,
      lat: item.lat,
      lon: item.lon
    };

    parsed = [...parsed, newSaved];
    localStorage.setItem("savedLocations", JSON.stringify(parsed));

    setLocations(prev => prev.map((l, i) => i === index ? { ...l, isSaved: true } : l));

    toast({
      title: "Location Saved",
      description: `${item.name} has been added to your saved locations.`,
    });
  };

  const removeLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="animate-fade-in w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Existing Locations */}
        {locations.map((location, index) => {
          const WeatherIcon = location.weather
            ? getWeatherIcon(location.weather.weatherCode)
            : MapPin;

          return (
            <Card key={location.id} className="glass-card p-0 flex flex-col relative overflow-hidden group border-0 ring-1 ring-white/10">
              {/* Actions Menu */}
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border">
                    <DropdownMenuItem onClick={() => saveLocation(index)} disabled={checkIsSaved(location.lat, location.lon)}>
                      <Save className="w-4 h-4 mr-2" />
                      <span>Save Location</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => removeLocation(index)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>Remove</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Card Header & Content */}
              <div className="p-6 flex-1 flex flex-col text-foreground">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5 ring-1 ring-primary/20">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight tracking-tight">{location.name}</h4>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">{location.country}</p>
                  </div>
                </div>

                {location.loading ? (
                  <div className="space-y-6 mt-2">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-full bg-muted/50" />
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-24 bg-muted/50" />
                        <Skeleton className="h-4 w-16 bg-muted/50" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <Skeleton className="h-4 w-full bg-muted/50" />
                      <Skeleton className="h-4 w-full bg-muted/50" />
                    </div>
                  </div>
                ) : location.weather ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                      <WeatherIcon className="w-16 h-16 text-primary drop-shadow-xl filter" />
                      <div>
                        <div className="text-5xl font-bold tracking-tighter text-foreground">
                          {location.weather.temperature.toFixed(0)}°
                        </div>
                        <div className="text-sm font-medium text-muted-foreground mt-1">
                          Feels {location.weather.feelsLike.toFixed(0)}°
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mt-auto bg-muted/50 -mx-6 -mb-6 p-6 border-t border-border/10">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Humidity</span>
                        <span className="font-bold text-foreground">{location.weather.humidity}%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Wind</span>
                        <span className="font-bold text-foreground">{location.weather.windSpeed.toFixed(1)} km/h</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Pressure</span>
                        <span className="font-bold text-foreground">{location.weather.pressure.toFixed(0)} hPa</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">UV Index</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-16 h-1.5 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                            style={{ opacity: 0.8 }}
                          />
                          <span className="font-bold text-foreground">{location.weather.uvIndex.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Failed to load data
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {/* Add Location Card */}
        <Card className="min-h-[340px] flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/20 rounded-2xl bg-muted/5 hover:bg-muted/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group cursor-default relative overflow-visible z-0">
          <div className="w-full max-w-[260px] flex flex-col items-center gap-5 text-center">
            <div className="p-5 rounded-full bg-background shadow-sm ring-1 ring-border group-hover:scale-110 transition-transform duration-300">
              <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-foreground">Add Location</h4>
              <p className="text-sm text-muted-foreground">Compare another city</p>
            </div>
            <div className="w-full mt-4 relative z-50">
              <SearchBox
                onSearch={() => { }}
                onLocationSelect={handleLocationAdd}
                placeholder="Search city..."
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
