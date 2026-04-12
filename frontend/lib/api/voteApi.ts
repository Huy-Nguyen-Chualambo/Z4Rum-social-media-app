import { axiosClient } from "./axiosClient";

export type VoteOption = {
  id: string;
  text: string;
  _count?: { votes: number };
};

export type VoteComment = {
  id: string;
  content: string;
  imageUrl?: string | null;
  authorId: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  topicId: string;
  createdAt: string;
};

export type VoteTopic = {
  id: string;
  title: string;
  description?: string | null;
  authorId: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  options: VoteOption[];
  votes?: Array<{ optionId: string }>;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  _count?: { votes: number };
};

export const voteApi = {
  list: () => axiosClient.get<VoteTopic[]>("/votes/topics").then((r) => r.data),
  
  trending: (limit = 5) => axiosClient.get<VoteTopic[]>(`/votes/topics/trending?limit=${limit}`).then((r) => r.data),
  
  get: (id: string) => axiosClient.get<VoteTopic>(`/votes/topics/${id}`).then((r) => r.data),
  
  create: (data: {
    title: string;
    description?: string;
    options: string[];
    durationHours?: number;
  }) => axiosClient.post<VoteTopic>("/votes/topics", data).then((r) => r.data),
  
  vote: (topicId: string, optionId: string) =>
    axiosClient.post<VoteTopic>(`/votes/topics/${topicId}/vote`, { optionId }).then((r) => r.data),
  
  comments: {
    list: (topicId: string, params: { limit?: number; cursor?: string } = {}) =>
      axiosClient.get<{ items: VoteComment[]; nextCursor: string | null }>(`/votes/topics/${topicId}/comments`, { params }).then((r) => r.data),
    
    create: (topicId: string, data: { content?: string; imageUrl?: string }) =>
      axiosClient.post<{ item: VoteComment; commentCount: number }>(`/votes/topics/${topicId}/comments`, data).then((r) => r.data),
  },
};

