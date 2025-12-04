// src/components/attendance/TodayEntries.jsx
import Section from "../Section";
import { horaBonita } from "../../utils/time";

export default function TodayEntries({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        Aún no hay ingresos marcados hoy.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-gray-700 text-left">
          <tr>
            <th className="px-3 py-2 border-b border-gray-200">Hora</th>
            <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
            <th className="px-3 py-2 border-b border-gray-200">RUT</th>
            <th className="px-3 py-2 border-b border-gray-200">ID</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.asistencia_id}>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-800">
                {a.hora || horaBonita(a.fecha_hora)}
              </td>
              <td className="px-3 py-2 border-b border-gray-100">
                {a.nombre} {a.apellido}
              </td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-500">
                {a.rut}
              </td>
              <td className="px-3 py-2 border-b border-gray-100 text-gray-400">
                #{a.cliente_id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[10px] text-gray-400 mt-2">
        Solo se muestran asistencias tipo "entrada" del día actual, ordenadas por hora.
      </div>
    </div>
  );
}
