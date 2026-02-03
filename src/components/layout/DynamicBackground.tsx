import { Cloudy, CloudRain, Sun, CloudLightning, Snowflake, CloudFog, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface DynamicBackgroundProps {
    weatherCode: number;
    isDay?: boolean; // Kept for interface compatibility, but unused for color choice now
}

export const DynamicBackground = ({ weatherCode, isDay = true }: DynamicBackgroundProps) => {
    const [gradient, setGradient] = useState("bg-black");

    // Map Code to "Smoke Black" Styles
    useEffect(() => {
        // Clear / Sunny (Smoke Black with faint warm hint)
        if (weatherCode === 0 || weatherCode === 1) {
            setGradient("bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800 via-slate-900 to-black");
        }
        // Rainy (Deep Slate Smoke)
        else if (weatherCode >= 51 && weatherCode <= 67) {
            setGradient("bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-slate-950 to-black");
        }
        // Stormy (Dark Electric Smoke)
        else if (weatherCode >= 95) {
            setGradient("bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-950 via-gray-900 to-black");
        }
        // Cloudy (Neutral Smoke)
        else {
            setGradient("bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-neutral-950 to-black");
        }
    }, [weatherCode]);

    return (
        <div className={`fixed inset-0 -z-50 w-full h-full transition-all duration-1000 ${gradient}`}>
            {/* Decorative Orbs - Darker & Subtler for Smoke Theme */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-700/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-700/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />

            {/* Noise Texture for 'Film/Cinema' Look */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
        </div>
    );
};
