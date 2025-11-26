// src/auth/AuthProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // cuando ya sabemos si hay sesión o no

  // Consulta inicial al backend: /auth/me
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });
      const data = await res.json();
      setUser(data.user || null);
    } catch (err) {
      console.error("Error al verificar sesión", err);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  // Llamar a /auth/me una sola vez al montar
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Login: usa cookie de sesión de Flask
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
  
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // la respuesta no es JSON (por ejemplo, HTML de error 500)
      const msg = `Error del servidor (${res.status}).`;
      throw new Error(msg);
    }
  
    if (!res.ok) {
      const msg = data?.error || "Error al iniciar sesión";
      throw new Error(msg);
    }
  
    setUser(data.user || null);
    setReady(true);
    return data.user;
  };  

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error al cerrar sesión", err);
    } finally {
      setUser(null);
      setReady(true);
    }
  };

  // Timeout por inactividad en el FRONT (opcional, 30 minutos)
  useEffect(() => {
    const IDLE_MS = 30 * 60 * 1000; // 30 minutos
    let timerId;

    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        logout(); // fuerza logout tras inactividad
      }, IDLE_MS);
    };

    // eventos que consideras "actividad"
    const events = ["mousemove", "keydown", "click"];

    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer(); // inicializa

    return () => {
      clearTimeout(timerId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [logout]);

  const isAdmin = !!user && user.role === "admin";

  const hasRole = (roles = []) => {
    if (!roles || roles.length === 0) return true;
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value = { user, ready, login, logout, isAdmin, hasRole };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
};
