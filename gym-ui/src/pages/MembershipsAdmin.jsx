// src/pages/MembershipsAdmin.jsx
import React, { useState } from "react";
import { useMembresias } from "../hooks/useMembresias";
import CreateMembershipForm from "../components/memberships/CreateMembershipForm";
import Section from "../components/Section";

export default function MembershipsAdmin() {
  const { membresias, crearMembresia, eliminarMembresia } = useMembresias();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    duracion_dias: "",
    precio: "",
  });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (m) => {
    setEditingId(m.membresia_id);
    setForm({
      nombre: m.nombre,
      duracion_dias: m.duracion_dias,
      precio: m.precio,
    });
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setMsg(null);
    try {
      await actualizarMembresia(editingId, {
        nombre: form.nombre,
        duracion_dias: Number(form.duracion_dias),
        precio: Number(form.precio),
      });
      setMsg("✅ Plan actualizado");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setMsg("❌ Error al actualizar plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-1">Administración de planes</h1>
      <p className="text-sm text-slate-600 mb-4">
        Crea y modifica los planes de membresía disponibles en el gimnasio.
        Esta sección está disponible solo para usuarios con rol <b>admin</b>.
      </p>

      <CreateMembershipForm onCreate={crearMembresia} />

      <Section
        title="Planes existentes"
        subtitle="Edita nombre, duración o precio de los planes."
        variant="soft"
        icon="📋"
        hover
      >
        {msg && <div className="mb-2 text-sm">{msg}</div>}

        {membresias.length === 0 ? (
          <div className="text-sm text-slate-500">
            Aún no hay planes registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Días</th>
                  <th className="px-3 py-2">Precio</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {membresias.map((m) => {
                  const isEditing = editingId === m.membresia_id;
                  return (
                    <tr key={m.membresia_id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-slate-500">
                        #{m.membresia_id}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={form.nombre}
                            onChange={(e) =>
                              setForm({ ...form, nombre: e.target.value })
                            }
                          />
                        ) : (
                          m.nombre
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-24"
                            value={form.duracion_dias}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                duracion_dias: e.target.value,
                              })
                            }
                          />
                        ) : (
                          `${m.duracion_dias} días`
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-28"
                            value={form.precio}
                            onChange={(e) =>
                              setForm({ ...form, precio: e.target.value })
                            }
                          />
                        ) : (
                          `$${Number(m.precio).toLocaleString("es-CL")}`
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-3 py-1 rounded border text-xs"
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="px-3 py-1 rounded bg-gym-dark text-white text-xs"
                              disabled={saving}
                            >
                              {saving ? "Guardando..." : "Guardar"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(m)}
                            className="px-3 py-1 rounded border text-xs hover:bg-slate-100"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-2 justify-end">
                            <button
                            type="button"
                            onClick={() => {
                                const ok = window.confirm(
                                `¿Seguro que deseas eliminar el plan "${m.nombre}"?`
                                );
                                if (!ok) return;
                                eliminarMembresia(m.membresia_id).catch((err) => {
                                console.error(err);
                                alert(
                                    "No se pudo eliminar el plan. Puede estar asociado a clientes o pagos."
                                );
                                });
                            }}
                            className="px-3 py-1 rounded border border-red-300 text-xs text-red-600 hover:bg-red-50"
                            >
                            Eliminar
                            </button>
                        </div>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
