import axios from "axios";
import {API_BASE_URL} from "@/lib/utils/url";

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("z4rum_token") || localStorage.getItem("z4rum_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});
