// src/services/users.js
import { authFetch } from "../lib/authFetch";

const PROFILE_API = "/api/users/profile";

export const UserService = {
    async fetchProfile(sub) {
        if (!sub) return null;
        const res = await authFetch(`${PROFILE_API}?sub=${encodeURIComponent(sub)}`);
        if (!res.ok) throw new Error("Failed to fetch user profile data");
        return await res.json();
    },

    async upsertBio(sub, bio) {
        if (!sub) return null;
        const res = await authFetch(PROFILE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sub, bio }),
        });
        if (!res.ok) throw new Error("Failed to update profile bio");
        return await res.json();
    },

    // Admin only. Each user has { id, username, email, name, groups, role }.
    // (The old /api/users/list route doesn't exist; this is the real one.)
    async fetchAll() {
        const res = await authFetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to load users");
        return await res.json();
    },

    // kept so older imports don't break
    async fetchAllUsers() { return this.fetchAll(); },
    async getAllUsers() { return this.fetchAll(); },

    // Super admin (AL0) only. targetRole: 'User' | 'AL2' | 'AL1' | 'AL0'
    async updateUserRole(userId, targetRole) {
        const res = await authFetch("/api/admin/update-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, targetRole }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to update user role");
        }
        return await res.json();
    },
};