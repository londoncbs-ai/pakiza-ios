import { api } from './client';
import type { Article, ArticleItem } from './types';

export const newsApi = {
  list(category?: string, featured?: boolean) {
    const params: Record<string, string | boolean> = {};
    if (category) params.category = category;
    if (featured != null) params.featured = featured;
    return api.get<ArticleItem[]>('/news', { params }).then((r) => r.data);
  },

  get(id: string) {
    return api.get<Article>(`/news/${id}`).then((r) => r.data);
  },
};
