// src/App.jsx
import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import Protected from "./components/Protected";

import CashierPanel from "./CashierPanel";
import AdminUsers from "./components/admin/AdminUsers";
import Login from "./pages/Login";

function HeaderBar() {
  const { user, logout, isAdmin } = useAuth();
  return (
    <div className="w-full bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
      <div className="font-semibold"><Link to="/">SISTEMA GYM</Link></div>
      <div className="text-sm flex items-center gap-3">
        {isAdmin && <Link className="opacity-80 hover:opacity-100" to="/admin">Panel Administrador</Link>}
        {user ? (
          <>
            <span className="opacity-80">{user.name} · {user.role}</span>
            <button onClick={logout} className="text-xs bg-white/10 hover:bg-white/20 rounded px-3 py-1">
              Salir
            </button>
          </>
        ) : (
          <Link to="/login" className="text-xs bg-white/10 hover:bg-white/20 rounded px-3 py-1">Login</Link>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HeaderBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <Protected /* roles={['cashier','admin']} (opcional) */>
            <div className="max-w-6xl mx-auto p-4"><CashierPanel /></div>
          </Protected>
        } />
        <Route path="/admin" element={
          <Protected roles={['admin']}>
            <div className="max-w-6xl mx-auto p-4">
              <div className="text-lg font-semibold mb-3">Administración de usuarios</div>
              <AdminUsers />
            </div>
          </Protected>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
