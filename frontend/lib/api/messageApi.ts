import { axiosClient } from "./axiosClient";

export const messageApi = {
  conversations: () => axiosClient.get(`/messages`).then((r) => r.data as { peer: { id: string; username: string; avatarUrl?: string }, lastMessage: { id: string; content: string; createdAt: string; senderId: string; receiverId?: string } }[]),
  history: (userId: string) => axiosClient.get(`/messages/${userId}`).then((r) => r.data),
  send: (userId: string, data: { content: string }) => axiosClient.post(`/messages/${userId}`, data).then((r) => r.data),
};
