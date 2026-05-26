// api/articles/index.js
import { 
    getAcceptedArticles, 
    getAllArticles, 
    getArticleById, 
    toggleLike, 
    incrementViews 
} from "../lib/db/articles.js"; 

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

    // Determine the action based on the request URL path structure
    const urlParts = req.url.split("?")[0].split("/");
    const action = urlParts[urlParts.length - 1]; // Resolves to "like", "views", or "articles"

    // ─── 1. HANDLE POST REQUESTS (LIKE & VIEWS) ────────────────────────────
    if (req.method === "POST") {
        try {
            // Case A: Incrementing Article Views
            if (action === "views") {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: "Missing article ID" });

                await incrementViews(id);
                return res.status(200).json({ success: true, id });
            }

            // Case B: Toggling Likes
            if (action === "like") {
                const { id, isLiking } = req.body; // Expects a boolean flag from frontend tracking state
                if (!id) {
                    return res.status(400).json({ error: "Missing article ID" });
                }

                // If your frontend isn't passing `isLiking` explicitly yet, default it to true
                const checkLiking = typeof isLiking === "boolean" ? isLiking : true;

                await toggleLike(id, checkLiking);
                return res.status(200).json({ success: true, id });
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
            const { status, id } = req.query;
            
            // If fetching a single specific article by ID
            if (id) {
                const article = await getArticleById(id);
                if (!article) return res.status(404).json({ error: "Article not found" });
                return res.status(200).json(article);
            }

            // If checking an administrative status filter (e.g., pending review)
            if (status && status !== "accepted") {
                const allArticles = await getAllArticles();
                // Filter items manually if they match the desired status criteria
                const filtered = allArticles.filter(item => item.status === status || item.GSI3PK === `STATUS#${status}`);
                return res.status(200).json(filtered);
            }
            
            // Default home view: Fetch all accepted articles dynamically via GSI Index query
            const articles = await getAcceptedArticles();
            return res.status(200).json(articles);
        } catch (error) {
            console.error("GET ARTICLES ERROR:", error);
            return res.status(500).json({ error: "Failed to fetch articles data" });
        }
    }

    // Fallback if an unexpected method is used
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}