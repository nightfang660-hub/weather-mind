import { MapPin, Calendar, Info, TrendingUp, Split, Layers, CloudRain, Settings, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeView: "forecast" | "map" | "climate" | "historical" | "comparison" | "radar";
  onViewChange: (view: "forecast" | "map" | "climate" | "historical" | "comparison" | "radar") => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({ activeView, onViewChange, collapsed = false, onToggleCollapse }: SidebarProps) => {
  const menuItems = [
    { id: "forecast" as const, label: "Forecast", icon: Calendar, description: "Live weather data" },
    { id: "map" as const, label: "Weather Map", icon: Layers, description: "Interactive layers" },
    { id: "radar" as const, label: "Radar", icon: CloudRain, description: "Precipitation radar" },
    { id: "climate" as const, label: "Climate & AQI", icon: Info, description: "Air quality index" },
    { id: "historical" as const, label: "Historical", icon: TrendingUp, description: "Past weather data" },
    { id: "comparison" as const, label: "Compare", icon: Split, description: "Multi-location" },

  ];

  return (
    <aside
      className={cn(
        "relative h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Collapse Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3.5 top-8 z-50 bg-card border border-border rounded-full p-2 hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-200 shadow-lg group"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-foreground group-hover:text-primary-foreground transition-colors" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-foreground group-hover:text-primary-foreground transition-colors" />
          )}
        </button>
      )}

      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          collapsed ? "justify-center" : ""
        )}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg" />
            <div className="relative p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div className={cn(
            "overflow-hidden transition-all duration-300",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            <h1 className="text-lg font-bold text-foreground whitespace-nowrap">WeatherPro</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left group relative",
                collapsed ? "justify-center px-3" : "",
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
              title={collapsed ? item.label : ""}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}

              <Icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                isActive ? "text-primary" : "group-hover:scale-110"
              )} />

              <div className={cn(
                "flex-1 overflow-hidden transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                <span className={cn(
                  "block font-medium whitespace-nowrap",
                  isActive ? "text-primary" : ""
                )}>
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.description}
                </span>
              </div>

              {/* Hover glow for active items */}
              {isActive && (
                <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-4 border-t border-sidebar-border transition-all duration-300",
        collapsed ? "p-2" : ""
      )}>
        <div className={cn(
          "px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent rounded-xl",
          collapsed ? "px-2 py-2" : ""
        )}>
          <p className={cn(
            "text-xs text-muted-foreground transition-opacity duration-300",
            collapsed ? "hidden" : "block"
          )}>
            Powered by Open-Meteo API
          </p>
        </div>
      </div>
    </aside>
  );
};