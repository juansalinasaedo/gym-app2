import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";

// Base de la API (si usas proxy de Vite a /api y /auth, puede quedar vacío)
const API_BASE = import.meta.env.VITE_API_BASE || "";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const me = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      const j = await r.json();
      setUser(j.user || null);
    } catch (_) {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { me(); }, [me]);

  async function login(email, password) {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || "Credenciales inválidas");
    }
    const j = await r.json();
    setUser(j.user);
    return j.user;
  }

  async function logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    Cookies.remove("session"); // por si acaso
    setUser(null);
  }

  const value = { user, checking, login, logout, refresh: me };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
