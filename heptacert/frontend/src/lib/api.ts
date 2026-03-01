export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";

// Warn loudly in production if the API base URL is unset
if (
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_BASE
) {
  console.error(
    "[HeptaCert] NEXT_PUBLIC_API_BASE is not set! " +
    "Falling back to http://localhost:8765/api which will fail in production. " +
    "Set NEXT_PUBLIC_API_BASE in your environment or .env.production file."
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("heptacert_token");
}

export function setToken(token: string) {
  localStorage.setItem("heptacert_token", token);
}

export function clearToken() {
  localStorage.removeItem("heptacert_token");
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") throw new ApiError(0, "İstek zaman aşımına uğradı.");
    throw new ApiError(0, err?.message || "Ağ hatası.");
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    throw new ApiError(401, "Oturum sona erdi.");
  }

  if (!res.ok) {
    let detail = `İstek başarısız (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail || JSON.stringify(j);
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res;
}