// src/CashierPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  apiGetClientes,
  apiCrearCliente,
  apiGetMembresias,
  apiCrearMembresia,
  apiPagarYRenovar,
  apiMarcarAsistencia,
  apiGetMembresiaActiva,
  apiGetAsistenciasHoy,
  apiGetPagosHoy,
  apiGetVencimientosProximos,
} from "./api";

const Section = ({ title, children }) => (
  <div className="rounded-2xl shadow bg-white p-4 border border-gray-200 mb-5">
    <h2 className="text-lg font-semibold mb-3 text-gray-800">{title}</h2>
    {children}
  </div>
);

/* ===== Utilidades RUT ===== */
function formatRUT(value) {
  const clean = (value || "").replace(/[^\dkK]/g, "").toUpperCase();
  if (clean.length <= 1) return clean;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const cuerpoFmt =
    cuerpo
      .split("")
      .reverse()
      .join("")
      .match(/.{1,3}/g)
      ?.join(".")
      .split("")
      .reverse()
      .join("") || cuerpo;
  return `${cuerpoFmt}-${dv}`;
}

function validarRUT(rutCompleto) {
  if (!rutCompleto || !rutCompleto.includes("-")) return false;
  const [cuerpoRaw, dvRaw] = rutCompleto.split("-");
  const cuerpo = cuerpoRaw.replace(/\./g, "");
  const dv = dvRaw.toUpperCase();

  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : `${resto}`;
  return dv === dvEsperado;
}

// Normalizadores para el buscador
const norm = (s = "") =>
  s.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const rutDigits = (s = "") => s.replace(/[^\dkK]/g, "").toUpperCase();

