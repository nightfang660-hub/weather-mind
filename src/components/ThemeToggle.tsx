import { Moon, Sun } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
    const { settings, updateSetting } = useSettings();

    const toggleTheme = () => {
        updateSetting("theme", settings.theme === "dark" ? "light" : "dark");
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9 transition-all duration-300 hover:bg-muted"
            title={settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                <Sun
                    className={`absolute w-5 h-5 transition-all duration-300 text-orange-400 ${settings.theme === "dark"
                            ? "opacity-0 rotate-90 scale-50"
                            : "opacity-100 rotate-0 scale-100"
                        }`}
                />
                <Moon
                    className={`absolute w-5 h-5 transition-all duration-300 text-indigo-400 ${settings.theme === "dark"
                            ? "opacity-100 rotate-0 scale-100"
                            : "opacity-0 -rotate-90 scale-50"
                        }`}
                />
            </div>
        </Button>
    );
};
