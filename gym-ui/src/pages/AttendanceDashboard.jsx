// src/pages/AttendanceDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

const PIE_COLORS = [
  "#3B82F6", // azul
  "#10B981", // verde
  "#F59E0B", // ámbar
  "#EF4444", // rojo
  "#8B5CF6", // violeta
  "#06B6D4", // cian
  "#F97316", // naranjo
  "#84CC16", // lima
  "#EC4899", // rosado
  "#14B8A6", // teal
];

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function renderPieLabel({ percent }) {
  if (!percent || percent <= 0) return "";
  return `${(percent * 100).toFixed(0)}%`;
}

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // data
  const [dias, setDias] = useState([]);
  const [horas, setHoras] = useState([]);
  const [topClientes, setTopClientes] = useState([]);

  // UI / ordenamiento
  const [diasSortField, setDiasSortField] = useState("fecha");
  const [diasSortDir, setDiasSortDir] = useState("asc");

  const [topSortField, setTopSortField] = useState("cantidad");
  const [topSortDir, setTopSortDir] = useState("desc");

  // Validación robusta de admin
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

        const [r1, r2, r3] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/asistencia/dias`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/dashboard/asistencia/horas`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/dashboard/asistencia/top-clientes`, {
            credentials: "include",
          }),
        ]);

        if ([r1, r2, r3].some((r) => r.status === 401)) {
          setError(
            "Sesión expirada o sin autorización para ver el dashboard. Vuelve a iniciar sesión."
          );
          setDias([]);
          setHoras([]);
          setTopClientes([]);
          return;
        }

        if ([r1, r2, r3].some((r) => !r.ok)) {
          const bad = [r1, r2, r3].find((r) => !r.ok);
          throw new Error(`Error HTTP ${bad?.status}`);
        }

        const [d1, d2, d3] = await Promise.all([
          r1.json(),
          r2.json(),
          r3.json(),
        ]);

        // Normalización de datos
        const diasNorm = (Array.isArray(d1) ? d1 : []).map((x) => ({
          fecha: x.fecha,
          cantidad: Number(x.cantidad ?? x.total ?? 0),
        }));

        const horasNorm = (Array.isArray(d2) ? d2 : []).map((x) => {
          const raw = x.hora;
          let hh = 0;

          if (typeof raw === "string") {
            hh = Number(raw.split(":")[0]);
          } else {
            hh = Number(raw);
          }

          return {
            hora: Number.isFinite(hh) ? hh : 0,
            cantidad: Number(x.cantidad ?? x.total ?? 0),
          };
        });

        const topNorm = (Array.isArray(d3) ? d3 : []).map((x) => ({
          cliente_id: x.cliente_id,
          nombre: x.nombre || "",
          apellido: x.apellido || "",
          rut: x.rut || "",
          cantidad: Number(x.cantidad ?? x.total ?? 0),
        }));

        setDias(diasNorm);
        setHoras(horasNorm);
        setTopClientes(topNorm);
      } catch (e) {
        console.error("Error cargando dashboard:", e);
        setError(e.message || "Error al cargar dashboard.");
        setDias([]);
        setHoras([]);
        setTopClientes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, isAdmin]);

  // ---------- datos derivados ----------
  const pieData = useMemo(() => {
    return topClientes.map((c) => ({
      name: `${c.nombre} ${c.apellido}`.trim(),
      value: Number(c.cantidad) || 0,
    }));
  }, [topClientes]);

  const diasOrdenados = useMemo(() => {
    return [...dias].sort((a, b) => {
      let comp = 0;

      if (diasSortField === "fecha") {
        const da = parseDateSafe(a.fecha);
        const db = parseDateSafe(b.fecha);
        comp = (da?.getTime() || 0) - (db?.getTime() || 0);
      } else if (diasSortField === "cantidad") {
        comp = (Number(a.cantidad) || 0) - (Number(b.cantidad) || 0);
      }

      return diasSortDir === "asc" ? comp : -comp;
    });
  }, [dias, diasSortField, diasSortDir]);

  const topOrdenados = useMemo(() => {
    return [...topClientes].sort((a, b) => {
      let comp = 0;

      if (topSortField === "cantidad") {
        comp = (Number(a.cantidad) || 0) - (Number(b.cantidad) || 0);
      } else if (topSortField === "nombre") {
        comp = `${a.nombre} ${a.apellido}`.localeCompare(
          `${b.nombre} ${b.apellido}`
        );
      }

      return topSortDir === "asc" ? comp : -comp;
    });
  }, [topClientes, topSortField, topSortDir]);

  const horasRankingChartData = useMemo(() => {
    return [...horas]
      .map((h) => ({
        hora: `${String(h.hora).padStart(2, "0")}:00`,
        cantidad: Number(h.cantidad) || 0,
      }))
      .sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0))
      .slice(0, 10);
  }, [horas]);

  const diasChartData = useMemo(() => {
    return diasOrdenados.map((d) => ({
      fecha: d.fecha,
      cantidad: Number(d.cantidad) || 0,
    }));
  }, [diasOrdenados]);

  const noDias = diasChartData.length === 0;
  const noTop = topClientes.length === 0;
  const noHoras = horasRankingChartData.length === 0;

  // Esperar a que cargue el usuario antes de validar permisos
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-gym-text-muted">Cargando usuario...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="px-6 py-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm">
          No tienes permiso para ver este dashboard.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-gym-text-muted">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gym-text">
              Dashboard de asistencia
            </h1>
            <p className="text-sm text-gym-text-muted">
              Tendencias y rankings del mes actual.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-3 py-2 text-sm rounded-md bg-white border border-slate-200 hover:bg-slate-50"
          >
            Volver
          </button>
        </div>

        {error ? (
          <div className="mb-6 px-4 py-3 rounded-md bg-rose-50 border border-rose-200 text-rose-900 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-gym-text">
            Comparación mes a mes
          </h2>
          <p className="text-sm text-gym-text-muted">
            Total de asistencias por mes (máx. últimos 6 meses).
          </p>
          <div className="mt-4">
            <p className="text-sm text-gym-text-muted">
              Se necesita al menos más de un mes de datos para comparar.
            </p>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-gym-text">
            Clientes con mayor asistencia (mes actual)
          </h2>
          <p className="text-sm text-gym-text-muted">
            Ranking de los clientes que más han asistido en el mes.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="min-h-[280px]">
              {noTop ? (
                <div className="p-4 rounded-md border border-slate-200 text-sm text-gym-text-muted">
                  Aún no hay asistencias registradas este mes.
                </div>
              ) : (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label={renderPieLabel}
                        labelLine={true}
                      >
                        {pieData.map((_, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-center text-xs text-gym-text-muted mt-2">
                    Distribución de asistencias por cliente (Top).
                  </p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gym-text">
                  Top clientes
                </span>

                <div className="flex gap-2 text-xs">
                  <button
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      setTopSortField("cantidad");
                      setTopSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                    }}
                  >
                    Ordenar por cantidad
                  </button>

                  <button
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      setTopSortField("nombre");
                      setTopSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                    }}
                  >
                    Ordenar por nombre
                  </button>
                </div>
              </div>

              {noTop ? (
                <p className="text-sm text-gym-text-muted">
                  No hay datos suficientes para mostrar el gráfico.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topOrdenados.slice(0, 10).map((c, idx) => (
                    <li
                      key={c.cliente_id}
                      className="flex items-center justify-between text-sm border-b border-slate-100 pb-2"
                    >
                      <span className="text-gym-text flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              PIE_COLORS[idx % PIE_COLORS.length],
                          }}
                        />
                        <span>
                          {c.nombre} {c.apellido}
                          <span className="text-xs text-gym-text-muted">
                            {" "}
                            — {c.rut}
                          </span>
                        </span>
                      </span>
                      <span className="font-medium">
                        {Number(c.cantidad) || 0}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-gym-text">
            Asistencias por día (mes actual)
          </h2>
          <p className="text-sm text-gym-text-muted">
            Serie diaria de entradas registradas.
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs">
            <button
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
              onClick={() => {
                setDiasSortField("fecha");
                setDiasSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Ordenar por fecha
            </button>

            <button
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
              onClick={() => {
                setDiasSortField("cantidad");
                setDiasSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Ordenar por cantidad
            </button>
          </div>

          <div className="mt-4">
            {noDias ? (
              <p className="text-sm text-gym-text-muted">
                Aún no hay suficientes datos para mostrar el gráfico.
              </p>
            ) : (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={diasChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="cantidad"
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 border border-slate-200 rounded-md p-4">
            {noDias ? (
              <p className="text-sm text-gym-text-muted">
                No hay asistencias registradas este mes.
              </p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {diasOrdenados.slice(0, 14).map((d) => (
                  <li
                    key={d.fecha}
                    className="flex items-center justify-between border-b border-slate-100 pb-1"
                  >
                    <span className="text-gym-text">{d.fecha}</span>
                    <span className="font-medium">
                      {Number(d.cantidad) || 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-gym-text">
            Ranking de mejores horarios
          </h2>
          <p className="text-sm text-gym-text-muted">
            Horarios con mayor cantidad de asistencias en el período analizado.
          </p>

          <div className="mt-4">
            {noHoras ? (
              <p className="text-sm text-gym-text-muted">
                Aún no hay suficientes datos para calcular el ranking de horarios.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={horasRankingChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="hora" width={60} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#10B981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <ul className="mt-4 space-y-2">
                  {horasRankingChartData.map((h) => (
                    <li
                      key={h.hora}
                      className="flex items-center justify-between text-sm border-b border-slate-100 pb-2"
                    >
                      <span className="text-gym-text">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-10 text-xs text-gym-text-muted">
                            {h.hora}
                          </span>
                        </span>
                      </span>
                      <span className="font-medium">
                        {Number(h.cantidad) || 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}