import { getArticleById } from "../lib/db/articles.js";

export default async function handler(req, res) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                error: "Missing article ID",
            });
        }

        const article = await getArticleById(id);

        if (!article) {
            return res.status(404).json({
                error: "Article not found",
            });
        }

        res.status(200).json(article);
    } catch (error) {
        console.error("GET ARTICLE ERROR:", error);

        res.status(500).json({
            error: "Failed to fetch article",
        });
    }
}