// src/components/memberships/MembershipAssignRenew.jsx
import { useMemo, useState } from "react";
import Section from "../Section";
import { apiPagarYRenovar } from "../../api";

export default function MembershipAssignRenew({
  clienteId,
  membresias,
  infoMembresia,
  onAfterChange,
}) {
  const [membresiaId, setMembresiaId] = useState("");
  const [assignMonto, setAssignMonto] = useState("");
  const [assignMetodo, setAssignMetodo] = useState("Efectivo");
  const [renewMonto, setRenewMonto] = useState("");
  const [renewMetodo, setRenewMetodo] = useState("Efectivo");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // ¿tiene plan activo? => bloquea pagos
  const bloqueoPagos = useMemo(() => {
    if (!infoMembresia) return false;
    return (
      infoMembresia.estado === "activa" &&
      Number(infoMembresia.dias_restantes ?? 0) >= 0
    );
  }, [infoMembresia]);

  const guardIfBlocked = () => {
    if (!clienteId) {
      setMsg("⚠️ Debes seleccionar un cliente.");
      return true;
    }
    if (bloqueoPagos) {
      setMsg(
        `⚠️ El cliente ya tiene una membresía activa (vence ${infoMembresia?.fecha_fin}). ` +
          "No se pueden registrar nuevos pagos hasta que venza."
      );
      return true;
    }
    return false;
  };

  const asignarConPago = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (guardIfBlocked()) return;
    if (!membresiaId || !assignMonto) {
      setMsg("⚠️ Selecciona un plan e ingresa el monto.");
      return;
    }

    setLoading(true);
    try {
      await apiPagarYRenovar(Number(clienteId), {
        membresia_id: Number(membresiaId),
        monto: Number(assignMonto),
        metodo_pago: assignMetodo,
      });
      setAssignMonto("");
      setMsg("✅ Asignación + pago realizados");
      onAfterChange?.();
    } catch (err) {
      setMsg("❌ Error al asignar y pagar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renovarConPago = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (guardIfBlocked()) return;
    if (!renewMonto) {
      setMsg("⚠️ Ingresa el monto para renovar.");
      return;
    }

    setLoading(true);
    try {
      await apiPagarYRenovar(Number(clienteId), {
        monto: Number(renewMonto),
        metodo_pago: renewMetodo,
      });
      setRenewMonto("");
      setMsg("✅ Renovación + pago realizados");
      onAfterChange?.();
    } catch (err) {
      setMsg("❌ Error al renovar y pagar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="3) Membresías (asignar / pagar / renovar)">
      {/* Banner informativo del módulo */}
      {!clienteId && (
        <div className="mb-3 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          Selecciona un cliente para habilitar la asignación/renovación.
        </div>
      )}
      {bloqueoPagos && (
        <div className="mb-3 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          ⚠️ El cliente ya tiene una <b>membresía activa</b> (vence el{" "}
          <b>{infoMembresia?.fecha_fin}</b>, quedan{" "}
          <b>{infoMembresia?.dias_restantes}</b> días). No puedes registrar otro
          pago hasta que venza.
        </div>
      )}

      {msg && (
        <div className="mb-2 text-sm p-2 rounded border border-gray-200 bg-white">
          {msg}
        </div>
      )}

      {/* Lista de planes */}
      <div className="mb-4">
        <div className="mb-2 text-xs text-gray-600">Membresías disponibles</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {membresias.map((m) => (
            <label
              key={m.membresia_id}
              className={`border rounded p-2 flex items-center gap-2 bg-gray-50 cursor-pointer ${
                bloqueoPagos ? "opacity-60 cursor-not-allowed" : ""
              }`}
              title={bloqueoPagos ? "Bloqueado por membresía activa" : ""}
            >
              <input
                type="radio"
                name="plan"
                value={m.membresia_id}
                onChange={(e) => setMembresiaId(e.target.value)}
                checked={String(m.membresia_id) === String(membresiaId)}
                disabled={bloqueoPagos}
              />
              <div className="text-sm">
                <div className="font-medium text-gray-900">{m.nombre}</div>
                <div className="text-xs text-gray-600">
                  {m.duracion_dias} días · ${m.precio}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ASIGNAR (nuevo plan) + pago */}
        <form
          onSubmit={asignarConPago}
          className="border rounded-xl p-4 bg-white shadow-sm"
        >
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Asignar membresía (nuevo plan) + pago
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input
              className="border rounded px-3 py-2 text-sm w-full sm:w-28"
              type="number"
              placeholder="Monto"
              value={assignMonto}
              onChange={(e) => setAssignMonto(e.target.value)}
              disabled={bloqueoPagos}
            />
            <select
              className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
              value={assignMetodo}
              onChange={(e) => setAssignMetodo(e.target.value)}
              disabled={bloqueoPagos}
            >
              <option>Efectivo</option>
              <option>Tarjeta</option>
              <option>Transferencia</option>
            </select>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm w-full sm:w-auto disabled:opacity-60"
              disabled={
                loading ||
                !clienteId ||
                !membresiaId ||
                !assignMonto ||
                bloqueoPagos
              }
              title={bloqueoPagos ? "Bloqueado por membresía activa" : ""}
            >
              {loading ? "Procesando..." : "Asignar + pagar"}
            </button>
          </div>
        </form>

        {/* RENOVAR plan + pago */}
        <form
          onSubmit={renovarConPago}
          className="border rounded-xl p-4 bg-white shadow-sm"
        >
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Renovar membresía actual + pago
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input
              className="border rounded px-3 py-2 text-sm w-full sm:w-28"
              type="number"
              placeholder="Monto"
              value={renewMonto}
              onChange={(e) => setRenewMonto(e.target.value)}
              disabled={bloqueoPagos}
            />
            <select
              className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
              value={renewMetodo}
              onChange={(e) => setRenewMetodo(e.target.value)}
              disabled={bloqueoPagos}
            >
              <option>Efectivo</option>
              <option>Tarjeta</option>
              <option>Transferencia</option>
            </select>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white rounded px-4 py-2 text-sm w-full sm:w-auto disabled:opacity-60"
              disabled={
                loading ||
                !clienteId ||
                !renewMonto ||
                bloqueoPagos ||
                (infoMembresia && infoMembresia.estado === "sin_membresia")
              }
              title={bloqueoPagos ? "Bloqueado por membresía activa" : ""}
            >
              {loading ? "Procesando..." : "Renovar + pagar"}
            </button>
          </div>
        </form>
      </div>
    </Section>
  );
}
