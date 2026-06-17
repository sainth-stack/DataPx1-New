import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { authApi } from "@/lib/api/auth";

export interface ActiveSession {
  sessionId: string;
  backendUserId?: number;
  userId: string;
  email: string;
  username: string;
  role: string | string[];
  tenant?: string;
  organization?: string;
  loginAt: number;
  lastActive: number;
  userAgent: string;
}

interface AuthContextType {
  user: ActiveSession | null;
  sessionId: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  sessions: ActiveSession[];
  terminateSession: (sessionId: string) => void;
  terminateUserSessions: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "datapx1_session";
const REGISTRY_KEY = "datapx1_sessions";

function readRegistry(): ActiveSession[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(list: ActiveSession[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
}

function makeSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as { sessionId: string }).sessionId;
    } catch {
      return null;
    }
  });

  const [sessions, setSessions] = useState<ActiveSession[]>(() => readRegistry());
  const user = sessionId ? sessions.find((s) => s.sessionId === sessionId) ?? null : null;

  const wasLoggedIn = useRef(!!sessionId);
  useEffect(() => {
    if (wasLoggedIn.current && sessionId && !user) {
      sessionStorage.removeItem(SESSION_KEY);
      setSessionId(null);
    }
    wasLoggedIn.current = !!sessionId;
  }, [sessionId, user]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === REGISTRY_KEY) setSessions(readRegistry());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const touch = () => {
      const list = readRegistry();
      const idx = list.findIndex((s) => s.sessionId === sessionId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], lastActive: Date.now() };
        writeRegistry(list);
        setSessions(list);
      }
    };
    touch();
    const id = window.setInterval(touch, 30000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await authApi.login(email, password);
      if (res.status !== "success" || !res.user) {
        return res.message || "Invalid email or password";
      }
      const u = res.user;
      const userId = u.email.toLowerCase();
      const others = readRegistry().filter((s) => s.userId !== userId);
      const session: ActiveSession = {
        sessionId: makeSessionId(),
        backendUserId: u.id,
        userId,
        email: u.email,
        username: u.username,
        role: u.role,
        tenant: u.tenant,
        organization: u.organization,
        loginAt: Date.now(),
        lastActive: Date.now(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      };
      const next = [session, ...others];
      writeRegistry(next);
      setSessions(next);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: session.sessionId }));
      setSessionId(session.sessionId);
      return null;
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string } } };
      if (ax.response?.status === 403) {
        return "Login is temporarily unavailable (CSRF). Please contact support.";
      }
      return ax.response?.data?.message || "Network error — please check your connection.";
    }
  }, []);

  const logout = useCallback(() => {
    if (sessionId) {
      const next = readRegistry().filter((s) => s.sessionId !== sessionId);
      writeRegistry(next);
      setSessions(next);
    }
    sessionStorage.removeItem(SESSION_KEY);
    setSessionId(null);
  }, [sessionId]);

  const terminateSession = useCallback((targetId: string) => {
    const next = readRegistry().filter((s) => s.sessionId !== targetId);
    writeRegistry(next);
    setSessions(next);
    if (targetId === sessionId) {
      sessionStorage.removeItem(SESSION_KEY);
      setSessionId(null);
    }
  }, [sessionId]);

  const terminateUserSessions = useCallback((targetUserId: string) => {
    const next = readRegistry().filter((s) => s.userId !== targetUserId);
    writeRegistry(next);
    setSessions(next);
    if (!next.find((s) => s.sessionId === sessionId)) {
      sessionStorage.removeItem(SESSION_KEY);
      setSessionId(null);
    }
  }, [sessionId]);

  return (
    <AuthContext.Provider value={{ user, sessionId, login, logout, sessions, terminateSession, terminateUserSessions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
