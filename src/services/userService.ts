
import { api } from '@/lib/api';

export type UserRole = 'admin' | 'user';

export type UserProfile = {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    website?: string | null;
    location?: string | null;
    role: UserRole;
    updated_at: string | null;
};

export const UserService = {
    /**
     * Fetches the profile of the currently authenticated user from our custom backend.
     */
    async getProfile() {
        try {
            const { data: { user } } = await api.auth.getUser();
            return user as UserProfile | null;
        } catch (error) {
            console.error('Error in getProfile:', error);
            // Don't throw logic here, just return null if not auth
            return null;
        }
    },

    /**
     * Updates the user's profile.
     */
    async updateProfile(updates: Partial<UserProfile>) {
        try {
            await api.request("/user/profile", {
                method: "PUT",
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },

    /**
     * Securely signs out the user.
     */
    async signOut() {
        await api.auth.signOut();
    }
};
