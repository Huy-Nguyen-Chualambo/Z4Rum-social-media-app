import { axiosClient } from "./axiosClient";

export const authApi = {
  register: (data: { username: string; email: string; password: string; gender: "male" | "female" }) =>
    axiosClient.post("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    axiosClient.post("/auth/login", data).then((r) => r.data),
  me: () => axiosClient.get("/auth/me").then((r) => r.data),
};
