import { toggleLike } from "../lib/db/articles.js";

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed",
            });
        }

        const { id, isLiking } = req.body;

        if (!id) {
            return res.status(400).json({
                error: "Missing article ID",
            });
        }

        await toggleLike(id, isLiking);

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error("LIKE ERROR:", error);

        res.status(500).json({
            error: "Failed to update like",
        });
    }
}