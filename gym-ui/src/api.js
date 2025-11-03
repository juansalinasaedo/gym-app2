// src/api.js

// Si existe VITE_API_BASE (por ejemplo en .env), se usa esa URL absoluta.
// En desarrollo, el proxy del vite.config.js maneja "/api" directamente.
const BASE = import.meta.env.VITE_API_BASE || "/api";

// Helper genérico para manejar errores y validar JSON
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }

  // Si no es JSON, probablemente devolvió HTML (por error de proxy)
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    console.error("⚠️ Respuesta no-JSON desde", url, "\n", txt);
    throw new Error("Respuesta no válida (no es JSON)");
  }

  return res.json();
}

// ---- CLIENTES ----
export async function apiGetClientes() {
  return fetchJSON(`${BASE}/clientes`);
}

export async function apiCrearCliente(payload) {
  return fetchJSON(`${BASE}/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---- MEMBRESÍAS ----
export async function apiGetMembresias() {
  return fetchJSON(`${BASE}/membresias`);
}

export async function apiCrearMembresia(payload) {
  return fetchJSON(`${BASE}/membresias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---- MEMBRESÍA ACTIVA ----
export async function apiGetMembresiaActiva(clienteId) {
  return fetchJSON(`${BASE}/clientes/${clienteId}/membresias/activa`);
}

// ---- PAGOS ----
export async function apiGetPagosHoy() {
  return fetchJSON(`${BASE}/pagos/hoy`);
}

export async function apiPagarYRenovar(clienteId, body) {
  return fetchJSON(`${BASE}/clientes/${clienteId}/pagos/pagar_y_renovar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---- ASISTENCIAS ----
export async function apiGetAsistenciasHoy() {
  return fetchJSON(`${BASE}/asistencias/hoy`);
}

export async function apiMarcarAsistencia(body) {
  return fetchJSON(`${BASE}/asistencias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---- VENCIMIENTOS PRÓXIMOS ----
export async function apiGetVencimientosProximos() {
  return fetchJSON(`${BASE}/vencimientos_proximos`);
}
