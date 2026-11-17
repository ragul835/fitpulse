import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_PORT = 4002;

// Resolve the API base URL for web, simulator, and a real device on the LAN.
function resolveBaseUrl(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:${API_PORT}`;
    }
    return `http://localhost:${API_PORT}`;
  }
  // Native: derive the dev machine's host from the Metro/Expo host.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest2 as any)?.extra?.expoGo?.developer?.host ||
    "";
  const host = hostUri.split(":")[0];
  if (host) return `http://${host}:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

export const API_BASE = resolveBaseUrl();

const TOKEN_KEY = "fitpulse_token";

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Can't reach the FitPulse server. Is the API running?");
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
