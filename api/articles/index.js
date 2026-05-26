// api/articles/index.js
import { ArticlesAPI } from "../lib/db/articles.js"; 

export default async function handler(req, res) {
    // Enable CORS headers
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Determine the action based on the request URL
    const urlParts = req.url.split("?")[0].split("/");
    const action = urlParts[urlParts.length - 1]; // e.g., "like", "views", or "articles"

    // ─── 1. HANDLE POST REQUESTS (LIKE & VIEWS) ────────────────────────────
    if (req.method === "POST") {
        try {
            // Case A: Incrementing Article Views
            if (action === "views") {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: "Missing article ID" });

                const updated = await ArticlesAPI.incrementViews(id);
                return res.status(200).json(updated);
            }

            // Case B: Toggling Likes
            if (action === "like") {
                const { id, userId } = req.body;
                if (!id || !userId) {
                    return res.status(400).json({ error: "Missing article ID or userId" });
                }

                const updated = await ArticlesAPI.toggleLike(id, userId);
                return res.status(200).json(updated);
            }

            return res.status(404).json({ error: "Action route not found" });
        } catch (error) {
            console.error(`POST ERROR FOR ACTION ${action}:`, error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    }

    // ─── 2. HANDLE GET REQUESTS (FETCH ARTICLES) ───────────────────────────
    if (req.method === "GET") {
        try {
            const { status } = req.query;
            
            // If checking a status filter (e.g. pending/approved)
            if (status) {
                const articles = await ArticlesAPI.fetchByStatus(status);
                return res.status(200).json(articles);
            }
            
            // Default: Fetch all approved articles
            const articles = await ArticlesAPI.fetchAllApproved();
            return res.status(200).json(articles);
        } catch (error) {
            console.error("GET ARTICLES ERROR:", error);
            return res.status(500).json({ error: "Failed to fetch articles data" });
        }
    }

    // Fallback if a method other than GET or POST is used
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}