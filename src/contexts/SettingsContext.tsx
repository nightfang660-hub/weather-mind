import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SettingsConfig {
    tempUnit: "celsius" | "fahrenheit";
    windUnit: "kmh" | "mph";
    pressureUnit: "hpa" | "mmhg";
    theme: "light" | "dark" | "auto";
    enableAnimations: boolean;
    enableMapTransitions: boolean;
}

const defaultSettings: SettingsConfig = {
    tempUnit: "celsius",
    windUnit: "kmh",
    pressureUnit: "hpa",
    theme: "light",
    enableAnimations: true,
    enableMapTransitions: true,
};

interface SettingsContextType {
    settings: SettingsConfig;
    updateSetting: <K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]) => void;
    resetSettings: () => void;
    // Helpers for display
    formatTemp: (celsius: number) => string;
    formatSpeed: (kph: number) => string;
    formatPressure: (hpa: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<SettingsConfig>(() => {
        const saved = localStorage.getItem("weatherSettings");
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem("weatherSettings", JSON.stringify(settings));

        // Apply theme
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (settings.theme === "auto") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(settings.theme);
        }

        // Apply animation preferences (globally via CSS variable or class)
        if (settings.enableAnimations) {
            document.body.style.removeProperty("--disable-animations");
        } else {
            document.body.style.setProperty("--disable-animations", "1");
        }

    }, [settings]);

    const updateSetting = <K extends keyof SettingsConfig>(
        key: K,
        value: SettingsConfig[K]
    ) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    // Helper functions
    const formatTemp = (celsius: number) => {
        if (settings.tempUnit === "fahrenheit") {
            return `${Math.round((celsius * 9) / 5 + 32)}°F`;
        }
        return `${Math.round(celsius)}°C`;
    };

    const formatSpeed = (kph: number) => {
        if (settings.windUnit === "mph") {
            return `${(kph * 0.621371).toFixed(1)} mph`;
        }
        return `${kph.toFixed(1)} km/h`;
    };

    const formatPressure = (hpa: number) => {
        if (settings.pressureUnit === "mmhg") {
            return `${Math.round(hpa * 0.750062)} mmHg`;
        }
        return `${Math.round(hpa)} hPa`;
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            resetSettings,
            formatTemp,
            formatSpeed,
            formatPressure
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
