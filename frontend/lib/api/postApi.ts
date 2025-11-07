import { axiosClient } from "./axiosClient";

export const postApi = {
  create: (data: { content: string; imageUrl?: string }) =>
    axiosClient.post("/posts", data).then((r) => r.data),
  list: (params: { limit?: number; cursor?: string; authorId?: string } = {}) =>
    axiosClient.get("/posts", { params }).then((r) => r.data),
  get: (id: string) => axiosClient.get(`/posts/${id}`).then((r) => r.data),
  remove: (id: string) => axiosClient.delete(`/posts/${id}`).then((r) => r.data),
  like: (id: string) => axiosClient.post(`/posts/${id}/like`).then((r) => r.data as { ok: boolean; likes: number; liked?: boolean }),
  comments: {
    list: (id: string, params: { limit?: number; cursor?: string } = {}) =>
      axiosClient.get(`/posts/${id}/comments`, { params }).then((r) => r.data as { items: any[]; nextCursor: string | null }),
    create: (id: string, data: { content: string }) =>
      axiosClient.post(`/posts/${id}/comments`, data).then((r) => r.data as { item: any; comments: number }),
  },
};
