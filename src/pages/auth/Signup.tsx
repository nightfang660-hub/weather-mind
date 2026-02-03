
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const Signup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        console.log("Starting signup process...");

        const formData = new FormData(e.target as HTMLFormElement);
        const email = (formData.get("email") as string).trim();
        const password = formData.get("password") as string;
        const fullName = formData.get("name") as string;

        try {
            const response = await api.auth.signUp({
                email,
                password,
                full_name: fullName,
            });

            // Auto-login logic
            if (response.token) {
                localStorage.setItem("auth_token", response.token);
                toast({
                    title: "Welcome to Weather-Clip!",
                    description: "Your account has been created and logged in.",
                });
                navigate("/");
            } else {
                // Fallback if no token (shouldn't happen with new backend)
                toast({
                    title: "Account created!",
                    description: "Please log in with your credentials.",
                });
                navigate("/login");
            }
        } catch (error: unknown) {
            console.error("Signup error:", error);
            const message = error instanceof Error ? error.message : "An unknown error occurred";
            toast({
                variant: "destructive",
                title: "Error creating account",
                description: message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Create Account</h2>
                <p className="text-white/70">Join Weather-Clip for free today</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/90">Full Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-primary/50 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/90">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-primary/50 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/90">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Create a password"
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-primary/50 transition-all"
                            required
                        />
                    </div>
                    <p className="text-xs text-white/50">Must be at least 8 characters long</p>
                </div>

                <div className="pt-2">
                    <Button
                        type="submit"
                        className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Create Account <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </form>

            <p className="text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary-foreground hover:text-white transition-colors">
                    Log in
                </Link>
            </p>
        </div>
    );
};
