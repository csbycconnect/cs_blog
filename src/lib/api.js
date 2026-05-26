import { ArticlesService } from "../services/articles";

export const ArticleAPI = {
    fetchByStatus: async (status) => {
        if (status === "accepted") {
            return await ArticlesService.getAccepted();
        }
        return [];
    },

    toggleLike: ArticlesService.toggleLike,
};