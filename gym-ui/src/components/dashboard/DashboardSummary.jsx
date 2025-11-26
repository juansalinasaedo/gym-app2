import { useEffect, useState } from "react";
import { apiGetDashboardResumen } from "../../api";

export default function DashboardSummary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGetDashboardResumen()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Error cargando resumen dashboard:", err);
        setError("No se pudo cargar el resumen.");
      });
  }, []);

  if (error) {
    return (
      <div className="mb-5 text-xs text-amber-800 bg-amber-50 border border-amber-300 px-3 py-2 rounded">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    ["Entradas hoy", data.entradas_hoy],
    ["Ingresos hoy", `$${data.ingresos_hoy}`],
    ["Clientes activos", data.clientes_activos],
    ["Vencen próximos 7 días", data.vencimientos_7d],
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="border rounded-lg bg-white px-3 py-2 shadow-sm flex flex-col justify-center"
        >
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            {label}
          </div>
          <div className="text-lg font-bold text-gym-text-main">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
