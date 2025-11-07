import axios from "axios";

export const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("z4rum_token") || localStorage.getItem("z4rum_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});
