// src/services/articles.jsx
const API_BASE = "/api/articles";

export const ArticlesService = {
    // Used by Blogs.jsx and Home.jsx to pull public approved dispatches
    async getAccepted() {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error("Failed to fetch accepted articles");
        return await res.json();
    },

    // Used by BlogPost.jsx to read a single post layout
    async getById(id) {
        if (!id) return null;
        const res = await fetch(`${API_BASE}?id=${id}`);
        if (!res.ok) throw new Error("Failed to load article metadata");
        return await res.json();
    },

    // Used by Admin.jsx to view specific categories (e.g., status=pending)
    async fetchByStatus(status) {
        const res = await fetch(`${API_BASE}?status=${status}`);
        if (!res.ok) throw new Error(`Failed to load articles with status ${status}`);
        return await res.json();
    },

    async getPending() {
        const res = await fetch(`${API_BASE}?status=pending`);
        if (!res.ok) throw new Error("Failed to load pending articles");
        return await res.json();
    },

    async getByAuthor(userSubId) {
        if (!userSubId) return [];
        const res = await fetch(`${API_BASE}?author=${encodeURIComponent(userSubId)}`);
        if (!res.ok) throw new Error("Failed to load author-specific articles");
        return await res.json();
    },

    // New optimized loader to grab everything for management dashboard
    async fetchAllAdminBlogs() {
        const res = await fetch(`${API_BASE}?status=all_admin`);
        if (!res.ok) throw new Error("Failed to grab master database record registry");
        return await res.json();
    },

    // Used by WriteForUs.jsx to safely submit draft dispatches
    async create(payload) {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", ...payload })
        });
        if (!res.ok) throw new Error("Failed to submit draft publication");
        return await res.json();
    },

    // Used by Admin.jsx to approve, reject, or archive posts
    async updateStatus(id, status) {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateStatus", id, status })
        });
        if (!res.ok) throw new Error("Failed to update execution status metadata");
        return await res.json();
    },

    // ✅ FIXED & LINKED: Passes the explicit delete action down to API router
    async deleteArticle(id) {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id })
        });
        if (!res.ok) throw new Error("Database deletion script tracking failed.");
        return await res.json();
    },

    async incrementViews(id) {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "views", id })
        });
        if (!res.ok) throw new Error("Failed to increment page view metrics");
        return await res.json();
    },

    async toggleLike(id, isLiking) {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "like", id, isLiking })
        });
        if (!res.ok) throw new Error("Failed to toggle engagement profile counts");
        return await res.json();
    }
};