export default function CashierPanel() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // --------- Clientes ----------
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteForm, setClienteForm] = useState({
    nombre: "",
    apellido: "",
    rut: "",
    email: "",
  });
  const [rutError, setRutError] = useState(false);

  // Autocomplete
  const [buscaQ, setBuscaQ] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [hiIndex, setHiIndex] = useState(-1);

  // info de la membresía activa del cliente seleccionado
  const [infoMembresia, setInfoMembresia] = useState(null);

  // --------- Membresías ----------
  const [membresias, setMembresias] = useState([]);
  const [membresiaId, setMembresiaId] = useState("");

  const [membresiaNueva, setMembresiaNueva] = useState({
    nombre: "",
    descripcion: "",
    duracion_dias: 30,
    precio: 25000,
  });

  // --------- Asignar/Renovar + Pago ----------
  const [assignMonto, setAssignMonto] = useState("");
  const [assignMetodo, setAssignMetodo] = useState("Efectivo");
  const [renewMonto, setRenewMonto] = useState("");
  const [renewMetodo, setRenewMetodo] = useState("Efectivo");

  // --------- Caja del día ----------
  const [pagosHoy, setPagosHoy] = useState([]);
  const [resumenCaja, setResumenCaja] = useState({
    total_general: 0,
    total_efectivo: 0,
    total_tarjeta: 0,
    total_transferencia: 0,
  });

  // --------- Asistencias ----------
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [loadingEntradaRapida, setLoadingEntradaRapida] = useState(false);

  // --------- Vencimientos próximos (≤3 días) ----------
  const [vencimientos, setVencimientos] = useState([]);

  /* =======================
   * Fetchers
   * ======================= */
  async function fetchClientes() {
    try {
      const data = await apiGetClientes();
      setClientes(data);
    } catch (err) {
      console.error(err);
      setMsg(`❌ ${err.message || "Error al asignar y pagar"}`);
    }
  }

  async function fetchMembresias() {
    try {
      const data = await apiGetMembresias();
      setMembresias(data);
    } catch (err) {
      console.error("Error cargando membresías:", err);
      setMsg("❌ Error al cargar membresías");
    }
  }

  async function fetchInfoMembresiaActiva(id) {
    try {
      const data = await apiGetMembresiaActiva(id);
      setInfoMembresia(data);
    } catch (err) {
      console.error("Error obteniendo membresía activa:", err);
      setInfoMembresia(null);
    }
  }

  async function fetchPagosHoy() {
    try {
      const data = await apiGetPagosHoy();
      setPagosHoy(data.pagos || []);
      setResumenCaja(
        data.resumen || {
          total_general: 0,
          total_efectivo: 0,
          total_tarjeta: 0,
          total_transferencia: 0,
        }
      );
    } catch (err) {
      console.error("Error cargando pagos de hoy:", err);
    }
  }

  async function fetchAsistenciasHoy() {
    try {
      const data = await apiGetAsistenciasHoy();
      setAsistenciasHoy(data);
    } catch (err) {
      console.error("Error cargando asistencias de hoy:", err);
    }
  }

  async function fetchVencimientosProximos() {
    try {
      const data = await apiGetVencimientosProximos();
      setVencimientos(data.vencimientos || []);
    } catch (err) {
      console.error("Error cargando vencimientos próximos:", err);
    }
  }

  /* =======================
   * Crear/actualizar
   * ======================= */
  async function crearCliente(e) {
    e.preventDefault();
    const rutValido = validarRUT(clienteForm.rut);
    if (!rutValido) {
      setRutError(true);
      setMsg("🚫 RUT inválido. Verifica el dígito verificador.");
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await apiCrearCliente(clienteForm);
      setMsg("✅ Cliente creado");
      setClienteForm({ nombre: "", apellido: "", rut: "", email: "" });
      setRutError(false);
      await fetchClientes();
    } catch (err) {
      console.error(err);
      setMsg("❌ Error al crear cliente");
    } finally {
      setLoading(false);
    }
  }

  async function asignarConPago(e) {
    e.preventDefault();
    if (!clienteId || !membresiaId) {
      setMsg("❌ Selecciona cliente y un plan para asignar");
      return;
    }
    if (!assignMonto) {
      setMsg("❌ Ingresa el monto para el pago de asignación");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await apiPagarYRenovar(Number(clienteId), {
        membresia_id: Number(membresiaId),
        monto: Number(assignMonto),
        metodo_pago: assignMetodo,
      });
      setMsg("✅ Asignación + pago realizados");
      setAssignMonto("");
      await fetchInfoMembresiaActiva(clienteId);
      await fetchPagosHoy();
      await fetchVencimientosProximos();
    } catch (err) {
      console.error(err);
      setMsg("❌ Error al asignar y pagar");
    } finally {
      setLoading(false);
    }
  }

  async function renovarConPago(e) {
    e.preventDefault();
    if (!clienteId) {
      setMsg("❌ Selecciona cliente");
      return;
    }
    if (!renewMonto) {
      setMsg("❌ Ingresa el monto para el pago de renovación");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await apiPagarYRenovar(Number(clienteId), {
        monto: Number(renewMonto),
        metodo_pago: renewMetodo,
      });
      setMsg("✅ Renovación + pago realizados");
      setRenewMonto("");
      await fetchInfoMembresiaActiva(clienteId);
      await fetchPagosHoy();
      await fetchVencimientosProximos();
    } catch (err) {
      console.error(err);
      setMsg("❌ Error al renovar y pagar");
    } finally {
      setLoading(false);
    }
  }

  // Entrada rápida
  async function marcarEntradaRapida() {
    if (!clienteId) return;
    setLoadingEntradaRapida(true);
    setMsg(null);
    try {
      await apiMarcarAsistencia({
        cliente_id: Number(clienteId),
        tipo: "entrada",
      });
      setMsg("✅ Entrada registrada");
      await fetchAsistenciasHoy();
    } catch (err) {
      if (err?.response?.status === 403) {
        setMsg("🚫 Acceso denegado: el cliente no tiene membresía activa.");
      } else {
        setMsg("❌ Error al registrar entrada");
      }
      console.error(err);
    } finally {
      setLoadingEntradaRapida(false);
    }
  }

  /* =======================
   * Efectos
   * ======================= */
  useEffect(() => {
    fetchClientes();
    fetchMembresias();
    fetchAsistenciasHoy();
    fetchPagosHoy();
    fetchVencimientosProximos();
  }, []);

  // info del cliente seleccionado
  const clienteSel = useMemo(
    () => clientes.find((c) => String(c.cliente_id) === String(clienteId)),
    [clientes, clienteId]
  );

  // Membresía activa -> para mostrar botón de entrada
  const tieneMembresiaActiva =
    !!infoMembresia &&
    infoMembresia.estado === "activa" &&
    Number(infoMembresia.dias_restantes) >= 0;

  // Cargar membresía activa cuando cambia clienteId
  useEffect(() => {
    if (!clienteId) {
      setInfoMembresia(null);
      return;
    }
    fetchInfoMembresiaActiva(clienteId);
  }, [clienteId]);

  // Sugerencias (máx 10)
  const sugerencias = useMemo(() => {
    const q = buscaQ.trim();
    if (!q) return [];
    const qNorm = norm(q);
    const qDigits = rutDigits(q);

    return clientes
      .filter((c) => {
        const name = norm(`${c.nombre} ${c.apellido}`);
        const r = rutDigits(c.rut);
        const byName = name.includes(qNorm);
        const byRutStarts = qDigits && r.startsWith(qDigits);
        return byName || byRutStarts;
      })
      .slice(0, 10);
  }, [buscaQ, clientes]);

  // Reflejar cliente elegido en el textbox
  useEffect(() => {
    const c = clientes.find((x) => String(x.cliente_id) === String(clienteId));
    if (c) setBuscaQ(`${c.nombre} ${c.apellido} (${c.rut})`);
  }, [clienteId, clientes]);

  function seleccionarCliente(c) {
    setClienteId(String(c.cliente_id));
    setBuscaQ(`${c.nombre} ${c.apellido} (${c.rut})`);
    setShowSug(false);
    setHiIndex(-1);
  }

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">🏋️ Panel Cajero — Gimnasio</h1>

      {msg && (
        <div className="mb-4 p-3 rounded-md border border-gray-300 bg-white text-sm">{msg}</div>
      )}

      {/* 1) Buscar Cliente */}
      <Section title="1) Buscar Cliente">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="relative">
            <label className="block text-xs mb-1 text-gray-600">
              Buscar cliente (nombre o RUT)
            </label>

            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              placeholder="Ej: 'Juan' o '15777461-6'"
              value={buscaQ}
              onChange={(e) => {
                setBuscaQ(e.target.value);
                setShowSug(true);
                setHiIndex(-1);
              }}
              onFocus={() => setShowSug(true)}
              onKeyDown={(e) => {
                if (!showSug || sugerencias.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHiIndex((i) => (i + 1) % sugerencias.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHiIndex((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const c = hiIndex >= 0 ? sugerencias[hiIndex] : sugerencias[0];
                  if (c) seleccionarCliente(c);
                } else if (e.key === "Escape") {
                  setShowSug(false);
                }
              }}
            />

            {showSug && sugerencias.length > 0 && (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto"
              >
                {sugerencias.map((c, idx) => (
                  <li
                    key={c.cliente_id}
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      seleccionarCliente(c);
                    }}
                    onMouseEnter={() => setHiIndex(idx)}
                    className={
                      "px-3 py-2 text-sm cursor-pointer " +
                      (idx === hiIndex ? "bg-gray-100" : "")
                    }
                  >
                    <div className="font-medium text-gray-900">
                      {c.nombre} {c.apellido}
                    </div>
                    <div className="text-xs text-gray-600">{c.rut}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* resumen del cliente + membresía actual + botón Entrada (1 clic) */}
          <div className="md:col-span-2">
            {clienteSel ? (
              <div className="p-3 border rounded h-full flex flex-col gap-3 bg-gray-50 text-xs">
                {/* Datos básicos */}
                <div>
                  <div className="text-gray-900 text-sm font-semibold">
                    {clienteSel.nombre} {clienteSel.apellido}
                  </div>
                  <div className="text-gray-600">
                    Rut {clienteSel.rut} · {clienteSel.email || "sin email"}
                  </div>
                  <div className="text-gray-600">
                    Estado cliente: <span className="font-semibold">{clienteSel.estado}</span>
                  </div>
                </div>

                {/* Bloque membresía actual */}
                <div className="bg-white rounded border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide mb-2">
                        Membresía actual
                      </div>

                      {!infoMembresia || infoMembresia.estado === "sin_membresia" ? (
                        <div className="text-red-600 text-sm font-semibold">
                          Sin membresía activa
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <div className="text-sm font-semibold text-gray-900">
                              {infoMembresia.nombre_plan}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              ${infoMembresia.precio}
                            </div>

                            <span
                              className={
                                "px-2 py-[2px] rounded-full text-[10px] font-semibold " +
                                (infoMembresia.estado === "activa"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                  : "bg-red-100 text-red-700 border border-red-300")
                              }
                            >
                              {infoMembresia.estado === "activa" ? "Activa" : "Vencida"}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                            <div>
                              Inicio:{" "}
                              <span className="font-medium text-gray-800">
                                {infoMembresia.fecha_inicio}
                              </span>
                            </div>
                            <div>
                              Vence:{" "}
                              <span className="font-medium text-gray-800">
                                {infoMembresia.fecha_fin}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-gray-600">Días restantes:</span>

                            <span
                              className={
                                "text-sm font-bold px-2 py-[2px] rounded " +
                                (infoMembresia.dias_restantes >= 0
                                  ? "bg-emerald-600 text-white"
                                  : "bg-red-600 text-white")
                              }
                            >
                              {infoMembresia.dias_restantes}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Botón Entrada visible solo si la membresía está activa */}
                    {tieneMembresiaActiva && (
                      <div className="shrink-0">
                        <button
                          onClick={marcarEntradaRapida}
                          disabled={loadingEntradaRapida}
                          className="bg-gray-900 hover:bg-black text-white rounded px-3 py-2 text-xs"
                          title="Registrar entrada inmediata"
                        >
                          {loadingEntradaRapida ? "Marcando..." : "Entrada (1 clic)"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-xs p-3 border rounded h-full flex items-center bg-gray-50">
                Selecciona un cliente con el buscador o crea uno nuevo.
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 2) Crear Cliente */}
      <Section title="2) Crear Cliente">
        <form onSubmit={crearCliente} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nombre"
            value={clienteForm.nombre}
            onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })}
            required
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Apellido"
            value={clienteForm.apellido}
            onChange={(e) => setClienteForm({ ...clienteForm, apellido: e.target.value })}
            required
          />
          <div className="col-span-1">
            <input
              className={`border rounded px-3 py-2 w-full ${rutError ? "border-red-500" : ""}`}
              placeholder="RUT"
              value={clienteForm.rut}
              onChange={(e) => {
                const formatted = formatRUT(e.target.value);
                setClienteForm({ ...clienteForm, rut: formatted });
                const shouldValidate = formatted.replace(/[^\dkK]/g, "").length > 7;
                setRutError(shouldValidate ? !validarRUT(formatted) : false);
              }}
              required
            />
            {rutError && (
              <div className="text-xs text-red-600 mt-1">
                ⚠️ RUT inválido, verifica el dígito verificador.
              </div>
            )}
          </div>
          <input
            className="border rounded px-3 py-2"
            placeholder="Email"
            value={clienteForm.email}
            onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
          />
          <button
            className="bg-gray-900 text-white rounded px-4 py-2 md:col-span-4 text-sm disabled:opacity-60"
            disabled={loading || rutError}
            title={rutError ? "RUT inválido" : ""}
          >
            {loading ? "Guardando..." : "Crear cliente"}
          </button>
        </form>
      </Section>

      {/* 3) Membresías (asignar / pagar / renovar) */}
      <Section title="3) Membresías (asignar / pagar / renovar)">
        {/* Lista de planes para ASIGNAR */}
        <div className="mb-4">
          <div className="mb-2 text-xs text-gray-600">Membresías disponibles</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {membresias.map((m) => (
              <label
                key={m.membresia_id}
                className="border rounded p-2 flex items-center gap-2 bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="plan"
                  value={m.membresia_id}
                  onChange={(e) => setMembresiaId(e.target.value)}
                  checked={String(m.membresia_id) === String(membresiaId)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ASIGNAR NUEVO PLAN + PAGO */}
          <form onSubmit={asignarConPago} className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              Asignar membresía (nuevo plan) + pago
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Selecciona un plan arriba, ingresa monto y método de pago. Se crea la relación y el
              pago en un solo paso.
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                className="border rounded px-3 py-2 text-sm w-full sm:w-28"
                type="number"
                placeholder="Monto"
                value={assignMonto}
                onChange={(e) => setAssignMonto(e.target.value)}
              />
              <select
                className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                value={assignMetodo}
                onChange={(e) => setAssignMetodo(e.target.value)}
              >
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
              </select>

              <button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm w-full sm:w-auto disabled:opacity-60"
                disabled={loading || !clienteId || !membresiaId || !assignMonto}
                title={
                  !clienteId
                    ? "Selecciona un cliente"
                    : !membresiaId
                    ? "Selecciona una membresía"
                    : !assignMonto
                    ? "Ingresa el monto"
                    : ""
                }
              >
                {loading ? "Procesando..." : "Asignar + pagar"}
              </button>
            </div>
          </form>

          {/* RENOVAR PLAN ACTUAL + PAGO */}
          <form onSubmit={renovarConPago} className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              Renovar membresía actual + pago
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Usa el último plan del cliente. Si no tiene plan previo, esta opción se deshabilita.
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                className="border rounded px-3 py-2 text-sm w-full sm:w-28"
                type="number"
                placeholder="Monto"
                value={renewMonto}
                onChange={(e) => setRenewMonto(e.target.value)}
              />
              <select
                className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                value={renewMetodo}
                onChange={(e) => setRenewMetodo(e.target.value)}
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
                  (infoMembresia && infoMembresia.estado === "sin_membresia")
                }
                title={
                  !clienteId
                    ? "Selecciona un cliente"
                    : infoMembresia && infoMembresia.estado === "sin_membresia"
                    ? "El cliente no tiene plan previo para renovar"
                    : !renewMonto
                    ? "Ingresa el monto"
                    : ""
                }
              >
                {loading ? "Procesando..." : "Renovar + pagar"}
              </button>
            </div>
          </form>
        </div>
      </Section>

      {/* 4) Crear Plan */}
      <Section title="4) Crear Plan">
        <form onSubmit={e => { e.preventDefault(); setLoading(true); setMsg(null);
          apiCrearMembresia({
            ...membresiaNueva,
            duracion_dias: Number(membresiaNueva.duracion_dias),
            precio: Number(membresiaNueva.precio),
          })
            .then(() => {
              setMsg("✅ Membresía creada");
              setMembresiaNueva({ nombre: "", descripcion: "", duracion_dias: 30, precio: 25000 });
              return fetchMembresias();
            })
            .catch(() => setMsg("❌ Error al crear membresía"))
            .finally(() => setLoading(false));
        }} className="border rounded p-3 bg-gray-50">
          <div className="font-medium mb-2 text-sm text-gray-800">Crear nueva membresía</div>
          <input
            className="border rounded px-3 py-2 mb-2 w-full text-sm"
            placeholder="Nombre"
            value={membresiaNueva.nombre}
            onChange={(e) => setMembresiaNueva({ ...membresiaNueva, nombre: e.target.value })}
            required
          />
          <input
            className="border rounded px-3 py-2 mb-2 w-full text-sm"
            placeholder="Descripción"
            value={membresiaNueva.descripcion}
            onChange={(e) =>
              setMembresiaNueva({ ...membresiaNueva, descripcion: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border rounded px-3 py-2 text-sm"
              type="number"
              placeholder="Días"
              value={membresiaNueva.duracion_dias}
              onChange={(e) =>
                setMembresiaNueva({ ...membresiaNueva, duracion_dias: e.target.value })
              }
            />
            <input
              className="border rounded px-3 py-2 text-sm"
              type="number"
              placeholder="Precio"
              value={membresiaNueva.precio}
              onChange={(e) =>
                setMembresiaNueva({ ...membresiaNueva, precio: e.target.value })
              }
            />
          </div>
          <button className="bg-gray-900 text-white rounded px-4 py-2 w-full mt-2 text-sm" disabled={loading}>
            {loading ? "Guardando..." : "Crear plan"}
          </button>
        </form>
      </Section>

      {/* 5) Entraron hoy */}
      <Section title="5) Entraron hoy">
        {asistenciasHoy.length === 0 ? (
          <div className="text-xs text-gray-500">Aún no hay ingresos marcados hoy.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="px-3 py-2 border-b border-gray-200">Hora</th>
                  <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
                  <th className="px-3 py-2 border-b border-gray-200">RUT</th>
                  <th className="px-3 py-2 border-b border-gray-200">ID Cliente</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {asistenciasHoy.map((a) => (
                  <tr key={a.asistencia_id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 border-b border-gray-100 font-semibold text-gray-800">
                      {a.hora}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-700">
                      {a.nombre} {a.apellido}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{a.rut}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-400">#{a.cliente_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] text-gray-400 mt-2">
              Solo se muestran asistencias tipo "entrada" del día actual, ordenadas por hora.
            </div>
          </div>
        )}
      </Section>

      {/* 6) Caja del día */}
      <Section title="6) Caja del día (pagos de hoy)">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4 text-xs">
          <div className="border rounded p-3 bg-gray-50">
            <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">
              Total general
            </div>
            <div className="text-lg font-bold text-gray-900">${resumenCaja.total_general}</div>
          </div>

          <div className="border rounded p-3 bg-gray-50">
            <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">
              Efectivo
            </div>
            <div className="text-lg font-bold text-gray-900">${resumenCaja.total_efectivo}</div>
          </div>

          <div className="border rounded p-3 bg-gray-50">
            <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">
              Tarjeta
            </div>
            <div className="text-lg font-bold text-gray-900">${resumenCaja.total_tarjeta}</div>
          </div>

          <div className="border rounded p-3 bg-gray-50">
            <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">
              Transferencia
            </div>
            <div className="text-lg font-bold text-gray-900">
              ${resumenCaja.total_transferencia}
            </div>
          </div>
        </div>

        {pagosHoy.length === 0 ? (
          <div className="text-xs text-gray-500">Aún no hay pagos registrados hoy.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="px-3 py-2 border-b border-gray-200">Hora</th>
                  <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
                  <th className="px-3 py-2 border-b border-gray-200">RUT</th>
                  <th className="px-3 py-2 border-b border-gray-200">Método</th>
                  <th className="px-3 py-2 border-b border-gray-200">Monto</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {pagosHoy.map((p) => (
                  <tr key={p.pago_id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 border-b border-gray-100 font-semibold text-gray-800">
                      {p.hora}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-700">
                      {p.nombre} {p.apellido}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{p.rut}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{p.metodo_pago}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-900 font-semibold">
                      ${p.monto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] text-gray-400 mt-2">
              Resumen basado en los pagos con fecha de hoy.
            </div>
          </div>
        )}
      </Section>

      {/* 7) Vencimientos próximos (≤3 días) */}
      <Section title="7) Vencimientos próximos (≤3 días)">
        {vencimientos.length === 0 ? (
          <div className="text-xs text-gray-500">No hay membresías por vencer en los próximos 3 días.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
                  <th className="px-3 py-2 border-b border-gray-200">RUT</th>
                  <th className="px-3 py-2 border-b border-gray-200">Plan</th>
                  <th className="px-3 py-2 border-b border-gray-200">Vence</th>
                  <th className="px-3 py-2 border-b border-gray-200">Días restantes</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {vencimientos.map((v) => (
                  <tr key={v.cliente_membresia_id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-800 font-medium">
                      {v.nombre} {v.apellido}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{v.rut}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-700">{v.nombre_plan}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-gray-700">{v.fecha_fin}</td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <span
                        className={
                          "px-2 py-[2px] rounded text-white " +
                          (v.dias_restantes <= 1
                            ? "bg-red-600"
                            : v.dias_restantes === 2
                            ? "bg-orange-500"
                            : "bg-amber-500")
                        }
                      >
                        {v.dias_restantes}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] text-gray-400 mt-2">
              Lista de clientes con plan activo que vence en los próximos 3 días (incluye hoy).
            </div>
          </div>
        )}
      </Section>

      <footer className="text-[11px] text-gray-500 text-center mt-10">v0.6 · Caja / Recepción</footer>
    </div>
  );
}
