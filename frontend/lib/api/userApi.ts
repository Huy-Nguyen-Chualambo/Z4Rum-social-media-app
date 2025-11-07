import { axiosClient } from "./axiosClient";

export const userApi = {
  get: (id: string) => axiosClient.get(`/users/${id}`).then((r) => r.data as { id: string; username: string; avatarUrl?: string; bio?: string; gender?: "male" | "female" }),
  update: (id: string, data: { username?: string; avatarUrl?: string; bio?: string; gender?: "male" | "female" }) =>
    axiosClient.put(`/users/${id}`, data).then((r) => r.data),
};


