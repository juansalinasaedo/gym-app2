import React, { useEffect, useMemo, useState } from "react";
import { apiGetClientes } from "../api";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function apiGetCliente(id) {
  const res = await fetch(`${API_BASE}/api/clientes/${id}`, { credentials: "include" });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
}

async function apiUpdateCliente(id, payload) {
  const res = await fetch(`${API_BASE}/api/clientes/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
}

export default function EditClientsAdmin() {
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null); // {type, text}
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setMsg(null);
      const list = await apiGetClientes();
      setClientes(list || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido} ${c.rut}`.toLowerCase().includes(t)
    );
  }, [clientes, q]);

  const selectClient = async (id) => {
    setSelectedId(id);
    setMsg(null);
    setLoading(true);
    try {
      const c = await apiGetCliente(id);
      setForm(c);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form?.cliente_id) return;
    setMsg(null);
    setLoading(true);
    try {
      await apiUpdateCliente(form.cliente_id, form);
      setMsg({ type: "success", text: "✅ Cliente actualizado" });

      // refrescar lista (para que se vea el cambio en el buscador)
      const list = await apiGetClientes();
      setClientes(list || []);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-lg font-semibold mb-3">Editar Clientes (solo admin)</div>

      {msg?.text && (
        <div className={`border rounded px-3 py-2 mb-3 text-sm ${
          msg.type === "error"
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-green-300 bg-green-50 text-green-800"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lista */}
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Buscar</div>
          <input
            className="border rounded px-3 py-2 w-full mb-3"
            placeholder="Buscar por nombre o RUT..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="max-h-[420px] overflow-auto">
            {filtered.map((c) => (
              <button
                key={c.cliente_id}
                onClick={() => selectClient(c.cliente_id)}
                className={`w-full text-left px-3 py-2 rounded mb-1 border ${
                  selectedId === c.cliente_id ? "bg-gray-100" : "bg-white"
                }`}
              >
                <div className="font-medium">{c.nombre} {c.apellido}</div>
                <div className="text-xs text-gray-600">{c.rut}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Edición</div>

          {!form ? (
            <div className="text-sm text-gray-600">
              Selecciona un cliente para editar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" value={form.nombre || ""}
                onChange={(e)=>setForm({...form, nombre:e.target.value})} placeholder="Nombre" />
              <input className="border rounded px-3 py-2" value={form.apellido || ""}
                onChange={(e)=>setForm({...form, apellido:e.target.value})} placeholder="Apellido" />
              <input className="border rounded px-3 py-2" value={form.rut || ""}
                onChange={(e)=>setForm({...form, rut:e.target.value})} placeholder="RUT" />
              <input className="border rounded px-3 py-2" value={form.email || ""}
                onChange={(e)=>setForm({...form, email:e.target.value})} placeholder="Email" />
              <input className="border rounded px-3 py-2" value={form.telefono || ""}
                onChange={(e)=>setForm({...form, telefono:e.target.value})} placeholder="Teléfono" />
              <input className="border rounded px-3 py-2" value={form.direccion || ""}
                onChange={(e)=>setForm({...form, direccion:e.target.value})} placeholder="Dirección" />

              <select className="border rounded px-3 py-2" value={form.estado || "activo"}
                onChange={(e)=>setForm({...form, estado:e.target.value})}>
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>

              <input className="border rounded px-3 py-2" type="date"
                value={form.fecha_nacimiento || ""}
                onChange={(e)=>setForm({...form, fecha_nacimiento:e.target.value})} />

              <button
                className="bg-gray-900 text-white rounded px-4 py-2 md:col-span-2 disabled:opacity-60"
                onClick={save}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
