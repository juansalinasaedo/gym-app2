// src/CashierPanel.jsx
import React, { useMemo, useState, useEffect } from "react";
import Section from "./components/Section";
import SearchClient from "./components/clients/SearchClient";
import ClientSummary from "./components/clients/ClientSummary";
import CreateClientForm from "./components/clients/CreateClientForm";
import MembershipAssignRenew from "./components/memberships/MembershipAssignRenew";
import CreateMembershipForm from "./components/memberships/CreateMembershipForm";
import TodayEntries from "./components/attendance/TodayEntries";
import QrCheckin from "./components/attendance/QrCheckin"; 
import QrCameraCheckin from "./components/attendance/QrCameraCheckin"; 
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

// NUEVOS IMPORTS
import DashboardSummary from "./components/dashboard/DashboardSummary";
import CashClosing from "./components/cash/CashClosing";

export default function CashierPanel() {
  const [clienteId, setClienteId] = useState("");
  const [msg, setMsg] = useState(null);

  const { user, isAdmin, ready, logout } = useAuth();

  const { clientes = [], crearCliente } = useClientes();
  const { membresias = [], crearMembresia } = useMembresias();
  const [checkinMode, setCheckinMode] = useState("manual"); // "manual" | "camera"
  const {
    items: asistencias = [],
    marcarEntrada,
    posting,
    fetchAsistencias,   // <--- NUEVO
  } = useAsistenciasHoy();
  const {
    pagos = [],
    resumen = {
      total_general: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
    },
    fetchPagos,
  } = usePagosHoy();
  const { vencimientos = [], fetchVencimientos } = useVencimientos();
  const { info = null, activa = false } = useMembresiaActiva(clienteId || null);

  useEffect(() => {
    setMsg(null);
  }, [clienteId]);

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
  const showActiva =
    !!info && info.estado === "activa" && Number(info.dias_restantes ?? 0) >= 0;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-base text-gym-text-muted">
        Cargando sesión…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Aumentamos padding general y tamaño base de letra */}
      <div className="px-6 py-8 max-w-6xl mx-auto text-[15px] md:text-[16px]">
        {/* Header interno del panel */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gym-text-main flex items-center gap-2">
            <span>🏋️</span>
            <span>Panel — Gimnasio</span>
          </h1>

          <div className="text-sm">
            {user ? (
              <div className="flex items-center gap-3">
                {/* 🔄 Botón de recarga */}
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-md bg-white border border-gym-border text-gym-text-main text-[13px] font-semibold hover:bg-slate-100 flex items-center gap-1"
                >
                  <span>↻</span>
                  <span>Recargar</span>
                </button>

                <span className="px-4 py-2 rounded-md bg-gym-dark text-white flex items-center gap-2 text-[13px]">
                  <span>{user.name}</span>
                  <span className="opacity-80">—</span>
                  <span className="font-semibold uppercase">{user.role}</span>
                </span>

                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-md bg-white border border-gym-border text-gym-text-main text-[13px] font-semibold hover:bg-slate-100"
                >
                  Salir
                </button>
              </div>
            ) : (
              <span className="px-3 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900">
                No autenticado
              </span>
            )}
          </div>
        </div>

        {/* DASHBOARD INICIAL */}
        <DashboardSummary />

        {/* Mensajes globales */}
        {msg && (
          <div className="mb-4 flex items.start gap-2 rounded-md border border-gym-danger bg-rose-50 px-4 py-3 text-sm text-gym-danger">
            <span className="mt-0.5">⚠️</span>
            <p>{msg}</p>
          </div>
        )}

        {showClienteNoSel && (
          <div className="mb-4 flex items.start gap-2 rounded-md border border-gym-info bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <span className="mt-0.5">ℹ️</span>
            <p>
              Selecciona un cliente con el buscador o crea uno nuevo para habilitar los
              módulos.
            </p>
          </div>
        )}

        {showActiva && (
          <div className="mb-4 flex items.start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="mt-0.5">⚠️</span>
            <p>
              El cliente ya tiene una <b>membresía activa</b> (vence el{" "}
              <b>{info.fecha_fin}</b>, quedan <b>{info.dias_restantes}</b> días). No se
              pueden registrar nuevos pagos hasta que venza.
            </p>
          </div>
        )}

        {/* 1) Buscar Cliente */}
        <div id="sec-buscar">
          <Section
            title="1) Buscar Cliente"
            subtitle="Ingresa la información del usuario."
            variant="card"
            icon="🔍"
            hover
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-1">
              <SearchClient
                clientes={clientes}
                value={clienteId}
                onSelect={setClienteId}
              />
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
        </div>

        {/* 3) Membresías: solo si hay cliente seleccionado
            Y NO tiene una membresía activa vigente */}
        {clienteId && !showActiva && (
          <div id="sec-membresias">
            <Section
              title="3) Membresías"
              subtitle="Asigna, renueva y cobra planes de membresía."
              variant="leftPrimary"
              icon="💳"
              hover
            >
              <MembershipAssignRenew
                clienteId={clienteId}
                membresias={membresias}
                infoMembresia={info}
                onAfterChange={refreshAfterPayment}
              />
            </Section>
          </div>
        )}

        {/* 5) Check-in rápido por QR */}
        <div id="sec-qr">
        <Section
          title="Check-in rápido por QR"
          subtitle="Escanea el código QR del cliente para marcar su entrada."
          variant="soft"
          icon="📲"
          hover
        >
          {/* Selector de modo */}
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="text-gray-600">Modo:</span>
            <button
              type="button"
              onClick={() => setCheckinMode("manual")}
              className={
                "px-2 py-1 rounded border text-xs " +
                (checkinMode === "manual"
                  ? "border-gym-primary text-white bg-gym-primary"
                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
              }
            >
              Entrada manual
            </button>
            <button
              type="button"
              onClick={() => setCheckinMode("camera")}
              className={
                "px-2 py-1 rounded border text-xs " +
                (checkinMode === "camera"
                  ? "border-gym-primary text-white bg-gym-primary"
                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
              }
            >
              Cámara
            </button>
          </div>

          {/* Contenido según modo */}
          {checkinMode === "manual" ? (
            <QrCheckin onSuccess={fetchAsistencias} />
          ) : (
            <QrCameraCheckin onSuccess={fetchAsistencias} />
          )}
        </Section>
      </div>

        {/* 2) Registrar Nuevo Cliente */}
        <div id="sec-registrar">
          <Section
            title="2) Registrar Nuevo Cliente"
            subtitle="Completa los datos para crear un nuevo cliente."
            variant="highlight"
            icon="🧍"
            hover
          >
            <CreateClientForm
              onCreate={crearCliente}
              setMsg={setMsg}
              onCreated={(newId) => {
                if (newId) setClienteId(String(newId));
              }}
            />
          </Section>
        </div>

        {/* 4) Crear Plan — SOLO ADMIN */}
        {isAdmin && (
          <div id="sec-crearplan">
            <Section
              title="4) Crear Plan (admin)"
              subtitle="Crea o actualiza planes disponibles para el gimnasio."
              variant="soft"
              icon="📊"
              hover
            >
              <CreateMembershipForm onCreate={crearMembresia} />
            </Section>
          </div>
        )}

        {/* 6) Entradas de hoy */}
        <div id="sec-asistencia">
          <Section
            title="6) Entradas de hoy"
            subtitle="Listado de clientes que han ingresado al gimnasio en la jornada."
            variant="soft"
            icon="✅"
            hover
          >
            <TodayEntries items={asistencias} />
          </Section>
        </div>

        {/* 7) Caja del día */}
        {isAdmin && (
          <div id="sec-caja">
            <Section
              title="6) Caja del día"
              subtitle="Resumen de pagos y totales registrados en la jornada."
              variant="card"
              icon="💰"
              hover
            >
              <Cashbox resumen={resumen} pagos={pagos} />

              {/* NUEVO: CIERRE DE CAJA */}
              <CashClosing resumen={resumen} onClosed={refreshAfterPayment} />
            </Section>
          </div>
        )}

        {/* 8) Vencimientos próximos */}
        <div id="sec-vencimientos">
          <Section
            title="7) Vencimientos próximos"
            subtitle="Membresías que están por vencer, ideal para fidelizar clientes."
            variant="warning"
            icon="⏰"
            hover
          >
            <UpcomingExpirations items={vencimientos} />
          </Section>
        </div>

        {/* 9) Reportes */}
        <div id="sec-reportes">
          <Section
            title="8) Reportes"
            subtitle="Exporta información de pagos y asistencias para análisis."
            variant="card"
            icon="📂"
            hover
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PaymentsExport />
              <AssistsRange />
            </div>
          </Section>
        </div>

        <footer className="text-xs text-gym-text-muted text-center mt-10">
          v0.8 · Caja / Recepción
        </footer>
      </div>
    </div>
  );
}
