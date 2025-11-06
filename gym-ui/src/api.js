// src/api.js
const BASE = import.meta.env.VITE_API_BASE || "/api";

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }

  if (!ct.includes("application/json")) {
    const txt = await res.text();
    console.error("⚠️ Respuesta no-JSON desde", url, "\n", txt);
    throw new Error("Respuesta no válida (no es JSON)");
  }

  return res.json();
}

/* CLIENTES */
export function apiGetClientes() {
  return fetchJSON(`${BASE}/clientes`);
}

export function apiCrearCliente(payload) {
  return fetchJSON(`${BASE}/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* MEMBRESÍAS */
export function apiGetMembresias() {
  return fetchJSON(`${BASE}/membresias`);
}

export function apiCrearMembresia(payload) {
  return fetchJSON(`${BASE}/membresias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function apiGetMembresiaActiva(clienteId) {
  return fetchJSON(`${BASE}/clientes/${clienteId}/membresias/activa`);
}

/* PAGOS */
export function apiGetPagosHoy() {
  return fetchJSON(`${BASE}/pagos/hoy`);
}

export function apiPagarYRenovar(clienteId, body) {
  return fetchJSON(`${BASE}/clientes/${clienteId}/pagos/pagar_y_renovar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ASISTENCIAS */
export function apiGetAsistenciasHoy() {
  return fetchJSON(`${BASE}/asistencias/hoy`);
}

export async function apiMarcarAsistencia(body) {
  const res = await fetch(`${BASE}/asistencias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch (e) {
    // Algunos backends/proxy devuelven cuerpo vacío en errores: evitamos el "catch" vacío
    payload = null;
  }

  if (!res.ok) {
    const err = new Error(payload?.error || `POST /asistencias ${res.status}`);
    err.status = res.status;
    err.data = payload;
    throw err;
  }
  return payload;
}

/* VENCIMIENTOS PRÓXIMOS */
export function apiGetVencimientosProximos() {
  return fetchJSON(`${BASE}/vencimientos_proximos`);
}
