export interface WeatherData {
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

export interface HourlyForecastData {
  time: string;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
}

export interface ForecastData {
  date: string;
  temperature: number;
  rainfall: number;
  // ... other properties ...
}

export interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // State/Region
}

// --- CACHING UTILITIES ---
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const getCachedOrFetch = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> => {
  const cachedStr = localStorage.getItem(key);
  if (cachedStr) {
    try {
      const cached: CacheItem<T> = JSON.parse(cachedStr);
      const now = Date.now();
      if (now - cached.timestamp < cached.ttl * 1000) {
        // Cache hit
        // console.debug(`[Cache Hit] ${key}`);
        return cached.data;
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  // Cache miss
  // console.debug(`[Cache Miss]Fetch ${key}`);
  try {
    const data = await fetchFn();
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      // Storage full? Clear old items? For now just ignore
    }
    return data;
  } catch (error) {
    // If rate limited (429), try to return stale cache if available
    if (cachedStr) {
      console.warn(`[API Error] ${error}. Using stale cache for ${key}`);
      return JSON.parse(cachedStr).data;
    }
    throw error;
  }
};

/**
 * Fetch current weather data from Open-Meteo API
 */
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  return getCachedOrFetch(`weather_${lat.toFixed(4)}_${lon.toFixed(4)}`, async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,pressure_msl,cloud_cover,wind_speed_10m,uv_index,visibility,weather_code&daily=sunrise,sunset&timezone=auto`;

    const response = await fetch(url);
    if (response.status === 429) throw new Error("Rate Limit Exceeded");
    if (!response.ok) throw new Error("Failed to fetch weather data");

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      pressure: current.pressure_msl,
      rainfall: current.precipitation,
      cloudCover: current.cloud_cover,
      feelsLike: current.apparent_temperature,
      uvIndex: current.uv_index,
      visibility: current.visibility / 1000, // Convert to km
      sunrise: daily.sunrise[0],
      sunset: daily.sunset[0],
      weatherCode: current.weather_code,
    };
  }, 600); // 10 minutes cache
};

/**
 * Fetch 7-day forecast from Open-Meteo API
 */
export const fetchForecastData = async (lat: number, lon: number): Promise<ForecastData[]> => {
  return getCachedOrFetch(`forecast_${lat.toFixed(4)}_${lon.toFixed(4)}`, async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=7`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch forecast data");

    const data = await response.json();
    const daily = data.daily;

    return daily.time.map((date: string, index: number) => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        date: dayName,
        temperature: daily.temperature_2m_max[index],
        rainfall: daily.precipitation_sum[index],
      };
    });
  }, 1800); // 30 mins
};

/**
 * Geocode city name to coordinates using Open-Meteo Geocoding API
 */
export const geocodeCity = async (cityName: string): Promise<GeocodingResult | null> => {
  const cleanName = cityName.trim().toLowerCase();
  return getCachedOrFetch(`geo_${cleanName}`, async () => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to geocode city");

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      country: result.country,
    };
  }, 86400); // 24 Hours
};

/**
 * Search locations with autocomplete suggestions
 */
export const searchLocations = async (query: string): Promise<GeocodingResult[]> => {
  if (!query || query.length < 2) return [];
  const cleanQuery = query.trim().toLowerCase();

  return getCachedOrFetch(`search_${cleanQuery}`, async () => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.results.map((result: any) => ({
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      country: result.country,
      admin1: result.admin1, // State/Region
    }));
  }, 3600); // 1 Hour
};

/**
 * Fetch 24-hour hourly forecast from Open-Meteo API
 * Returns data starting from current hour
 */
