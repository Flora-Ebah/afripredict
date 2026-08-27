"use client";

import { useAuthStore } from "./auth-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function rawRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new ApiError("NETWORK_ERROR", `Réponse invalide du serveur (${res.status})`);
  }
  if (!body.success) {
    throw new ApiError(body.error?.code ?? "UNKNOWN", body.error?.message ?? "Erreur inconnue");
  }
  return body.data as T;
}

/** API request with automatic access-token refresh on 401. */
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken, refreshToken, setSession, clear } = useAuthStore.getState();
  try {
    return await rawRequest<T>(path, options, accessToken);
  } catch (err) {
    if (err instanceof ApiError && (err.code === "UNAUTHORIZED" || err.code === "HTTP_ERROR") && refreshToken) {
      try {
        const data = await rawRequest<{ user: any; accessToken: string; refreshToken: string }>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
        setSession(data.user, data.accessToken, data.refreshToken);
        return await rawRequest<T>(path, options, data.accessToken);
      } catch {
        clear();
        throw err;
      }
    }
    throw err;
  }
}

export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: "DELETE" });
