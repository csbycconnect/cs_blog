import { getAcceptedArticles } from "../lib/db/articles.js";

export default async function handler(req, res) {
    try {
        const articles = await getAcceptedArticles();

        res.status(200).json(articles);
    } catch (error) {
        console.error("GET ARTICLES ERROR:", error);

        res.status(500).json({
            error: "Failed to fetch articles",
        });
    }
}