export const fetchHourlyForecast = async (lat: number, lon: number): Promise<HourlyForecastData[]> => {
  return getCachedOrFetch(`hourly_${lat.toFixed(4)}_${lon.toFixed(4)}`, async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=auto&forecast_days=2`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch hourly forecast data");

    const data = await response.json();
    const hourly = data.hourly;

    // Find current hour index
    const now = new Date();
    const currentHour = now.getHours();

    // API returns data starting from midnight, find the index for current hour
    let startIndex = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      const hourTime = new Date(hourly.time[i]);
      if (hourTime.getDate() === now.getDate() && hourTime.getHours() >= currentHour) {
        startIndex = i;
        break;
      }
      // If we passed today, use tomorrow's first hour
      if (hourTime.getDate() > now.getDate()) {
        startIndex = i;
        break;
      }
    }

    // Get 24 hours starting from current hour
    const result: HourlyForecastData[] = [];
    for (let i = 0; i < 24 && startIndex + i < hourly.time.length; i++) {
      const idx = startIndex + i;
      const time = new Date(hourly.time[idx]);
      const isNow = i === 0;

      result.push({
        time: isNow ? 'Now' : time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        temperature: hourly.temperature_2m[idx],
        precipitation: hourly.precipitation[idx],
        windSpeed: hourly.wind_speed_10m[idx],
        weatherCode: hourly.weather_code[idx],
      });
    }

    return result;
  }, 1800); // 30 Mins
};

export interface HistoricalWeatherData {
  date: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  // ... other properties if needed
}

export interface WeatherAlert {
  id: string;
  severity: 'info' | 'warning' | 'severe';
  title: string;
  description: string;
  metric: string;
  value: number;
}

/**
 * Fetch historical weather data from Open-Meteo API
 */
export const fetchHistoricalWeather = async (
  lat: number,
  lon: number,
  startDate?: Date,
  endDate?: Date,
  metrics?: string[]
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const hourlyParams = metrics && metrics.length > 0
    ? metrics.join(",")
    : "temperature_2m,relative_humidity_2m,precipitation";

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${formatDate(start)}&end_date=${formatDate(end)}&hourly=${hourlyParams}&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch historical weather data");
  }

  const data = await response.json();
  return data;
};

/**
 * Fetch air quality historical data from Open-Meteo API
 */
export const fetchAirQualityHistory = async (
  lat: number,
  lon: number,
  startDate: Date,
  endDate: Date,
  metrics: string[]
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const hourlyParams = metrics.join(",");
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&hourly=${hourlyParams}&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch air quality data");
  }

  const data = await response.json();
  return data;
};

/**
 * Analyze weather data for alerts
 */
export const analyzeWeatherAlerts = (weather: WeatherData): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];

  // High temperature alert
  if (weather.temperature > 35) {
    alerts.push({
      id: 'high-temp',
      severity: weather.temperature > 40 ? 'severe' : 'warning',
      title: 'High Temperature Alert',
      description: `Extreme heat detected. Temperature is ${weather.temperature.toFixed(1)}°C`,
      metric: 'Temperature',
      value: weather.temperature,
    });
  }

  // Low temperature alert
  if (weather.temperature < 0) {
    alerts.push({
      id: 'low-temp',
      severity: weather.temperature < -10 ? 'severe' : 'warning',
      title: 'Freezing Temperature Alert',
      description: `Freezing conditions detected. Temperature is ${weather.temperature.toFixed(1)}°C`,
      metric: 'Temperature',
      value: weather.temperature,
    });
  }

  // High wind speed alert
  if (weather.windSpeed > 50) {
    alerts.push({
      id: 'high-wind',
      severity: weather.windSpeed > 80 ? 'severe' : 'warning',
      title: 'High Wind Alert',
      description: `Strong winds detected. Wind speed is ${weather.windSpeed.toFixed(1)} km/h`,
      metric: 'Wind Speed',
      value: weather.windSpeed,
    });
  }

  // Heavy rainfall alert
  if (weather.rainfall > 10) {
    alerts.push({
      id: 'heavy-rain',
      severity: weather.rainfall > 50 ? 'severe' : 'warning',
      title: 'Heavy Rainfall Alert',
      description: `Heavy precipitation detected. Rainfall is ${weather.rainfall.toFixed(1)} mm`,
      metric: 'Rainfall',
      value: weather.rainfall,
    });
  }

  // High UV index alert
  if (weather.uvIndex > 8) {
    alerts.push({
      id: 'high-uv',
      severity: weather.uvIndex > 11 ? 'severe' : 'warning',
      title: 'High UV Index Alert',
      description: `Extreme UV levels detected. UV index is ${weather.uvIndex.toFixed(1)}`,
      metric: 'UV Index',
      value: weather.uvIndex,
    });
  }

  // Low visibility alert
  if (weather.visibility < 1) {
    alerts.push({
      id: 'low-visibility',
      severity: weather.visibility < 0.5 ? 'severe' : 'warning',
      title: 'Low Visibility Alert',
      description: `Poor visibility conditions. Visibility is ${weather.visibility.toFixed(1)} km`,
      metric: 'Visibility',
      value: weather.visibility,
    });
  }

  return alerts;
};

/**
 * Get user's current location using browser geolocation API
 */
export const getUserLocation = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve) => {
    // Options for high accuracy and timeout to prevent hanging
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    const fallbackToProxy = async () => {
      console.info("Info: Browser geolocation unavailable/denied, utilizing internal proxy for IP location.");
      try {
        // Use our own backend proxy to avoid CORS and Rate Limits
        const response = await fetch('/api/location');
        if (response.ok) {
          const data = await response.json();
          if (data.lat && data.lon) {
            resolve({ lat: data.lat, lon: data.lon });
            return;
          }
        }
      } catch (e) {
        console.warn("Proxy location failed, trying secondary fallback.");
      }

      // Final fallback: geojs.io (CORS friendly)
      try {
        const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (response.ok) {
          const data = await response.json();
          resolve({ lat: parseFloat(data.latitude), lon: parseFloat(data.longitude) });
          return;
        }
      } catch (e) { /* ignore */ }

      // Ultimate fallback
      console.warn("All location services failed. Using default.");
      resolve({ lat: 17.3850, lon: 78.4867 });
    };

    // 1. Try GPS / Browser Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          // Permission denied or unavailable
          fallbackToProxy();
        },
        options
      );
    } else {
      fallbackToProxy();
    }
  });
};

export interface QuantumAnalysisResult {
  storm_probability: number;
  rain_confidence: number;
  atmospheric_chaos: number;
  forecast_reliability: number;
  quantum_summary: string;
  top_states?: Array<{
    state: string;
    probability: number;
    meaning: string;
    // ...
  }>;
  neural_correction_factor?: number;
  volatility?: number;
  cyclone_index?: number;
  flood_risk?: number;
  final_risk_score?: number;
  chaos_trend?: number;
  cached?: boolean;

  // Temporal Metrics
  chaos_velocity?: number;
  chaos_acceleration?: number;
  cyclone_momentum?: number;
  state_drift?: number;
  state_lock_in?: boolean;
}

export interface QuantumLog {
  id?: string;
  city: string;
  timestamp: string;
  storm_probability: number;
  rain_confidence: number;
  atmospheric_chaos: number;
  forecast_reliability: number;
  quantum_summary: string;
  top_states?: Array<{
    state: string;
    probability: number;
    meaning: string;
  }>;
  volatility?: number;
  cyclone_index?: number;
  flood_risk?: number;
  final_risk_score?: number;
}

/**
 * Perform Quantum Weather Analysis via Backend Proxy
 */
export const fetchQuantumAnalysis = async (
  weather: WeatherData,
  location?: { name: string, lat: number, lon: number }
): Promise<QuantumAnalysisResult> => { // Returns existing result type
  // Construct payload
  const weatherPayload = {
    temperature: weather.temperature,
    humidity: weather.humidity,
    pressure: weather.pressure,
    wind: weather.windSpeed,
    clouds: weather.cloudCover,
    rain: weather.rainfall
  };

  const payload = {
    weather: weatherPayload,
    location: location
  };

  try {
    // We hit our own backend which proxies to the python microservice
    const response = await fetch('/weather/quantum-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to parse error body to see if there is fallback data
      try {
        const errorData = await response.json();
        const anyError = errorData as any;
        if (anyError.fallback_data) {
          console.warn("Quantum Service Offline: Using Fallback Data");
          return anyError.fallback_data;
        }
      } catch (e) {
        // If parsing fails, just throw the original error
      }
      throw new Error(`Quantum Analysis Failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // If request completely fails (e.g. backend down), return default fallback manually
    console.error("Quantum Fetch Error:", error);
    return {
      storm_probability: 0,
      rain_confidence: 0,
      atmospheric_chaos: 0,
      forecast_reliability: 0,
      quantum_summary: "Quantum Link online . Classic models only.",
      top_states: []
    };
  }
};

