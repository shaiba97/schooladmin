import { adminApiFetch } from "./client";
import type { ApiHall, CreateHallPayload } from "./types";

export function listHalls() {
  return adminApiFetch<ApiHall[]>("/halls");
}

export function getHall(id: string) {
  return adminApiFetch<ApiHall>(`/halls/${id}`);
}

export function createHall(payload: CreateHallPayload) {
  return adminApiFetch<ApiHall>("/halls", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHall(id: string, payload: Partial<CreateHallPayload>) {
  return adminApiFetch<ApiHall>(`/halls/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteHall(id: string) {
  return adminApiFetch<{ deleted: true }>(`/halls/${id}`, { method: "DELETE" });
}
