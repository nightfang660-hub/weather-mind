
import { useState, useEffect } from "react";
import {
    User,
    MapPin,
    Calendar,
    Settings,
    LogOut,
    Mail,
    Shield,
    CreditCard
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { SettingsPanel } from "@/components/SettingsPanel";

export const UserProfile = () => {
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const navigate = useNavigate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { UserService } = await import("@/services/userService");
                const profile = await UserService.getProfile();

                if (profile) {
                    // Initial user state with stored location or default
                    const userData = {
                        name: profile.username || profile.full_name || "User", // Prioritize username
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        email: (profile as any).email,
                        avatar: profile.avatar_url,
                        role: profile.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : "Member",
                        location: profile.location || "Locating...",
                        joined: new Date(profile.updated_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    };
                    setUser(userData);

                    // --- ROBUST LOCATION FETCHING ---
                    // --- ROBUST LOCATION FETCHING ---
                    const fetchLocation = async () => {
                        const updateLoc = (loc: string) => {
                            setUser((prev: any) => ({ ...prev, location: loc }));
                        };

                        try {
                            const { getUserLocation } = await import("@/lib/weather-api");
                            const coords = await getUserLocation();

                            // OpenStreetMap Reverse Geocoding
                            try {
                                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}&zoom=10`);
                                const data = await response.json();
                                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
                                const country = data.address?.country;

                                if (city && country) {
                                    updateLoc(`${city}, ${country}`);
                                } else {
                                    updateLoc("Location Found");
                                }
                            } catch (geoError) {
                                console.error("Reverse geocoding failed:", geoError);
                                // If reverse geo fails, try IP info just for the name, or show coords
                                // Fallback to IP API for name if reverse geo failed but we have coords
                                const response = await fetch('https://ipapi.co/json/');
                                const data = await response.json();
                                if (data.city && data.country_name) {
                                    updateLoc(`${data.city}, ${data.country_name}`);
                                } else {
                                    updateLoc(`${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`);
                                }
                            }
                        } catch (error) {
                            console.error("Location detection failed:", error);
                            updateLoc(profile.location || "Earth");
                        }
                    };

                    fetchLocation();
                    // -------------------------------
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleLogout = async () => {
        const { UserService } = await import("@/services/userService");
        await UserService.signOut();
        navigate("/login");
    };

    if (loading) {
        return <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />;
    }

    if (!user) {
        return (
            <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/login")}
                className="gap-2 rounded-full px-4 font-medium hover:bg-white/20 transition-all border border-white/10 shadow-sm"
            >
                <User className="w-4 h-4" />
                <span>Sign In</span>
            </Button>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10 border-2 border-primary/20 hover:border-primary transition-colors">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setActiveTab("settings"); setShowProfileDialog(true); }}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:text-red-600 focus:text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Detailed Profile Dialog */}
            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-card">
                    <DialogHeader className="sr-only">
                        <DialogTitle>User Profile</DialogTitle>
                        <DialogDescription>Detailed view of user profile and settings</DialogDescription>
                    </DialogHeader>
                    <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
                    </div>

                    <div className="px-6 pb-6 relative">
                        <Avatar className="h-24 w-24 border-4 border-card absolute -top-12 shadow-xl">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="mt-14 mb-6 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    {user.name}
                                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                        {user.role}
                                    </Badge>
                                </h2>
                                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">Edit Profile</Button>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-xs uppercase font-semibold">Location</span>
                                        </div>
                                        <p className="font-medium flex items-center gap-2">
                                            {user.location === "Locating..." && <span className="animate-pulse">Finding you...</span>}
                                            {user.location !== "Locating..." && user.location}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-xs uppercase font-semibold">Joined</span>
                                        </div>
                                        <p className="font-medium">{user.joined}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50 col-span-2">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-xs uppercase font-semibold">Account Status</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="font-medium">Active Member</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity">
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No recent activity to show.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="settings" className="max-h-[300px] overflow-y-auto pr-2">
                                <SettingsPanel embedded />
                            </TabsContent>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
