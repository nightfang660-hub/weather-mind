/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Locate, Map, Search, X } from "lucide-react";
import { MapLayerSelector, LayerType, ForecastLayer, SatelliteLayer } from "./MapLayerSelector";
import { MiniMapNavigator } from "./MiniMapNavigator";
import { MapAnnotations } from "./MapAnnotations";
import { searchLocations, GeocodingResult } from "@/lib/weather-api";

const OPENWEATHER_API_KEY = "2647b2146eb6884d1a64a8041ea0da01";

// Fix for default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface WeatherMapWithLayersProps {
  center: LatLngExpression;
  onMapClick: (lat: number, lon: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showMiniMap?: boolean;
}

const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) => {
  useMapEvents({
    click: (e) => {
      let lon = e.latlng.lng;
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      onMapClick(e.latlng.lat, lon);
    },
  });
  return null;
};

// NASA GIBS date helper
const getGIBSDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1); // Use yesterday's data for reliability
  return date.toISOString().split('T')[0];
};

const getForecastLayerUrl = (layer: ForecastLayer): string => {
  // OpenWeatherMap tile layers with API key
  const layerMap: Record<ForecastLayer, string> = {
    temp: 'temp_new',
    wind: 'wind_new',
    humidity: 'humidity',
    cloudcover: 'clouds_new',
    precipitation: 'precipitation_new',
    pressure: 'pressure_new'
  };
  return `https://tile.openweathermap.org/map/${layerMap[layer]}/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`;
};

