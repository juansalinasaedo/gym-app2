import React, { useState } from "react";
import { apiAsistenciasRango } from "../../api";

export default function AssistsRange() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Base URL para llamadas directas (si usas proxy de Vite a /api, puede quedar en "")
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  const buildQS = (params) => new URLSearchParams(params).toString();

  const onSearch = async () => {
    if (!desde || !hasta) return;
    // Normaliza rango si el usuario los invierte
    const d1 = new Date(desde);
    const d2 = new Date(hasta);
    const from = d1 <= d2 ? desde : hasta;
    const to = d1 <= d2 ? hasta : desde;

    try {
      setLoading(true);
      const data = await apiAsistenciasRango(from, to);
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (e) {
      console.error(e);
      alert("Error al buscar asistencias.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!desde || !hasta || items.length === 0) return;

    // Normaliza rango si el usuario los invierte
    const d1 = new Date(desde);
    const d2 = new Date(hasta);
    const from = d1 <= d2 ? desde : hasta;
    const to = d1 <= d2 ? hasta : desde;

    const qs = buildQS({ desde: from, hasta: to });
    // Si usas proxy, esto funciona tal cual; si no, define VITE_API_BASE (p. ej., http://127.0.0.1:5000)
    window.open(`${API_BASE}/api/asistencias/rango/excel?${qs}`, "_blank");
  };

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="text-sm font-semibold text-gray-800">
        Entradas por rango de fechas
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={onSearch}
            disabled={loading || !desde || !hasta}
            className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2 text-sm w-full sm:w-auto disabled:opacity-60"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            disabled={!desde || !hasta || items.length === 0}
            title="Descargar Excel con las entradas del rango"
          >
            Descargar Excel
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-gray-500">
          {loading ? "Cargando..." : "Sin resultados para el rango seleccionado."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 text-left">
              <tr>
                <th className="px-3 py-2 border-b border-gray-200">Fecha</th>
                <th className="px-3 py-2 border-b border-gray-200">Hora</th>
                <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
                <th className="px-3 py-2 border-b border-gray-200">RUT</th>
                <th className="px-3 py-2 border-b border-gray-200">ID Cliente</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((r) => (
                <tr key={r.asistencia_id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b border-gray-100">{r.fecha}</td>
                  <td className="px-3 py-2 border-b border-gray-100">{r.hora}</td>
                  <td className="px-3 py-2 border-b border-gray-100">
                    {r.nombre} {r.apellido}
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100">{r.rut}</td>
                  <td className="px-3 py-2 border-b border-gray-100">#{r.cliente_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[10px] text-gray-400 mt-2">
            Solo asistencias tipo "entrada" dentro del rango usando hora local (Chile).
          </div>
        </div>
      )}
    </div>
  );
}
