import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (u: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const r = await api.get<{ user: User }>("/api/auth/me");
        setUser(r.user);
      } catch {
        await setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post<{ token: string; user: User }>("/api/auth/login", { email, password });
    await setToken(r.token);
    setUser(r.user);
  }

  async function register(name: string, email: string, password: string) {
    const r = await api.post<{ token: string; user: User }>("/api/auth/register", { name, email, password });
    await setToken(r.token);
    setUser(r.user);
  }

  function updateUser(u: User) {
    setUser(u);
  }

  async function logout() {
    await setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
