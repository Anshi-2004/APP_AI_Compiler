/**
 * API Client — typed fetch wrapper
 * Phase 2+ will wire real endpoints. For now this is a typed shell.
 */

import { API_BASE_URL } from "./constants";
import type { ApiResponse } from "@/types/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ...init } = options;

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    url += `?${query}`;
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<ApiResponse<T>>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...options }),
};
