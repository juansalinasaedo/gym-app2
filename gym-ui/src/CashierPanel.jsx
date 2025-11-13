// src/CashierPanel.jsx
import React, { useMemo, useState, useEffect } from "react";
import Section from "./components/Section";
import SearchClient from "./components/clients/SearchClient";
import ClientSummary from "./components/clients/ClientSummary";
import CreateClientForm from "./components/clients/CreateClientForm";
import MembershipAssignRenew from "./components/memberships/MembershipAssignRenew";
import CreateMembershipForm from "./components/memberships/CreateMembershipForm";
import TodayEntries from "./components/attendance/TodayEntries";
import Cashbox from "./components/cash/Cashbox";
import UpcomingExpirations from "./components/expirations/UpcomingExpirations";
import PaymentsExport from "./components/reports/PaymentsExport";
import AssistsRange from "./components/reports/AssistsRange";

import { useClientes } from "./hooks/useClientes";
import { useMembresias } from "./hooks/useMembresias";
import { useMembresiaActiva } from "./hooks/useMembresiaActiva";
import { useAsistenciasHoy } from "./hooks/useAsistenciasHoy";
import { usePagosHoy } from "./hooks/usePagosHoy";
import { useVencimientos } from "./hooks/useVencimientos";
import { useAuth } from "./auth/AuthProvider";

export default function CashierPanel() {
  const [clienteId, setClienteId] = useState("");
  const [msg, setMsg] = useState(null);

  const { user, isAdmin, ready, logout } = useAuth();

  const { clientes = [], crearCliente } = useClientes();
  const { membresias = [], crearMembresia } = useMembresias();
  const { items: asistencias = [], marcarEntrada, posting } = useAsistenciasHoy();
  const {
    pagos = [],
    resumen = { total_general: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0 },
    fetchPagos,
  } = usePagosHoy();
  const { vencimientos = [], fetchVencimientos } = useVencimientos();
  const { info = null, activa = false } = useMembresiaActiva(clienteId || null);

  useEffect(() => { setMsg(null); }, [clienteId]);

  const clienteSel = useMemo(
    () => clientes.find((c) => String(c.cliente_id) === String(clienteId)),
    [clientes, clienteId]
  );

  const hit = asistencias.find((a) => String(a.cliente_id) === String(clienteId));
  const yaEntroHoy = !!hit;
  const horaPrimeraEntrada = hit?.hora || "";

  const onEntrada = async () => {
    try {
      const r = await marcarEntrada(Number(clienteId));
      if (!r?.ok && r?.message) setMsg(`⚠️ ${r.message}`);
    } catch (e) {
      setMsg(`❌ Error al registrar entrada: ${e.message}`);
    }
  };

  const refreshAfterPayment = async () => {
    await fetchPagos();
    await fetchVencimientos();
  };

  const showClienteNoSel = !clienteId;
  const showActiva = !!info && info.estado === "activa" && Number(info.dias_restantes ?? 0) >= 0;

  if (!ready) {
    return <div className="p-6 text-sm text-gray-600">Cargando sesión…</div>;
  }

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🏋️ Panel — Gimnasio</h1>
        <div className="text-xs text-gray-600">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-gray-100 border text-gray-700">
                {user.name} — <b>{user.role}</b>
              </span>
              <button onClick={logout} className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50">
                Salir
              </button>
            </div>
          ) : (
            <span className="px-2 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900">
              No autenticado
            </span>
          )}
        </div>
      </div>

      {msg && <div className="mb-4 p-3 rounded-md border border-gray-300 bg-white text-sm">{msg}</div>}

      {showClienteNoSel && (
        <div className="mb-4 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          Selecciona un cliente con el buscador o crea uno nuevo para habilitar los módulos.
        </div>
      )}
      {showActiva && (
        <div className="mb-4 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          ⚠️ El cliente ya tiene una <b>membresía activa</b> (vence el <b>{info.fecha_fin}</b>, quedan{" "}
          <b>{info.dias_restantes}</b> días). No se pueden registrar nuevos pagos hasta que venza.
        </div>
      )}

      {/* 1) Buscar Cliente */}
      <Section title="1) Buscar Cliente">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <SearchClient clientes={clientes} value={clienteId} onSelect={setClienteId} />
          <div className="md:col-span-2">
            <ClientSummary
              cliente={clienteSel}
              infoMembresia={info}
              puedeEntrar={activa}
              onEntrada={onEntrada}
              loadingEntrada={posting}
              yaEntroHoy={yaEntroHoy}
              horaPrimeraEntrada={horaPrimeraEntrada}
            />
          </div>
        </div>
      </Section>

      {/* 2) Registrar Nuevo Cliente */}
      <Section title="2) Registrar Nuevo Cliente">
        <CreateClientForm
          onCreate={crearCliente}
          setMsg={setMsg}
          onCreated={(newId) => {
            if (newId) setClienteId(String(newId));
          }}
          // Si quisieras recarga dura, usa: reloadOnCreate
          // reloadOnCreate
        />
      </Section>

      {/* 3) Membresías */}
      <MembershipAssignRenew
        clienteId={clienteId}
        membresias={membresias}
        infoMembresia={info}
        onAfterChange={refreshAfterPayment}
      />

      {/* 4) Crear Plan — SOLO ADMIN */}
      {isAdmin && (
        <Section title="4) Crear Plan (admin)">
          <CreateMembershipForm onCreate={crearMembresia} />
        </Section>
      )}

      {/* 5) Entraron hoy */}
      <TodayEntries items={asistencias} />

      {/* 6) Caja del día */}
      {isAdmin && (
        <Cashbox resumen={resumen} pagos={pagos} />
      )}
      
      {/* 7) Vencimientos próximos */}
      <UpcomingExpirations items={vencimientos} />

      {/* 8) Reportes */}
      <Section title="8) Reportes">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PaymentsExport />
          <AssistsRange />
        </div>
      </Section>

      <footer className="text-[11px] text-gray-500 text-center mt-10">
        v0.7 · Caja / Recepción
      </footer>
    </div>
  );
}
