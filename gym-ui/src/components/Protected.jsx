// src/components/Protected.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Protected({ roles = [], children }) {
  const { ready, user, hasRole } = useAuth();
  if (!ready) return <div className="p-6 text-sm text-gray-600">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRole(roles)) return <div className="p-6 text-sm text-red-700">Acceso denegado.</div>;
  return children;
}
