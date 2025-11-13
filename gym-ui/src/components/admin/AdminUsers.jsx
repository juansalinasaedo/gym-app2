// src/components/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import {
  apiUsersList,
  apiUsersCreate,
  apiUsersToggle,
  apiUsersDelete,
  apiUsersResetPassword,   // ⬅️ nuevo
} from "../../api";
import { useAuth } from "../../auth/AuthProvider";

function RoleBadge({ role }) {
  const cls =
    role === "admin"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-emerald-100 text-emerald-700";
  const label = role === "admin" ? "Admin" : "Cajero";
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${cls}`}>{label}</span>
  );
}

export default function AdminUsers() {
  const { isAdmin } = useAuth(); // seguridad extra (además de ocultar la vista)
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // Formulario “nuevo usuario”
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier"); // default cajero

  async function load() {
    setLoading(true);
    try {
      const data = await apiUsersList();
      setItems(data.users || []);
    } catch (e) {
      setMsg(`⚠️ Error al cargar usuarios: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setMsg(null);
    try {
      if (!name.trim() || !email.trim() || !password) {
        return setMsg("Completa nombre, email y contraseña.");
      }
      await apiUsersCreate({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      setMsg("✅ Usuario creado.");
      setShowForm(false);
      setName(""); setEmail(""); setPassword(""); setRole("cashier");
      await load();
    } catch (e) {
      setMsg(`❌ No se pudo crear: ${e.message}`);
    }
  }

  async function onToggle(u) {
    try {
      await apiUsersToggle(u.user_id, !u.enabled);
      await load();
    } catch (e) {
      setMsg(`⚠️ Error al actualizar: ${e.message}`);
    }
  }

  async function onDelete(u) {
    if (!confirm(`¿Eliminar a ${u.name}?`)) return;
    try {
      await apiUsersDelete(u.user_id);
      await load();
    } catch (e) {
      setMsg(`⚠️ Error al eliminar: ${e.message}`);
    }
  }

  // 🔐 Reset de contraseña (prompt simple)
  async function onResetPass(u) {
    const pwd = prompt(`Nueva contraseña para ${u.email}:`);
    if (pwd == null) return; // cancelado
    const val = String(pwd).trim();
    if (val.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      await apiUsersResetPassword(u.user_id, val);
      setMsg(`✅ Contraseña de ${u.email} actualizada.`);
    } catch (e) {
      setMsg(`❌ No se pudo resetear: ${e.message}`);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">
          👤 Administración de usuarios
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black"
        >
          {showForm ? "Cancelar" : "➕ Nuevo usuario"}
        </button>
      </div>

      {msg && (
        <div className="p-2 text-sm rounded border bg-white">{msg}</div>
      )}

      {showForm && (
        <form onSubmit={onCreate} className="grid md:grid-cols-5 gap-2 text-sm">
          <input
            className="border rounded px-2 py-1"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="cashier">Cajero</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Crear
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 text-left">
            <tr>
              <th className="px-3 py-2 border-b">Nombre</th>
              <th className="px-3 py-2 border-b">Email</th>
              <th className="px-3 py-2 border-b">Rol</th>
              <th className="px-3 py-2 border-b">Estado</th>
              <th className="px-3 py-2 border-b w-56">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>Sin usuarios.</td></tr>
            ) : (
              items.map((u) => (
                <tr key={u.user_id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b">{u.name}</td>
                  <td className="px-3 py-2 border-b">{u.email}</td>
                  <td className="px-3 py-2 border-b"><RoleBadge role={u.role} /></td>
                  <td className="px-3 py-2 border-b">
                    <span
                      className={`px-2 py-0.5 rounded text-xs border ${
                        u.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {u.enabled ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onToggle(u)}
                        className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                        title={u.enabled ? "Deshabilitar" : "Habilitar"}
                      >
                        {u.enabled ? "Deshabilitar" : "Habilitar"}
                      </button>
                      <button
                        onClick={() => onResetPass(u)}
                        className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                        title="Resetear contraseña"
                      >
                        Reset pass
                      </button>
                      <button
                        onClick={() => onDelete(u)}
                        className="px-2 py-1 rounded border text-xs text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
