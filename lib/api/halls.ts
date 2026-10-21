import { adminApiFetch } from "./client";
import type { ApiHall } from "./types";

export function listHalls() {
  return adminApiFetch<ApiHall[]>("/halls");
}

export function getHall(id: string) {
  return adminApiFetch<ApiHall>(`/halls/${id}`);
}
