import axios from "axios";

const SESSION_KEY = "datapx1_session";
const REGISTRY_KEY = "datapx1_sessions";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://3.253.0.188:6003";

function getUserIdForHeader(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const { sessionId } = JSON.parse(raw) as { sessionId: string };
      const registry = localStorage.getItem(REGISTRY_KEY);
      if (registry) {
        const session = (JSON.parse(registry) as Array<{ sessionId: string; backendUserId?: number; userId: string }>)
          .find((s) => s.sessionId === sessionId);
        if (session) {
          return session.backendUserId != null ? String(session.backendUserId) : session.userId;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return localStorage.getItem("userId") || "default-user";
}

export const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: false,
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  config.headers["X-User-ID"] = getUserIdForHeader();
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data);
    } else if (error.request) {
      console.error("Network Error:", error.message);
    }
    return Promise.reject(error);
  },
);

export function toFormBody(data: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => params.append(k, v));
  return params;
}
