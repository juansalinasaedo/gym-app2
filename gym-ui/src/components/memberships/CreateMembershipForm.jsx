// src/components/memberships/CreateMembershipForm.jsx
import { useState } from "react";
import Section from "../Section";

export default function CreateMembershipForm({ onCreate }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", duracion_dias: 30, precio: 25000 });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      await onCreate({ ...form, duracion_dias: Number(form.duracion_dias), precio: Number(form.precio) });
      setForm({ nombre: "", descripcion: "", duracion_dias: 30, precio: 25000 });
      setMsg("✅ Membresía creada");
    } catch { setMsg("❌ Error al crear membresía"); }
    finally { setLoading(false); }
  };

  return (
    <Section title="4) Crear Plan">
      <form onSubmit={submit} className="border rounded p-3 bg-gray-50">
        {msg && <div className="mb-2 text-sm">{msg}</div>}
        <div className="font-medium mb-2 text-sm text-gray-800">Crear nueva membresía</div>
        <input className="border rounded px-3 py-2 mb-2 w-full text-sm" placeholder="Nombre"
               value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input className="border rounded px-3 py-2 mb-2 w-full text-sm" placeholder="Descripción"
               value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="Días"
                 value={form.duracion_dias} onChange={(e) => setForm({ ...form, duracion_dias: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" type="number" placeholder="Precio"
                 value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
        </div>
        <button className="bg-gray-900 text-white rounded px-4 py-2 w-full mt-2 text-sm" disabled={loading}>
          {loading ? "Guardando..." : "Crear plan"}
        </button>
      </form>
    </Section>
  );
}
