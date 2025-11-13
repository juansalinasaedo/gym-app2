// src/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, booting } = useAuth();
  if (booting) return null; // opcional: spinner
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}
