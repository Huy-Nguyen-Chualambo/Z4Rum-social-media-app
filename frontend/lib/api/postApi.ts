import { axiosClient } from "./axiosClient";

export type PostAuthor = { id: string; username: string; avatarUrl?: string | null };
export type PostItem = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: PostAuthor;
  _count?: { likes: number; comments: number };
};

export type PostComment = { id: string; content: string; createdAt: string };

export const postApi = {
  create: (data: { content: string; imageUrl?: string }) =>
    axiosClient.post<PostItem>("/posts", data).then((r) => r.data),
  list: (params: { limit?: number; cursor?: string; authorId?: string; search?: string } = {}) =>
    axiosClient
      .get<{ items: PostItem[]; nextCursor: string | null }>("/posts", { params })
      .then((r) => r.data),
  get: (id: string) => axiosClient.get<PostItem>(`/posts/${id}`).then((r) => r.data),
  update: (id: string, data: { content?: string; imageUrl?: string }) =>
    axiosClient.put(`/posts/${id}`, data).then((r) => r.data),
  remove: (id: string) => axiosClient.delete(`/posts/${id}`).then((r) => r.data),
  like: (id: string) =>
    axiosClient
      .post(`/posts/${id}/like`)
      .then((r) => r.data as { ok: boolean; likes: number; liked?: boolean }),
  comments: {
    list: (id: string, params: { limit?: number; cursor?: string } = {}) =>
      axiosClient
        .get(`/posts/${id}/comments`, { params })
        .then((r) => r.data as { items: PostComment[]; nextCursor: string | null }),
    create: (id: string, data: { content: string }) =>
      axiosClient
        .post(`/posts/${id}/comments`, data)
        .then((r) => r.data as { item: PostComment; comments: number }),
  },
};
