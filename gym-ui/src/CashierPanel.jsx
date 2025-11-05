// src/CashierPanel.jsx
import { useMemo, useState } from "react";
import Section from "./components/Section";
import SearchClient from "./components/clients/SearchClient";
import ClientSummary from "./components/clients/ClientSummary";
import MembershipAssignRenew from "./components/memberships/MembershipAssignRenew";
import CreateMembershipForm from "./components/memberships/CreateMembershipForm";
import TodayEntries from "./components/attendance/TodayEntries";
import Cashbox from "./components/cash/Cashbox";
import UpcomingExpirations from "./components/expirations/UpcomingExpirations";

import { useClientes } from "./hooks/useClientes";
import { useMembresias } from "./hooks/useMembresias";
import { useMembresiaActiva } from "./hooks/useMembresiaActiva";
import { useAsistenciasHoy } from "./hooks/useAsistenciasHoy";
import { usePagosHoy } from "./hooks/usePagosHoy";
import { useVencimientos } from "./hooks/useVencimientos";

export default function CashierPanel() {
  const [clienteId, setClienteId] = useState("");

  const { clientes, crearCliente } = useClientes();
  const { membresias, crearMembresia } = useMembresias();
  const { items: asistencias, marcarEntrada, posting } = useAsistenciasHoy();
  const { pagos, resumen, fetchPagos } = usePagosHoy();
  const { vencimientos, fetchVencimientos } = useVencimientos();
  const { info, activa } = useMembresiaActiva(clienteId);

  const clienteSel = useMemo(
    () => clientes.find((c) => String(c.cliente_id) === String(clienteId)),
    [clientes, clienteId]
  );

  // anti-doble entrada (usa asistencias ya cargadas)
  const hit = asistencias.find((a) => String(a.cliente_id) === String(clienteId));
  const yaEntroHoy = !!hit;
  const horaPrimeraEntrada = hit?.hora || "";

  const onEntrada = async () => {
    const r = await marcarEntrada(Number(clienteId));
    if (r.ok) return;
    // mensajes se muestran en ClientSummary con el botón deshabilitado (por yaEntroHoy)
  };

  const refreshAfterPayment = async () => {
    await fetchPagos();
    await fetchVencimientos();
  };

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">🏋️ Panel Cajero — Gimnasio</h1>

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

      {/* 2) Crear cliente (simplemente reusa tu formulario actual si lo deseas).
          Puedes mantener el tuyo o hacer un componente similar a CreateMembershipForm. */}

      <MembershipAssignRenew
        clienteId={clienteId}
        membresias={membresias}
        infoMembresia={info}
        onAfterChange={refreshAfterPayment}
      />

      <CreateMembershipForm onCreate={crearMembresia} />

      <TodayEntries items={asistencias} />

      <Cashbox resumen={resumen} pagos={pagos} />

      <UpcomingExpirations items={vencimientos} />

      <footer className="text-[11px] text-gray-500 text-center mt-10">v0.7 · Caja / Recepción</footer>
    </div>
  );
}
