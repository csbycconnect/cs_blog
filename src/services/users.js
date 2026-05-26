// src/services/user.jsx
const API_BASE = "/api/users/profile"; // ✅ Exact match for your folder route layout

export const UserService = {
    async fetchProfile(sub) {
        if (!sub) return null;
        const res = await fetch(`${API_BASE}?sub=${sub}`);
        if (!res.ok) throw new Error("Failed to fetch user profile data");
        return await res.json();
    },

    async upsertBio(sub, bio) {
        if (!sub) return null;
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sub, bio }),
        });
        if (!res.ok) throw new Error("Failed to update profile bio string");
        return await res.json();
    },

    async fetchAll() {
        const res = await fetch("/api/users/list");
        if (!res.ok) throw new Error("Failed to retrieve system users directory");
        return await res.json();
    },

    getAllUsers: async () => {
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to load user records from the network.');
        return response.json();
    },

    // Add inside the UserService object in src/services/users.js
    updateUserRole: async (username, targetRole) => {
        const response = await fetch('/api/admin/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, targetRole })
        });
        if (!response.ok) throw new Error('Security clearance override authorization denied.');
        return response.json();
    }
};