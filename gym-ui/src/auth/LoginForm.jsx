// src/auth/LoginForm.jsx
import React, { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@gym.local");  // para pruebas
  const [password, setPassword] = useState("admin123");    // para pruebas
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      console.error(e);
      setErr("Credenciales inválidas o usuario deshabilitado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border rounded-xl p-6 bg-white shadow-sm space-y-4"
      >
        <div className="text-lg font-semibold text-gray-800">Iniciar sesión</div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {err}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-gray-600">Email</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600">Contraseña</label>
          <input
            type="password"
            className="border rounded px-3 py-2 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2 w-full disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="text-[11px] text-gray-500">
          Usa tu usuario de cajero/administrador. (Por defecto seed: admin@gym.local / admin123)
        </div>
      </form>
    </div>
  );
}
