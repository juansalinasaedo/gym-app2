// src/App.jsx
import React from "react";
import AttendanceDashboard from "./pages/AttendanceDashboard";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import Protected from "./components/Protected";

import CashierPanel from "./CashierPanel";
import AdminUsers from "./components/admin/AdminUsers";
import Login from "./pages/Login";

function HeaderBar() {
  const { user, logout, isAdmin } = useAuth();

  // Función de scroll hacia secciones del CashierPanel
  const goTo = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow">
      {/* Logo */}
      <div
        className="font-semibold tracking-wide cursor-pointer"
        onClick={() => goTo("sec-buscar")}
      >
        <Link to="/" className="navbar-brand">SISTEMA GYM</Link>
      </div>

      {/* Navegación */}
      {user && (
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <button className="hover:text-gray-300" onClick={() => goTo("sec-buscar")}>
            Buscar
          </button>

          <button className="hover:text-gray-300" onClick={() => goTo("sec-registrar")}>
            Registrar
          </button>

          <button className="hover:text-gray-300" onClick={() => goTo("sec-asistencia")}>
            Asistencias
          </button>

          {isAdmin && (
            <>
              <button
                className="hover:text-gray-300"
                onClick={() => goTo("sec-crearplan")}
              >
                Crear plan
              </button>

              <button className="hover:text-gray-300" onClick={() => goTo("sec-caja")}>
                Caja del día
              </button>

              {/* 🔹 Nuevo link solo para admin: Dashboard de Asistencia */}
              <Link
                to="/dashboard/asistencia"
                className="hover:text-gray-300"
              >
                Dashboard asistencia
              </Link>
            </>
          )}

          <button
            className="hover:text-gray-300"
            onClick={() => goTo("sec-vencimientos")}
          >
            Vencimientos
          </button>

          <button className="hover:text-gray-300" onClick={() => goTo("sec-reportes")}>
            Reportes
          </button>
        </nav>
      )}

      {/* Usuario + Salir */}
      <div className="text-sm flex items-center gap-3">
        {user ? (
          <>
            <span className="opacity-80">
              {user.name} · {user.role}
            </span>
            <button
              onClick={logout}
              className="text-xs bg-white/10 hover:bg.white/20 rounded px-3 py-1"
            >
              Salir
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="text-xs bg.white/10 hover:bg.white/20 rounded px-3 py-1"
          >
            Login
          </Link>
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

        <Route
          path="/"
          element={
            <Protected>
              <div className="max-w-6xl mx-auto p-4">
                <CashierPanel />
              </div>
            </Protected>
          }
        />

        <Route
          path="/admin"
          element={
            <Protected roles={["admin"]}>
              <div className="max-w-6xl mx-auto p-4">
                <div className="text-lg font-semibold mb-3">
                  Administración de usuarios
                </div>
                <AdminUsers />
              </div>
            </Protected>
          }
        />

        {/* 🔹 Dashboard de asistencia solo para admin */}
        <Route
          path="/dashboard/asistencia"
          element={
            <Protected roles={["admin"]}>
              <div className="max-w-6xl mx-auto p-4">
                <AttendanceDashboard />
              </div>
            </Protected>
          }
        />

        {/* Wildcard al final */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
