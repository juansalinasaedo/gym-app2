// src/hooks/useAuth.js
import { useEffect, useState, useCallback } from "react";

/**
 * Hook súper simple para sesiones cookie-based (Flask).
 * Asume proxy Vite -> backend y que /auth/me y /auth/logout existen.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/auth/me", { credentials: "include" });
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = user?.role === "admin";

  const logout = async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  return { user, loading, isAdmin, refresh, logout };
}
