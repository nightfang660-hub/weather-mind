import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Outlet, Link, useLocation } from "react-router-dom";
import { CloudSun, Wind, Droplets, Snowflake, Zap } from "lucide-react";

const BACKGROUNDS = [
    {
        url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop",
        alt: "Sunny landscape",
    },
    {
        url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2070&auto=format&fit=crop",
        alt: "Rain on glass",
    },
    {
        url: "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=2071&auto=format&fit=crop",
        alt: "Stormy sky",
    },
    {
        url: "https://images.unsplash.com/photo-1477601263568-180e2c6d046e?q=80&w=2070&auto=format&fit=crop",
        alt: "Snowy mountains",
    },
    {
        url: "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?q=80&w=2070&auto=format&fit=crop",
        alt: "Cloudy sunset",
    },
];

export const AuthLayout = () => {
    const [currentBgIndex, setCurrentBgIndex] = useState(0);
    const location = useLocation();

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
        }, 5000); // 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4">
            {/* Background Slider */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="popLayout">
                    <motion.img
                        key={currentBgIndex}
                        src={BACKGROUNDS[currentBgIndex].url}
                        alt={BACKGROUNDS[currentBgIndex].alt}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </AnimatePresence>
                {/* Overlay for better text contrast */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            </div>

            {/* Brand Logo / Header (Absolute Top Left) */}
            <div className="absolute top-8 left-8 z-20 flex items-center gap-3 text-white">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                    <CloudSun className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Weather-Clip</h1>
                    <p className="text-xs text-white/70">Professional Weather Insights</p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden p-8 sm:p-10">
                    <Outlet />
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center text-sm text-white/60">
                    <p>© {new Date().getFullYear()} Weather-Clip. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};
