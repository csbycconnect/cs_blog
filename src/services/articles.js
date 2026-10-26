// src/services/articles.jsx
import { authFetch, getIdToken } from "../lib/authFetch";

const API_BASE = "/api/articles";


export const ArticlesService = {
    // Used by Blogs.jsx and Home.jsx to pull public approved dispatches
    // Works with the current API (plain array) and a paginated API ({ items, nextCursor }).
    // `fields=list` + `limit`/`cursor` are ignored by the server until it supports them.
    // Single request only: the old fallback fired a 2nd full query on every failure,
    // which doubles DB load exactly when the server is struggling.
    async getAccepted({ limit, cursor, signal } = {}) {
        const params = new URLSearchParams({ status: 'accepted', fields: 'list' });
        if (limit) params.set('limit', String(limit));
        if (cursor) params.set('cursor', String(cursor));

        const res = await authFetch(`${API_BASE}?${params}`, { signal });
        if (!res.ok) throw new Error("Failed to fetch accepted articles");

        const data = await res.json();
        return Array.isArray(data) ? data : (data.items || []);
    },

    // Paginated variant: returns { items, nextCursor } (nextCursor is null when done)
    async getAcceptedPage({ limit = 10, cursor = null, signal } = {}) {
        const params = new URLSearchParams({ status: 'accepted', fields: 'list', limit: String(limit) });
        if (cursor) params.set('cursor', String(cursor));

        const res = await authFetch(`${API_BASE}?${params}`, { signal });
        if (!res.ok) throw new Error("Failed to fetch accepted articles");

        const data = await res.json();
        if (Array.isArray(data)) return { items: data, nextCursor: null };
        return { items: data.items || [], nextCursor: data.nextCursor || null };
    },

    // Used by BlogPost.jsx to read a single post layout
    async getById(id) {
        if (!id) return null;
        const res = await authFetch(`${API_BASE}?id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error("Failed to load article metadata");
        return await res.json();
    },

    // Used by Admin.jsx to view specific categories (e.g., status=pending)
    async fetchByStatus(status) {
        const res = await authFetch(`${API_BASE}?status=${status}`);
        if (!res.ok) throw new Error(`Failed to load articles with status ${status}`);
        return await res.json();
    },

    async getPending() {
        const res = await authFetch(`${API_BASE}?status=pending`);
        if (!res.ok) throw new Error("Failed to load pending articles");
        return await res.json();
    },

    async getByAuthor(userSubId) {
        if (!userSubId) return [];
        const res = await authFetch(`${API_BASE}?author=${encodeURIComponent(userSubId)}`);
        if (!res.ok) throw new Error("Failed to load author-specific articles");
        return await res.json();
    },

    // New optimized loader to grab everything for management dashboard
    async fetchAllAdminBlogs() {
        const res = await authFetch(`${API_BASE}?status=all_admin`);
        if (!res.ok) throw new Error("Failed to grab master database record registry");
        return await res.json();
    },

    async fetchAll() {
        return this.fetchAllAdminBlogs();
    },

    // Ids (from `ids`) that the signed-in user has liked. Empty array when signed out.
    async getMyLikes(ids = []) {
        if (!ids.length || !(await getIdToken())) return [];
        const res = await authFetch(`${API_BASE}?myLikes=${encodeURIComponent(ids.slice(0, 100).join(","))}`);
        if (!res.ok) return [];
        return await res.json();
    },

    // Used by WriteForUs.jsx to safely submit draft dispatches
    async create(payload) {
        const timestamp = new Date().toISOString();

        const body = {
            action: "create",

            // Required schema fields
            title: payload.title || "Untitled Dispatch",
            subtitle: payload.subtitle || payload.excerpt || "",
            content: payload.content || payload.contentHTML || "",
            authorName: payload.authorName || payload.name || "Anonymous",
            authorEmail: payload.authorEmail || payload.email || null,
            status: payload.status || "pending",
            createdAt: payload.createdAt || timestamp,
            updatedAt: payload.updatedAt || timestamp,
            views: typeof payload.views === 'number' ? payload.views : 0,
            likes: typeof payload.likes === 'number' ? payload.likes : 0,

            // Keep other optional metadata expected by the API
            contentHTML: payload.contentHTML || payload.content || "",
            club: payload.club || "General",
            category: payload.category || "Article",
            tags: Array.isArray(payload.tags) ? payload.tags : (payload.tags ? [payload.tags] : []),
            authorId: payload.authorId || payload.authorSub || null,
            authorSub: payload.authorSub || payload.authorId || null,
            readTime: payload.readTime || null
        };

        const res = await authFetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("Failed to submit draft publication");
        return await res.json();
    },

    // Used by Admin.jsx to approve, reject, or archive posts
    // Accepts optional `rejectionReason` for rejected workflows
    async updateStatus(id, status, rejectionReason = null) {
        const body = { action: "updateStatus", id, status };
        if (rejectionReason) body.rejectionReason = String(rejectionReason);

        const res = await authFetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error("Failed to update execution status metadata");
        return await res.json();
    },

    // ✅ FIXED & LINKED: Passes the explicit delete action down to API router
    async deleteArticle(id) {
        const res = await authFetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id })
        });
        if (!res.ok) throw new Error("Database deletion script tracking failed.");
        return await res.json();
    },

    async incrementViews(id) {
        // count one view per article per browser session (refresh/spam no longer writes to the DB)
        const key = `bb_viewed_${id}`;
        try {
            if (sessionStorage.getItem(key)) return { skipped: true };
            sessionStorage.setItem(key, '1');
        } catch { /* storage blocked: fall through and count */ }

        const res = await authFetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "views", id })
        });
        if (!res.ok) throw new Error("Failed to increment page view metrics");
        return await res.json();
    },

    async toggleLike(id, isLiking) {
        const res = await authFetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "like", id, isLiking })
        });
        if (!res.ok) throw new Error("Failed to toggle engagement profile counts");
        return await res.json();
    }
};