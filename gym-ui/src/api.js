// src/api.js
export const API_BASE = import.meta.env.VITE_API_BASE || "";

const JSON_HEADERS = { "Content-Type": "application/json" };

function authHeaders() {
  return {};
}

function normalizeDateInput(s) {
  if (!s) return "";
  const str = String(s).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

async function readJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function fetchJson(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

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
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export async function doJson(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

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
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// -------------------- auth --------------------

export async function apiLogin(username, password) {
  return doJson(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function apiLogout() {
  return doJson(`/api/auth/logout`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function apiMe() {
  return fetchJson(`/api/auth/me`);
}

// -------------------- clientes --------------------

export async function apiGetClientes() {
  return fetchJson(`/api/clientes`);
}

export async function apiCrearCliente(payload) {
  return doJson(`/api/clientes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetCliente(cliente_id) {
  return fetchJson(`/api/clientes/${cliente_id}`);
}

export async function apiUpdateCliente(cliente_id, payload) {
  return doJson(`/api/clientes/${cliente_id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// -------------------- membresias --------------------

export async function apiGetMembresias() {
  return fetchJson(`/api/membresias`);
}

export async function apiCrearMembresia(payload) {
  return doJson(`/api/membresias`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateMembresia(membresia_id, payload) {
  return doJson(`/api/membresias/${membresia_id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteMembresia(membresia_id) {
  return doJson(`/api/membresias/${membresia_id}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function apiGetMembresiaActiva(cliente_id) {
  return fetchJson(`/api/clientes/${cliente_id}/membresia-activa`);
}

// -------------------- pagos --------------------

export async function apiPagarYRenovar(payload) {
  return doJson(`/api/pagos/renovar`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------- asistencias --------------------

export async function apiGetAsistenciasHoy() {
  return fetchJson(`/api/asistencias/hoy`);
}

export async function apiMarcarAsistencia(cliente_id, tipo = "entrada") {
  return doJson(`/api/asistencias`, {
    method: "POST",
    body: JSON.stringify({ cliente_id, tipo }),
  });
}

export async function apiMarcarAsistenciaQR(token) {
  return doJson(`/api/asistencias/qr`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function apiAsistenciasRango(from, to) {
  const f = normalizeDateInput(from);
  const t = normalizeDateInput(to);

  return fetchJson(
    `/api/asistencias/rango?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`
  );
}

// -------------------- reconocimiento facial --------------------

export async function apiFaceIdentify(file) {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(`${API_BASE}/api/face/identify`, {
    method: "POST",
    credentials: "include",
    body: fd,
    headers: {
      ...authHeaders(),
    },
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    const msg = data?.detail || data?.error || "Error identify";
    throw new Error(msg);
  }

  return data;
}

export async function apiFaceConfirm(cliente_id, score) {
  return doJson(`/api/asistencias/face/confirm`, {
    method: "POST",
    body: JSON.stringify({ cliente_id, score }),
  });
}

export async function apiFaceEnroll(cliente_id, file) {
  const fd = new FormData();
  fd.append("cliente_id", cliente_id);
  fd.append("image", file);

  const res = await fetch(`${API_BASE}/api/face/enroll`, {
    method: "POST",
    credentials: "include",
    body: fd,
    headers: {
      ...authHeaders(),
    },
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    const msg = data?.detail || data?.error || "Error enroll";
    throw new Error(msg);
  }

  return data;
}

// -------------------- pagos / caja / dashboard / users --------------------

export async function apiGetPagosHoy() {
  return fetchJson(`/api/pagos/hoy`);
}

export async function apiGetCierreHoy() {
  return fetchJson(`/api/caja/cierre-hoy`);
}

export async function apiCrearCierreCaja(payload) {
  return doJson(`/api/caja/cierre`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiExportPagosExcel(from, to) {
  const f = normalizeDateInput(from);
  const t = normalizeDateInput(to);

  const url = `${API_BASE}/api/pagos/export/excel?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("No se pudo exportar");

  return await res.blob();
}

export async function apiGetDashboardResumen() {
  return fetchJson(`/api/dashboard/resumen`);
}

export async function apiGetVencimientosProximos(days = 7) {
  return fetchJson(`/api/dashboard/vencimientos?days=${days}`);
}

export async function apiUsersList() {
  return fetchJson(`/api/users`);
}

export async function apiUsersCreate(payload) {
  return doJson(`/api/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUsersToggle(user_id) {
  return doJson(`/api/users/${user_id}/toggle`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function apiUsersDelete(user_id) {
  return doJson(`/api/users/${user_id}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function apiUsersResetPassword(user_id, new_password) {
  return doJson(`/api/users/${user_id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ new_password }),
  });
}

export async function apiFaceStatus(cliente_id) {
  return fetchJson(`/api/clientes/${cliente_id}/face-status`);
}

export async function apiFaceDelete(cliente_id) {
  return doJson(`/api/clientes/${cliente_id}/face-template`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}