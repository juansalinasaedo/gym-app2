// src/components/expirations/UpcomingExpirations.jsx
import Section from "../Section";

export default function UpcomingExpirations({ items }) {
  return (
    <Section title="7) Vencimientos próximos (≤3 días)">
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">No hay membresías por vencer en los próximos 3 días.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 text-left">
              <tr>
                <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
                <th className="px-3 py-2 border-b border-gray-200">RUT</th>
                <th className="px-3 py-2 border-b border-gray-200">Plan</th>
                <th className="px-3 py-2 border-b border-gray-200">Vence</th>
                <th className="px-3 py-2 border-b border-gray-200">Días restantes</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((v) => (
                <tr key={v.cliente_membresia_id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-800 font-medium">{v.nombre} {v.apellido}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{v.rut}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-700">{v.nombre_plan}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-700">{v.fecha_fin}</td>
                  <td className="px-3 py-2 border-b border-gray-100">
                    <span className={`px-2 py-[2px] rounded text-white ${
                      v.dias_restantes <= 1 ? "bg-red-600" : v.dias_restantes === 2 ? "bg-orange-500" : "bg-amber-500"
                    }`}>{v.dias_restantes}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[10px] text-gray-400 mt-2">Lista de clientes con plan activo que vence en los próximos 3 días.</div>
        </div>
      )}
    </Section>
  );
}
