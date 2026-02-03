
// Custom API Client to replace Supabase
const API_URL = "";

export const api = {
    async request(endpoint: string, options: RequestInit = {}) {
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string> || {}),
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        let data;
        try {
            data = await response.json();
        } catch (error) {
            // If JSON parse fails (e.g. rate limit text or 500 html), read as text
            const text = await response.text().catch(() => "Unknown error");
            throw new Error(text || `Request failed with status ${response.status}`);
        }

        if (!response.ok) {
            throw new Error(data.error || "API Request Failed");
        }

        return data;
    },

    auth: {
        async signUp(payload: { email: string; password: string; full_name?: string }) {
            return api.request("/auth/signup", {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        async signIn(payload: { email: string; password: string }) {
            const data = await api.request("/auth/login", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            localStorage.setItem("auth_token", data.token);
            return data;
        },
        async signOut() {
            localStorage.removeItem("auth_token");
        },
        async getUser() {
            // Optimization: Don't call backend if we definitely don't have a token
            if (!localStorage.getItem("auth_token")) {
                return { data: { user: null } };
            }
            try {
                const user = await api.request("/user/profile");
                return { data: { user } }; // Mimic Supabase structure slightly for easier migration
            } catch (e) {
                return { data: { user: null } };
            }
        }
    }
};
