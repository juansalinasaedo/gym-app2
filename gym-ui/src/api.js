// src/api.js
export const API_BASE = import.meta.env.VITE_API_BASE || "";

// -------------------- helpers --------------------
const JSON_HEADERS = { "Content-Type": "application/json" };

// Si usas auth por cookie (session), esto basta.
// Si en el futuro agregas Bearer token, puedes extender acá.
function authHeaders() {
  return {};
}

function normalizeDateInput(s) {
  // acepta "YYYY-MM-DD" o "DD-MM-YYYY"
  if (!s) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return str; // deja tal cual si viene en otro formato
}

async function readJsonSafe(res) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: {
      ...authHeaders(),
      ...(opts.headers || {}),
    },
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.error ||
      data?.message ||
      (await res.text().catch(() => "")) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // si no vino JSON, devolvemos null (para endpoints que no son JSON)
  return data;
}

export async function doJson(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: {
      ...JSON_HEADERS,
      ...authHeaders(),
      ...(opts.headers || {}),
    },
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.error ||
      data?.message ||
      (await res.text().catch(() => "")) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

async function downloadBlob(url) {
  const res = await fetch(url, { method: "GET", credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.blob();
}

function qsFromRange(from, to) {
  const f = normalizeDateInput(from);
  const t = normalizeDateInput(to);
  const params = new URLSearchParams();
  if (f) params.set("from", f);
  if (t) params.set("to", t);
  return params.toString();
}

// -------------------- AUTH --------------------
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
  // tu backend responde OK con GET, pero si lo tienes como POST igual funciona con doJson.
  return fetchJson(`${API_BASE}/auth/me`);
}

// -------------------- CLIENTES --------------------
export async function apiGetClientes() {
  return fetchJson(`${API_BASE}/api/clientes`);
}
export async function apiCrearCliente(payload) {
  return doJson(`${API_BASE}/api/clientes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function apiGetCliente(clienteId) {
  return fetchJson(`${API_BASE}/api/clientes/${clienteId}`);
}
export async function apiUpdateCliente(clienteId, payload) {
  return doJson(`${API_BASE}/api/clientes/${clienteId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// -------------------- MEMBRESÍAS --------------------
export async function apiGetMembresias() {
  return fetchJson(`${API_BASE}/api/membresias`);
}
export async function apiCrearMembresia(payload) {
  return doJson(`${API_BASE}/api/membresias`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function apiUpdateMembresia(membresiaId, payload) {
  return doJson(`${API_BASE}/api/membresias/${membresiaId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export async function apiDeleteMembresia(membresiaId) {
  return fetchJson(`${API_BASE}/api/membresias/${membresiaId}`, {
    method: "DELETE",
  });
}
// alias por compatibilidad si en el front llamas "apiEliminarMembresia"
export const apiEliminarMembresia = apiDeleteMembresia;

export async function apiGetMembresiaActiva(clienteId) {
  return fetchJson(`${API_BASE}/api/clientes/${clienteId}/membresias/activa`);
}

export async function apiPagarYRenovar(payload) {
  return doJson(`${API_BASE}/api/membresias/pagar-renovar`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------- ASISTENCIAS --------------------
export async function apiGetAsistenciasHoy() {
  return fetchJson(`${API_BASE}/api/asistencias/hoy`);
}

export async function apiMarcarAsistencia(payload) {
  return doJson(`${API_BASE}/api/asistencias`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiMarcarAsistenciaQR(payload) {
  return doJson(`${API_BASE}/api/asistencias/qr`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// OJO: el backend espera from/to (YYYY-MM-DD). :contentReference[oaicite:2]{index=2}
export async function apiAsistenciasRango(from, to) {
  const qs = qsFromRange(from, to);
  if (!qs.includes("from=") || !qs.includes("to=")) {
    throw new Error("from_and_to_required");
  }
  return fetchJson(`${API_BASE}/api/asistencias/rango?${qs}`);
}

// -------------------- PAGOS / CAJA --------------------
export async function apiGetPagosHoy() {
  return fetchJson(`${API_BASE}/api/pagos/hoy`);
}

export async function apiGetCierreHoy() {
  return fetchJson(`${API_BASE}/api/caja/cierre/hoy`);
}

export async function apiCrearCierreCaja(payload) {
  return doJson(`${API_BASE}/api/caja/cierre`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Excel Pagos (fallback entre endpoints, porque en tu front aparece /api/pagos/export)
export async function apiExportPagosExcel(desde, hasta) {
  const qs = qsFromRange(desde, hasta);

  // 1) endpoint que tu UI está intentando usar
  const url1 = `${API_BASE}/api/pagos/export${qs ? `?${qs}` : ""}`;
  try {
    return await downloadBlob(url1);
  } catch (e) {
    // 2) fallback alternativo (si tu backend lo tiene así)
    const url2 = `${API_BASE}/api/reportes/pagos/excel${qs ? `?${qs}` : ""}`;
    return await downloadBlob(url2);
  }
}

// -------------------- VENCIMIENTOS / DASHBOARD --------------------
export async function apiGetDashboardResumen() {
  return fetchJson(`${API_BASE}/api/dashboard/resumen`);
}

export async function apiGetVencimientosProximos(params = "") {
  const url = `${API_BASE}/api/vencimientos/proximos${params ? `?${params}` : ""}`;
  return fetchJson(url);
}

// -------------------- ADMIN USUARIOS (si aplica) --------------------
export async function apiUsersList() {
  return fetchJson(`${API_BASE}/auth/users`);
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
export async function apiUsersResetPassword(userId, password) {
  return doJson(`${API_BASE}/auth/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}
