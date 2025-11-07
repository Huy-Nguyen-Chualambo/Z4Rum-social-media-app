import { axiosClient } from "./axiosClient";

export const friendApi = {
  list: () => axiosClient.get("/friends").then((r) => r.data as { id: string; username: string; avatarUrl?: string }[]),
};


