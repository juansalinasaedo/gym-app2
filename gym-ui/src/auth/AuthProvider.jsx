// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiLogin, apiLogout, apiMe } from "../api";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiMe();
        setUser(r.user || null);
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const r = await apiLogin(email, password);
    setUser(r.user);
    return r.user;
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    setUser(null);
  };

  const isAdmin = !!user && user.role === "admin";
  const isCashier = !!user && user.role === "cashier";
  const hasRole = (roles = []) => !!user && (roles.length === 0 || roles.includes(user.role));

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, isAdmin, isCashier, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