/**
 * Fetch Historical Quantum Data
 * (Includes Simulation Fallback for Demo/Frontend-only mode)
 */
export const fetchQuantumHistory = async (city: string): Promise<QuantumLog[]> => {
  try {
    const response = await fetch(`/weather/quantum-history?city=${encodeURIComponent(city)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) return data;
    }
  } catch (e) {
    // Ignore network errors and fall back to simulation
    console.warn("History fetch failed, using simulation");
  }

  // FALLBACK: Generate Realistic Simulation Data
  // This ensures the "Evolution" tab is always populated for the demo
  const mockHistory: QuantumLog[] = [];
  const now = new Date();

  // Generate trajectory: Storm Probability rising from 20% to current
  let baseStormProb = 0.2 + (Math.random() * 0.3); // Random start 20-50%
  const trend = Math.random() > 0.5 ? 0.05 : -0.02; // Rising or falling trend

  for (let i = 0; i < 12; i++) {
    const time = new Date(now.getTime() - (11 - i) * 30 * 60000); // Every 30 mins for last 6 hours

    // Evolve metrics realistically with some noise
    const noise = (Math.random() * 0.1) - 0.05;
    baseStormProb = Math.min(0.95, Math.max(0.05, baseStormProb + trend + noise));

    const chaos = Math.min(0.9, Math.max(0.1, baseStormProb * 0.8 + (Math.random() * 0.2)));
    const reliability = Math.max(0.1, 1 - (chaos * 0.6));

    mockHistory.push({
      id: `sim-${i}`,
      city: city,
      timestamp: time.toISOString(),
      storm_probability: baseStormProb,
      rain_confidence: Math.min(0.98, baseStormProb + 0.15),
      atmospheric_chaos: chaos,
      forecast_reliability: reliability,
      quantum_summary: baseStormProb > 0.6 ? "Coherent Storm State Forming" : "Quantum State Superposition Stable",
      top_states: [
        { state: "|100⟩ Rain", probability: Math.round(baseStormProb * 100), meaning: "Precipitation Likely" },
        { state: "|010⟩ Cloudy", probability: Math.round((1 - baseStormProb) * 60), meaning: "High Cloud Cover" },
        { state: "|001⟩ Clear", probability: Math.round((1 - baseStormProb) * 40), meaning: "Clear Skies" }
      ],
      cyclone_index: baseStormProb > 0.7 ? baseStormProb * 0.9 : 0,
      flood_risk: baseStormProb > 0.8 ? baseStormProb * 0.8 : 0
    });
  }

  // Return newest first (descending) as expected by API
  return mockHistory.reverse();
};

/**
 * Batch Quantum Analysis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchQuantumBatch = async (requests: any[]): Promise<any[]> => {
  try {
    const response = await fetch('/weather/quantum-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    console.error("Batch Error", e);
    return [];
  }
};
