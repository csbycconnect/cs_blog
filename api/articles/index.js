import { getAllArticles } from "../lib/db/articles";

export default async function handler(req, res) {
  try {
    const articles = await getAllArticles();

    res.status(200).json(articles);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}