const API_BASE = "/api/articles";

export const ArticlesService = {
    async getAccepted() {
        const res = await fetch(API_BASE);

        if (!res.ok) {
            throw new Error("Failed to fetch articles");
        }

        return await res.json();
    },

    async getById(id) {
        const res = await fetch(`${API_BASE}/details?id=${id}`);

        if (!res.ok) {
            throw new Error("Failed to fetch article");
        }

        return await res.json();
    },

    async toggleLike(id, isLiking) {
        const res = await fetch(`${API_BASE}/like`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id,
                isLiking,
            }),
        });

        if (!res.ok) {
            throw new Error("Failed to toggle like");
        }

        return await res.json();
    },

    async incrementViews(id) {
        await fetch(`${API_BASE}/views`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });
    },
};