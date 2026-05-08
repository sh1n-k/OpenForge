import { apiFetch } from "./client";

export async function login(password: string) {
  return apiFetch<{ authenticated: boolean }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return apiFetch<{ loggedOut: boolean }>("/api/v1/auth/logout", {
    method: "POST",
  });
}

export async function refreshAuth() {
  return apiFetch<{ refreshed: boolean }>("/api/v1/auth/refresh", {
    method: "POST",
  });
}
