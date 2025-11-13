import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

/**
 * Protección por login y roles.
 * Uso:
 * <ProtectedRoute element={<Componente/>} roles={["admin"]} />
 */
export default function ProtectedRoute({ element, roles }) {
  const { user, checking } = useAuth();

  if (checking) return <div className="p-6 text-sm text-gray-600">Verificando sesión…</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0) {
    const ok = roles.includes(user.role);
    if (!ok) return <div className="p-6 text-sm text-red-600">No tienes permiso para ver esta página.</div>;
  }

  return element;
}
