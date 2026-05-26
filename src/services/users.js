// src/services/user.jsx
const API_BASE = "/api/users/profile";

export const UserService = {
    // Used by AuthContext.jsx to load a single profile bio
    async fetchProfile(sub) {
        if (!sub) return null;
        const res = await fetch(`${API_BASE}?sub=${sub}`);
        
        if (!res.ok) {
            throw new Error("Failed to fetch user profile data");
        }
        return await res.json();
    },

    // Used by AuthContext.jsx to save a user's bio
    async upsertBio(sub, bio) {
        if (!sub) return null;
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ sub, bio }),
        });

        if (!res.ok) {
            throw new Error("Failed to update profile bio string");
        }
        return await res.json();
    },

    // Used by Admin.jsx to list all platform profiles
    async fetchAll() {
        const res = await fetch("/api/users/list");
        if (!res.ok) {
            throw new Error("Failed to retrieve system users directory");
        }
        return await res.json();
    }
};