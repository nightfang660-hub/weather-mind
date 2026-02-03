import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X, History, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchLocations, GeocodingResult, getUserLocation } from "@/lib/weather-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface SearchBoxProps {
  onSearch: (city: string) => void;
  onLocationSelect?: (location: GeocodingResult) => void;
  placeholder?: string;
}

// Parse coordinate string (supports various formats)
const parseCoordinates = (input: string): { lat: number; lon: number } | null => {
  const cleaned = input.trim().replace(/\s+/g, ' ');

  // Format: "lat, lon" or "lat lon"
  const simpleMatch = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (simpleMatch) {
    const lat = parseFloat(simpleMatch[1]);
    const lon = parseFloat(simpleMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  // Format with degree symbols
  const degreeMatch = cleaned.match(/(-?\d+\.?\d*)°?\s*([NSns])?\s*[,\s]+\s*(-?\d+\.?\d*)°?\s*([EWew])?/i);
  if (degreeMatch) {
    let lat = parseFloat(degreeMatch[1]);
    let lon = parseFloat(degreeMatch[3]);

    // Apply direction
    if (degreeMatch[2]?.toLowerCase() === 's') lat = -Math.abs(lat);
    if (degreeMatch[4]?.toLowerCase() === 'w') lon = -Math.abs(lon);

    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  return null;
};

export const SearchBox = ({ onSearch, onLocationSelect, placeholder = "Search Google Maps..." }: SearchBoxProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [coordMatch, setCoordMatch] = useState<{ lat: number; lon: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, []);

  const addToRecent = (location: GeocodingResult) => {
    const newRecent = [location, ...recentSearches.filter(
      item => !(item.latitude === location.latitude && item.longitude === location.longitude)
    )].slice(0, 5); // Keep last 5

    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  const removeFromRecent = (e: React.MouseEvent, location: GeocodingResult) => {
    e.stopPropagation();
    const newRecent = recentSearches.filter(
      item => !(item.latitude === location.latitude && item.longitude === location.longitude)
    );
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    inputRef.current?.focus();
  };

  // Debounced search for suggestions
  useEffect(() => {
    const coords = parseCoordinates(query);
    setCoordMatch(coords);

    if (coords) {
      setSuggestions([]);
      setShowSuggestions(true);
      return;
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      if (query.trim().length === 0) setShowSuggestions(true); // Show recent/current location for empty query
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchLocations(query);
        setSuggestions(results);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (location: GeocodingResult) => {
    const displayName = location.admin1
      ? `${location.name}, ${location.admin1}`
      : location.name;

    setQuery(displayName);
    addToRecent(location);
    setShowSuggestions(false);
    setSuggestions([]);

    if (onLocationSelect) {
      onLocationSelect(location);
    } else {
      onSearch(location.name);
    }
  };

  const handleCoordinateSelect = (coords: { lat: number; lon: number }) => {
    const coordLocation: GeocodingResult = {
      name: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
      latitude: coords.lat,
      longitude: coords.lon,
      country: "Coordinates",
      admin1: ""
    };
    handleSelect(coordLocation);
  };

  const handleCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const loc = await getUserLocation();

      // Reverse geocode to get the actual name
      let name = "Current Location";
      let country = "";
      let admin1 = "";

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lon}&zoom=10`, {
          headers: {
            'User-Agent': 'WeatherDashboard/1.0'
          }
        });
        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};
          name = address.city || address.town || address.village || address.suburb || address.county || "Current Location";
          country = address.country || "";
          admin1 = address.state || "";
        }
      } catch (geoError) {
        console.warn("Reverse geocoding failed in SearchBox", geoError);
      }

      const currentLocation: GeocodingResult = {
        name: name,
        latitude: loc.lat,
        longitude: loc.lon,
        country: country,
        admin1: admin1
      };

      if (onLocationSelect) {
        onLocationSelect(currentLocation);
      } else {
        onSearch(currentLocation.name);
      }
      setShowSuggestions(false);
    } catch (error) {
      toast({
        title: "Location detection failed",
        description: "Could not retrieve your current location. Please check browser permissions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (coordMatch) {
      handleCoordinateSelect(coordMatch);
      return;
    }
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelect(suggestions[selectedIndex]);
    } else if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
    // After clearing, we want to show suggestions again (which will default to Recent History since query is empty)
    // The useEffect for query change will handle this, but might be debounced/delayed slightly, so force it.
    setShowSuggestions(true);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md z-50">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-card shadow-lg rounded-[2rem] transition-all duration-200 border border-border/10 focus-within:shadow-xl focus-within:bg-card/100 hover:shadow-md">
          <div className="pl-4 h-full flex items-center justify-center cursor-default">
            <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>

          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent h-11 md:h-12 text-base px-3 placeholder:text-muted-foreground/70"
            autoComplete="off"
          />

          <div className="flex items-center pr-3 gap-1">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="h-8 w-8 hover:bg-muted/50 rounded-full"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            ) : null}

            {/* Divider */}
            <div className="w-px h-6 bg-border/50 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCurrentLocation}
              className="h-9 w-9 text-primary hover:bg-primary/10 hover:text-primary rounded-full"
              title="Use current location"
            >
              <LocateFixed className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </form>

      {/* Dropdown Results */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150 origin-top z-[100] max-h-[300px] overflow-y-auto custom-scrollbar">

          {/* Coordinate Match */}
          {coordMatch && (
            <div className="p-2">
              <button
                type="button"
                onClick={() => handleCoordinateSelect(coordMatch)}
                className="w-full flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <LocateFixed className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Go to coordinates</p>
                  <p className="text-sm text-muted-foreground">{coordMatch.lat.toFixed(4)}, {coordMatch.lon.toFixed(4)}</p>
                </div>
              </button>
            </div>
          )}

          {/* Current Location Option (only if query is empty) */}
          {!query && !coordMatch && (
            <div className="p-2 border-b border-border/30">
              <button
                type="button"
                onClick={handleCurrentLocation}
                className="w-full flex items-center gap-4 p-3 hover:bg-primary/5 rounded-lg text-left transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <LocateFixed className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary group-hover:text-primary">Your location</p>
                </div>
              </button>
            </div>
          )}

          {/* Suggestion List */}
          {suggestions.length > 0 && (
            <div className="py-2">
              {suggestions.map((location, index) => (
                <button
                  key={`${location.latitude}-${location.longitude}`}
                  type="button"
                  onClick={() => handleSelect(location)}
                  className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors ${index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{location.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[location.admin1, location.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches covering empty query case */}
          {!query && recentSearches.length > 0 && !coordMatch && (
            <div className="py-2">
              <div className="px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent
              </div>
              {recentSearches.map((location, index) => (
                <div
                  key={`recent-${location.latitude}-${location.longitude}`}
                  className="group relative flex items-center hover:bg-muted/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(location)}
                    className="flex-1 flex items-center gap-4 px-5 py-3 text-left min-w-0"
                  >
                    <History className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{location.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[location.admin1, location.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => removeFromRecent(e, location)}
                    className="mr-3 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !isLoading && suggestions.length === 0 && !coordMatch && (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};