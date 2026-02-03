import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, MapPin } from "lucide-react";
import { geocodeCity } from "@/lib/weather-api";
import { useToast } from "@/hooks/use-toast";

export interface SelectedCity {
  name: string;
  lat: number;
  lon: number;
  color: string;
}

interface CitySelectorProps {
  selectedCities: SelectedCity[];
  onCitiesChange: (cities: SelectedCity[]) => void;
  maxCities?: number;
}

const CITY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const CitySelector = ({ selectedCities, onCitiesChange, maxCities = 5 }: CitySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleAddCity = async () => {
    if (!searchQuery.trim()) return;
    
    if (selectedCities.length >= maxCities) {
      toast({
        title: "Maximum cities reached",
        description: `You can compare up to ${maxCities} cities at once.`,
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const result = await geocodeCity(searchQuery);
      if (result) {
        const cityExists = selectedCities.some(
          (city) => city.lat === result.latitude && city.lon === result.longitude
        );

        if (cityExists) {
          toast({
            title: "City already added",
            description: `${result.name} is already in the comparison list.`,
            variant: "destructive",
          });
        } else {
          const newCity: SelectedCity = {
            name: `${result.name}, ${result.country}`,
            lat: result.latitude,
            lon: result.longitude,
            color: CITY_COLORS[selectedCities.length % CITY_COLORS.length],
          };
          onCitiesChange([...selectedCities, newCity]);
          setSearchQuery("");
          toast({
            title: "City added",
            description: `${result.name} has been added to the comparison.`,
          });
        }
      } else {
        toast({
          title: "City not found",
          description: "Please try a different city name.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for city. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveCity = (index: number) => {
    const newCities = selectedCities.filter((_, i) => i !== index);
    onCitiesChange(newCities);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Add city to compare..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
          disabled={isSearching}
          id="city-search"
          name="city-search"
        />
        <Button
          onClick={handleAddCity}
          disabled={isSearching || !searchQuery.trim()}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCities.map((city, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-2 py-1.5 px-3"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: city.color }}
              />
              <MapPin className="w-3 h-3" />
              <span className="text-xs">{city.name}</span>
              <button
                onClick={() => handleRemoveCity(index)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
