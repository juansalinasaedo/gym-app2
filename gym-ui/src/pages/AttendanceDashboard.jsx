// src/pages/AttendanceDashboard.jsx
import { useEffect, useState } from "react";
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

const API_BASE = import.meta.env.VITE_API_BASE || "";

const PIE_COLORS = [
  "#0f766e",
  "#2563eb",
  "#f97316",
  "#a855f7",
  "#e11d48",
  "#059669",
  "#7c3aed",
  "#f59e0b",
  "#3b82f6",
];

function parseDateSafe(iso) {
  // evita problemas de huso horario usando año/mes/día separados
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function AttendanceDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [dias, setDias] = useState([]);
  const [horas, setHoras] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- estados de ordenamiento ----
  const [diasSortField, setDiasSortField] = useState("fecha"); // 'fecha' | 'cantidad'
  const [diasSortAsc, setDiasSortAsc] = useState(true);

  const [horasSortField, setHorasSortField] = useState("hora"); // 'hora' | 'cantidad'
  const [horasSortAsc, setHorasSortAsc] = useState(true);

  const [sortTopAsistDesc, setSortTopAsistDesc] = useState(true); // true = más asistencias primero

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAll = async () => {
      try {
        setLoading(true);

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

          setTimeout(() => {
            navigate("/login");
          }, 800);
          return;
        }

        if (!r1.ok || !r2.ok || !r3.ok) {
          throw new Error("Error al cargar datos del dashboard de asistencia.");
        }

        const [d1, d2, d3] = await Promise.all([
          r1.json(),
          r2.json(),
          r3.json(),
        ]);

        setDias(d1 || []);
        setHoras(d2 || []);
        setTopClientes(d3 || []);
        setError("");
      } catch (e) {
        console.error(e);
        setError(e.message || "Error al cargar dashboard.");
        setDias([]);
        setHoras([]);
        setTopClientes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isAdmin, navigate]);

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
        <div className="text-sm text-gym-text-muted">
          Cargando dashboard de asistencia…
        </div>
      </div>
    );
  }

  // ---------- datos derivados ----------

  // Pie chart: top clientes del mes actual
  const pieData = topClientes.map((c) => ({
    name: `${c.nombre} ${c.apellido}`,
    value: c.cantidad,
  }));

  // Ordenamiento de días
  const diasOrdenados = [...dias].sort((a, b) => {
    let comp;
    if (diasSortField === "fecha") {
      const da = parseDateSafe(a.fecha);
      const db = parseDateSafe(b.fecha);
      comp = da - db;
    } else {
      comp = a.cantidad - b.cantidad;
    }
    return diasSortAsc ? comp : -comp;
  });

  // Ordenamiento de horas
  const horasOrdenadas = [...horas].sort((a, b) => {
    let comp;
    if (horasSortField === "hora") {
      const ha = Number(a.hora);
      const hb = Number(b.hora);
      comp = ha - hb;
    } else {
      comp = a.cantidad - b.cantidad;
    }
    return horasSortAsc ? comp : -comp;
  });

  // Ranking de clientes (tabla)
  const topClientesOrdenados = [...topClientes].sort((a, b) =>
    sortTopAsistDesc ? b.cantidad - a.cantidad : a.cantidad - b.cantidad
  );

  // ---- series semanales (agregando por semana) ----
  const semanasDataMap = new Map();

  dias.forEach((d) => {
    const date = parseDateSafe(d.fecha);
    // lunes = 0, domingo = 6
    const day = (date.getDay() + 6) % 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day);
    const key = monday.toISOString().slice(0, 10);

    const current = semanasDataMap.get(key) || {
      weekStart: key,
      total: 0,
    };
    current.total += d.cantidad;
    semanasDataMap.set(key, current);
  });

  const semanasData = Array.from(semanasDataMap.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  const semanasChartData = semanasData.map((w, idx) => ({
    etiqueta: `Sem ${idx + 1}`,
    total: w.total,
  }));

  // ---- series mensuales (comparación mes a mes) ----
  const mesesDataMap = new Map();

  dias.forEach((d) => {
    const date = parseDateSafe(d.fecha);
    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`; // ej: 2025-11

    const current = mesesDataMap.get(key) || {
      mes: key,
      total: 0,
    };
    current.total += d.cantidad;
    mesesDataMap.set(key, current);
  });

  let mesesData = Array.from(mesesDataMap.values()).sort((a, b) =>
    a.mes.localeCompare(b.mes)
  );

  // opcional: limitar a los últimos 6 meses
  if (mesesData.length > 6) {
    mesesData = mesesData.slice(-6);
  }

  const mesesChartData = mesesData.map((m) => ({
    mes: m.mes, // ya viene year-month
    total: m.total,
  }));

  // ---- ranking de mejores horarios ----
  const horasRanking = [...horas].sort((a, b) => b.cantidad - a.cantidad);
  const horasRankingTop = horasRanking.slice(0, 6); // top 6 para mostrar lindo

  const horasRankingChartData = horasRankingTop.map((h) => ({
    hora: `${h.hora.toString().padStart(2, "0")}:00`,
    total: h.cantidad,
  }));

  // ---------- handlers de orden ----------

  const handleSortDiasByFecha = () => {
    setDiasSortField("fecha");
    setDiasSortAsc((prev) => (diasSortField === "fecha" ? !prev : true));
  };

  const handleSortDiasByCantidad = () => {
    setDiasSortField("cantidad");
    setDiasSortAsc((prev) => (diasSortField === "cantidad" ? !prev : true));
  };

  const handleSortHorasByHora = () => {
    setHorasSortField("hora");
    setHorasSortAsc((prev) => (horasSortField === "hora" ? !prev : true));
  };

  const handleSortHorasByCantidad = () => {
    setHorasSortField("cantidad");
    setHorasSortAsc((prev) => (horasSortField === "cantidad" ? !prev : true));
  };

  // ---------- render ----------

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 text-[15px] md:text-[16px]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gym-text-main flex items-center gap-2">
            <span>📊</span>
            <span>Dashboard de Asistencia</span>
          </h1>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        {/* Grid 1: visión diaria y horas peak */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 1) Asistencias por día */}
          <div className="bg-white rounded-2xl border border-gym-border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">
              Asistencias por día (últimos 30 días)
            </h2>
            <p className="text-sm text-gym-text-muted mb-3">
              Tendencia de concurrencia diaria al gimnasio.
            </p>

            {diasOrdenados.length === 0 ? (
              <p className="text-sm text-gym-text-muted">
                No hay asistencias registradas en los últimos 30 días.
              </p>
            ) : (
              <div className="max-h-80 overflow-auto text-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase text-gym-text-muted">
                      <th
                        className="py-2 px-2 text-left cursor-pointer select-none"
                        onClick={handleSortDiasByFecha}
                      >
                        Fecha{" "}
                        {diasSortField === "fecha"
                          ? diasSortAsc
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        className="py-2 px-2 text-right cursor-pointer select-none"
                        onClick={handleSortDiasByCantidad}
                      >
                        Asistencias{" "}
                        {diasSortField === "cantidad"
                          ? diasSortAsc
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasOrdenados.map((d) => (
                      <tr key={d.fecha} className="border-b border-slate-100">
                        <td className="py-1.5 px-2">{d.fecha}</td>
                        <td className="py-1.5 px-2 text-right">
                          {d.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2) Horas peak */}
          <div className="bg-white rounded-2xl border border-gym-border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">
              Horas peak (últimos 30 días)
            </h2>
            <p className="text-sm text-gym-text-muted mb-3">
              Distribución de asistencias por hora del día. Útil para ver
              franjas horarias más concurridas.
            </p>

            {horasOrdenadas.length === 0 ? (
              <p className="text-sm text-gym-text-muted">
                No hay asistencias suficientes para calcular horas peak.
              </p>
            ) : (
              <div className="max-h-80 overflow-auto text-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase text-gym-text-muted">
                      <th
                        className="py-2 px-2 text-left cursor-pointer select-none"
                        onClick={handleSortHorasByHora}
                      >
                        Hora{" "}
                        {horasSortField === "hora"
                          ? horasSortAsc
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        className="py-2 px-2 text-right cursor-pointer select-none"
                        onClick={handleSortHorasByCantidad}
                      >
                        Asistencias{" "}
                        {horasSortField === "cantidad"
                          ? horasSortAsc
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {horasOrdenadas.map((h) => (
                      <tr key={h.hora} className="border-b border-slate-100">
                        <td className="py-1.5 px-2">
                          {h.hora.toString().padStart(2, "0")}:00
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {h.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Grid 2: vista semanal + comparaciones mes a mes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 3) Gráfico semanal */}
          <div className="bg-white rounded-2xl border border-gym-border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">
              Asistencias por semana
            </h2>
            <p className="text-sm text-gym-text-muted mb-3">
              Resumen de concurrencia agrupado por semanas calendario.
            </p>

            {semanasChartData.length === 0 ? (
              <p className="text-sm text-gym-text-muted">
                Aún no hay suficientes datos para calcular semanas.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={semanasChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Asistencias"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 4) Comparación mes a mes */}
          <div className="bg-white rounded-2xl border border-gym-border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">
              Comparación mes a mes
            </h2>
            <p className="text-sm text-gym-text-muted mb-3">
              Total de asistencias por mes (máx. últimos 6 meses).
            </p>

            {mesesChartData.length <= 1 ? (
              <p className="text-sm text-gym-text-muted">
                Se necesita al menos más de un mes de datos para comparar.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mesesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Asistencias" fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Grid 3: ranking de clientes + gráfico circular + ranking de horarios */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 5) Top clientes + pie */}
          <div className="bg-white rounded-2xl border border-gym-border shadow-sm p-5 xl:col-span-2">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Clientes con mayor asistencia (mes actual)
                </h2>
                <p className="text-sm text-gym-text-muted">
                  Ranking de los clientes que más han asistido en el mes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* Tabla ranking */}
              <div className="max-h-96 overflow-auto text-sm border border-slate-100 rounded-xl">
                {topClientesOrdenados.length === 0 ? (
                  <p className="text-sm text-gym-text-muted p-4">
                    Aún no hay asistencias registradas este mes.
                  </p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-xs uppercase text-gym-text-muted">
                        <th className="py-2 px-2 text-left">#</th>
                        <th className="py-2 px-2 text-left">Cliente</th>
                        <th
                          className="py-2 px-2 text-right cursor-pointer select-none"
                          onClick={() => setSortTopAsistDesc((v) => !v)}
                        >
                          Asistencias {sortTopAsistDesc ? "↓" : "↑"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClientesOrdenados.map((c, idx) => (
                        <tr
                          key={c.cliente_id}
                          className="border-b border-slate-100"
                        >
                          <td className="py-1.5 px-2">{idx + 1}</td>
                          <td className="py-1.5 px-2">
                            {c.nombre} {c.apellido}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {c.cantidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Gráfico circular */}
              <div className="h-80">
                {pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gym-text-muted">
                    No hay datos suficientes para mostrar el gráfico.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} asistencias`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 6) Ranking de mejores horarios */}
          <div className="bg-white rounded-2xl border border-gym-border shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">
              Ranking de mejores horarios
            </h2>
            <p className="text-sm text-gym-text-muted mb-3">
              Horarios con mayor cantidad de asistencias en el período
              analizado.
            </p>

            {horasRankingTop.length === 0 ? (
              <p className="text-sm text-gym-text-muted">
                Aún no hay suficientes datos para calcular el ranking de
                horarios.
              </p>
            ) : (
              <>
                <div className="h-40 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horasRankingChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="hora" width={60} />
                      <Tooltip />
                      <Bar dataKey="total" name="Asistencias" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <ul className="text-sm space-y-1">
                  {horasRankingTop.map((h, idx) => (
                    <li
                      key={h.hora}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-slate-100 text-xs text-gym-text-muted">
                          {idx + 1}
                        </span>
                        <span>
                          {h.hora.toString().padStart(2, "0")}:00
                        </span>
                      </span>
                      <span className="font-medium">{h.cantidad}</span>
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
