import { axiosClient } from "./axiosClient";

export const matchApi = {
  start: () => axiosClient.post("/match/start").then((r) => r.data),
  stop: () => axiosClient.post("/match/stop").then((r) => r.data),
};
