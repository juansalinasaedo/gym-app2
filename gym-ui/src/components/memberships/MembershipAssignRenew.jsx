// src/components/memberships/MembershipAssignRenew.jsx
import { useState } from "react";
import Section from "../Section";
import { apiPagarYRenovar } from "../../api";

export default function MembershipAssignRenew({
  clienteId, membresias, infoMembresia, onAfterChange
}) {
  const [membresiaId, setMembresiaId] = useState("");
  const [assignMonto, setAssignMonto] = useState("");
  const [assignMetodo, setAssignMetodo] = useState("Efectivo");
  const [renewMonto, setRenewMonto] = useState("");
  const [renewMetodo, setRenewMetodo] = useState("Efectivo");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const asignarConPago = async (e) => {
    e.preventDefault();
    if (!clienteId || !membresiaId || !assignMonto) return;
    setLoading(true); setMsg(null);
    try {
      await apiPagarYRenovar(Number(clienteId), {
        membresia_id: Number(membresiaId),
        monto: Number(assignMonto),
        metodo_pago: assignMetodo,
      });
      setAssignMonto(""); setMsg("✅ Asignación + pago realizados");
      onAfterChange?.();
    } catch { setMsg("❌ Error al asignar y pagar"); }
    finally { setLoading(false); }
  };

  const renovarConPago = async (e) => {
    e.preventDefault();
    if (!clienteId || !renewMonto) return;
    setLoading(true); setMsg(null);
    try {
      await apiPagarYRenovar(Number(clienteId), {
        monto: Number(renewMonto), metodo_pago: renewMetodo,
      });
      setRenewMonto(""); setMsg("✅ Renovación + pago realizados");
      onAfterChange?.();
    } catch { setMsg("❌ Error al renovar y pagar"); }
    finally { setLoading(false); }
  };

  return (
    <Section title="3) Membresías (asignar / pagar / renovar)">
      {msg && <div className="mb-2 text-sm">{msg}</div>}

      <div className="mb-4">
        <div className="mb-2 text-xs text-gray-600">Membresías disponibles</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {membresias.map((m) => (
            <label key={m.membresia_id} className="border rounded p-2 flex items-center gap-2 bg-gray-50 cursor-pointer">
              <input
                type="radio" name="plan" value={m.membresia_id}
                onChange={(e) => setMembresiaId(e.target.value)}
                checked={String(m.membresia_id) === String(membresiaId)}
              />
              <div className="text-sm">
                <div className="font-medium text-gray-900">{m.nombre}</div>
                <div className="text-xs text-gray-600">{m.duracion_dias} días · ${m.precio}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={asignarConPago} className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="text-sm font-semibold text-gray-800 mb-2">Asignar membresía (nuevo plan) + pago</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input className="border rounded px-3 py-2 text-sm w-full sm:w-28" type="number" placeholder="Monto"
                   value={assignMonto} onChange={(e) => setAssignMonto(e.target.value)} />
            <select className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                    value={assignMetodo} onChange={(e) => setAssignMetodo(e.target.value)}>
              <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option>
            </select>
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm w-full sm:w-auto disabled:opacity-60"
                    disabled={loading || !clienteId || !membresiaId || !assignMonto}>
              {loading ? "Procesando..." : "Asignar + pagar"}
            </button>
          </div>
        </form>

        <form onSubmit={renovarConPago} className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="text-sm font-semibold text-gray-800 mb-2">Renovar membresía actual + pago</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input className="border rounded px-3 py-2 text-sm w-full sm:w-28" type="number" placeholder="Monto"
                   value={renewMonto} onChange={(e) => setRenewMonto(e.target.value)} />
            <select className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                    value={renewMetodo} onChange={(e) => setRenewMetodo(e.target.value)}>
              <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option>
            </select>
            <button className="bg-purple-600 hover:bg-purple-700 text-white rounded px-4 py-2 text-sm w-full sm:w-auto disabled:opacity-60"
                    disabled={loading || !clienteId || !renewMonto || (infoMembresia && infoMembresia.estado === "sin_membresia")}>
              {loading ? "Procesando..." : "Renovar + pagar"}
            </button>
          </div>
        </form>
      </div>
    </Section>
  );
}
