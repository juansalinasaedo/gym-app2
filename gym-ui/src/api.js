// src/api.js
const API_BASE = import.meta.env.VITE_API_BASE || "";
const json = { "Content-Type": "application/json" };

// -------- helpers ----------
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      if (ct.includes("application/json")) {
        const j = await res.json();
        msg = j?.detail || j?.error || msg;
      } else {
        msg = await res.text();
      }
    } catch {}
    throw new Error(msg);
  }
  return ct.includes("application/json") ? res.json() : res;
}

async function doJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: json,
    credentials: "include",
    ...opts,
  });
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      if (ct.includes("application/json")) {
        const j = await res.json();
        msg = j?.detail || j?.error || msg;
      } else {
        msg = await res.text();
      }
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/* ===== Auth ===== */
export async function apiLogin(email, password) {
  return doJson(`${API_BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
export async function apiLogout() {
  return doJson(`${API_BASE}/auth/logout`, { method: "POST" });
}
export async function apiMe() {
  return doJson(`${API_BASE}/auth/me`);
}

/* ===== Admin usuarios ===== */
export async function apiUsersList() {
  return doJson(`${API_BASE}/auth/users`);
}
export async function apiUsersCreate(payload) {
  return doJson(`${API_BASE}/auth/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function apiUsersToggle(userId, enabled) {
  return doJson(`${API_BASE}/auth/users/${userId}/enable`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}
export async function apiUsersDelete(userId) {
  return doJson(`${API_BASE}/auth/users/${userId}`, { method: "DELETE" });
}
// Resetear password de un usuario (solo admin)
export async function apiUsersResetPassword(userId, password) {
  return doJson(`${API_BASE}/auth/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

/* ===== Clientes ===== */
export async function apiGetClientes() {
  return fetchJson(`${API_BASE}/api/clientes`);
}
export async function apiCrearCliente(payload) {
  return fetchJson(`${API_BASE}/api/clientes`, {
    method: "POST",
    headers: json,
    body: JSON.stringify(payload),
  });
}

/* ===== Membresías ===== */
export async function apiGetMembresias() {
  return fetchJson(`${API_BASE}/api/membresias`);
}
export async function apiCrearMembresia(payload) {
  return fetchJson(`${API_BASE}/api/membresias`, {
    method: "POST",
    headers: json,
    body: JSON.stringify(payload),
  });
}
export async function apiGetMembresiaActiva(clienteId) {
  return fetchJson(`${API_BASE}/api/clientes/${clienteId}/membresias/activa`);
}

/* ===== Asignar/Renovar + Pago ===== */
export async function apiPagarYRenovar(clienteId, body) {
  return fetchJson(
    `${API_BASE}/api/clientes/${clienteId}/pagos/pagar_y_renovar`,
    {
      method: "POST",
      headers: json,
      body: JSON.stringify(body),
    }
  );
}

/* ===== Asistencias ===== */
export async function apiGetAsistenciasHoy() {
  return fetchJson(`${API_BASE}/api/asistencias/hoy`);
}

export async function apiMarcarAsistencia(clienteId, tipo = "entrada") {
  // sanity checks
  if (clienteId === undefined || clienteId === null || `${clienteId}`.trim() === "") {
    throw new Error("clienteId vacío");
  }
  const cid = Number(clienteId);
  if (Number.isNaN(cid)) {
    throw new Error("clienteId no numérico");
  }

  const res = await fetch(`${API_BASE}/api/asistencias`, {
    method: "POST",
    credentials: "include",
    headers: json,
    // Enviamos ambas claves por compatibilidad con el backend
    body: JSON.stringify({ cliente_id: cid, clienteId: cid, tipo: tipo || "entrada" }),
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      if (ct.includes("application/json")) {
        const j = await res.json();
        msg = j?.detail || j?.error || msg;
      } else {
        msg = await res.text();
      }
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function apiAsistenciasRango(desde, hasta) {
  const qs = new URLSearchParams({ from: desde, to: hasta }).toString();
  return fetchJson(`${API_BASE}/api/asistencias/rango?${qs}`);
}
export function apiAsistenciasRangoExcelUrl(desde, hasta) {
  const qs = new URLSearchParams({ desde, hasta }).toString();
  return `${API_BASE}/api/asistencias/rango/excel?${qs}`;
}

/* ===== Pagos / Caja ===== */
export async function apiGetPagosHoy() {
  return fetchJson(`${API_BASE}/api/pagos/hoy`);
}
// src/api.js
export async function apiExportPagosExcel(desde, hasta) {
  const params = new URLSearchParams();
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);

  const res = await fetch(
    `${API_BASE}/api/reportes/pagos_excel?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Error al generar Excel");
  }

  return await res.blob();
}

/* ===== Vencimientos ===== */
export async function apiGetVencimientosProximos() {
  return fetchJson(`${API_BASE}/api/vencimientos_proximos`);
}
