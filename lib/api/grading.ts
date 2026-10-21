import { adminApiFetch } from "./client";
import type { ApiGradingBand, ApiGradingScale } from "./types";

export function listGradingScales() {
  return adminApiFetch<ApiGradingScale[]>("/grading/scales");
}

export function getGradingScale(id: string) {
  return adminApiFetch<ApiGradingScale>(`/grading/scales/${id}`);
}

export function bandLabel(band: ApiGradingBand) {
  return `${band.minPercent}–${band.maxPercent}% → ${band.grade}`;
}