const getSatelliteLayerUrl = (layer: SatelliteLayer): string => {
  const date = getGIBSDate();
  const baseUrl = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
  
  switch (layer) {
    case "truecolor":
      return `${baseUrl}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
    case "infrared":
      return `${baseUrl}/GOES-East_ABI_Band13_Clean_Infrared/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
    case "watervapor":
      return `${baseUrl}/GOES-East_ABI_Band09_Clean_Longwave_Window/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
  }
};

export const WeatherMapWithLayers = ({ 
  center, 
  onMapClick,
  isFullscreen = false,
  onToggleFullscreen,
  showMiniMap = true
}: WeatherMapWithLayersProps) => {
  const [layerType, setLayerType] = useState<LayerType>("forecast");
  const [forecastLayer, setForecastLayer] = useState<ForecastLayer>("temp");
  const [satelliteLayer, setSatelliteLayer] = useState<SatelliteLayer>("truecolor");
  const [showRadar, setShowRadar] = useState(false);
  const [opacity, setOpacity] = useState(0.65);
  const [radarFrames, setRadarFrames] = useState<any[]>([]);
  const [currentRadarFrame, setCurrentRadarFrame] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center as [number, number]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(isFullscreen ? 7 : 10);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  
  // Map search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null);

  // Get user's geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(userPos);
          setMapCenter(userPos);
        },
        () => {
          // Default to India if permission denied
          const indiaCenter: [number, number] = [20.5937, 78.9629];
          setMapCenter(indiaCenter);
        }
      );
    }
  }, []);

  // Update map center when center prop changes
  useEffect(() => {
    setMapCenter(center as [number, number]);
  }, [center]);

  // Fetch radar frames
  useEffect(() => {
    if (!showRadar) return;
    
    const fetchRadar = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        const allFrames = [...data.radar.past, ...data.radar.nowcast];
        setRadarFrames(allFrames);
        setCurrentRadarFrame(allFrames.length > 0 ? allFrames.length - 1 : 0);
      } catch (error) {
        console.error('Failed to fetch radar:', error);
      }
    };

    fetchRadar();
    const interval = setInterval(fetchRadar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showRadar]);

  const handleLocateMe = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      onMapClick(userLocation[0], userLocation[1]);
    }
  };

  const handleMiniMapNavigate = (lat: number, lon: number) => {
    setMapCenter([lat, lon]);
    onMapClick(lat, lon);
  };

  const handleAddAnnotation = (annotation: any) => {
    setAnnotations(prev => [...prev, { ...annotation, id: Date.now().toString() }]);
  };

  const handleClearAnnotations = () => {
    setAnnotations([]);
  };

  // Map search handlers
  const handleMapSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchLocations(query);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error("Map search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodingResult) => {
    setSelectedLocation(result);
    setMapCenter([result.latitude, result.longitude]);
    onMapClick(result.latitude, result.longitude);
    setSearchQuery(result.admin1 ? `${result.name}, ${result.admin1}` : result.name);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedLocation(null);
  };

  const getLayerLabel = () => {
    if (layerType === "forecast") {
      const labels: Record<ForecastLayer, string> = {
        temp: "Temperature",
        wind: "Wind Speed",
        humidity: "Humidity",
        cloudcover: "Cloud Cover",
        precipitation: "Precipitation",
        pressure: "Pressure"
      };
      return labels[forecastLayer];
    } else {
      const labels: Record<SatelliteLayer, string> = {
        truecolor: "True Color",
        infrared: "Infrared",
        watervapor: "Water Vapor"
      };
      return labels[satelliteLayer];
    }
  };

  const activeLayerUrl = layerType === "forecast" 
    ? getForecastLayerUrl(forecastLayer)
    : getSatelliteLayerUrl(satelliteLayer);

  const radarUrl = showRadar && radarFrames[currentRadarFrame]
    ? `https://tilecache.rainviewer.com${radarFrames[currentRadarFrame].path}/256/{z}/{x}/{y}/2/1_1.png`
    : null;

  return (
    <div className="relative h-full w-full">
      {/* Map Search Bar - Responsive */}
      <div className="absolute top-3 left-3 right-16 sm:right-auto sm:left-4 sm:top-4 z-[1000] sm:w-72 md:w-80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search or enter coordinates..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleMapSearch(e.target.value);
            }}
            className="w-full pl-9 pr-9 py-2.5 sm:py-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden max-h-[50vh]">
            <div className="max-h-48 sm:max-h-64 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.latitude}-${result.longitude}-${index}`}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-b-0"
                >
                  <div className="p-1.5 bg-muted/50 rounded-lg flex-shrink-0">
                    <Map className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-foreground truncate">{result.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {[result.admin1, result.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Selected Location Info Card */}
        {selectedLocation && !showSearchResults && (
          <div className="mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Map className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate">{selectedLocation.name}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {[selectedLocation.admin1, selectedLocation.country].filter(Boolean).join(", ")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°
                </p>
              </div>
              <button
                onClick={clearSearch}
                className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[1000] flex flex-col gap-2">
        {onToggleFullscreen && (
          <Button
            variant="secondary"
            size="icon"
            className="w-9 h-9 sm:w-10 sm:h-10 bg-card/90 backdrop-blur-xl border-border/50 shadow-xl hover:bg-card hover:scale-105 transition-all duration-200"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        )}
        {userLocation && (
          <Button
            variant="secondary"
            size="icon"
            className="w-9 h-9 sm:w-10 sm:h-10 bg-card/90 backdrop-blur-xl border-border/50 shadow-xl hover:bg-card hover:scale-105 transition-all duration-200"
            onClick={handleLocateMe}
            title="Center on my location"
          >
            <Locate className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        )}
      </div>

      {/* Layer Badge - Hidden on small mobile, visible from sm */}
      <div className="hidden sm:block absolute top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-card/90 backdrop-blur-xl border border-border/50 rounded-full shadow-xl">
          <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          <p className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
            {getLayerLabel()}
          </p>
          {showRadar && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-primary/20 text-primary text-[10px] sm:text-xs font-medium rounded-full">
              +Radar
            </span>
          )}
        </div>
      </div>

      {/* Google Maps-style Layer Selector */}
      <MapLayerSelector
        activeLayerType={layerType}
        activeForecastLayer={forecastLayer}
        activeSatelliteLayer={satelliteLayer}
        showRadar={showRadar}
        opacity={opacity}
        onLayerTypeChange={setLayerType}
        onForecastLayerChange={setForecastLayer}
        onSatelliteLayerChange={setSatelliteLayer}
        onRadarToggle={setShowRadar}
        onOpacityChange={setOpacity}
      />

      {showMiniMap && (
        <MiniMapNavigator
          mainMapCenter={mapCenter}
          mainMapZoom={mapZoom}
          onNavigate={handleMiniMapNavigate}
        />
      )}

      <MapAnnotations
        annotations={annotations}
        onAddAnnotation={handleAddAnnotation}
        onClearAnnotations={handleClearAnnotations}
        isActive={showAnnotations}
        onToggle={() => setShowAnnotations(!showAnnotations)}
      />

      <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-border/30">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          scrollWheelZoom={true} 
          className="h-full w-full"
          key={`${mapCenter[0]}-${mapCenter[1]}-${isFullscreen}`}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {layerType === "forecast" && (
            <TileLayer
              url={activeLayerUrl}
              opacity={opacity}
              attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
              key={`forecast-${forecastLayer}`}
              className="animate-fade-in"
            />
          )}
          
          {layerType === "satellite" && (
            <TileLayer
              url={activeLayerUrl}
              opacity={opacity}
              attribution='&copy; <a href="https://earthdata.nasa.gov/">NASA GIBS</a>'
              key={`satellite-${satelliteLayer}`}
              maxZoom={satelliteLayer === "truecolor" ? 9 : 6}
              className="animate-fade-in"
            />
          )}

          {radarUrl && (
            <TileLayer
              url={radarUrl}
              opacity={0.6}
              attribution="RainViewer"
              key={`radar-${currentRadarFrame}`}
            />
          )}

          <Marker position={mapCenter}>
            <Popup>
              <div className="p-1">
                <p className="font-medium">Selected Location</p>
                <p className="text-sm text-muted-foreground">
                  {mapCenter[0].toFixed(4)}°, {mapCenter[1].toFixed(4)}°
                </p>
              </div>
            </Popup>
          </Marker>
          <MapClickHandler onMapClick={onMapClick} />
        </MapContainer>
      </div>
    </div>
  );
};