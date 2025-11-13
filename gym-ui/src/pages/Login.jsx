// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@gym.local");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (e) {
      setErr(e.message || "Error de autenticación");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-3">
        <div className="text-lg font-semibold">Ingresar</div>
        {err && <div className="text-sm text-red-700">{err}</div>}
        <input className="border rounded px-3 py-2 w-full" placeholder="Email" 
               onChange={e=>setEmail(e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Contraseña"
               onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-gray-900 hover:bg-black text-white rounded px-3 py-2">
          Entrar
        </button>
      </form>
    </div>
  );
}
