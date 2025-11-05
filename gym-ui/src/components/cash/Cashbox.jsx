// src/components/cash/Cashbox.jsx
import Section from "../Section";

export default function Cashbox({ resumen, pagos }) {
  return (
    <Section title="6) Caja del día (pagos de hoy)">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4 text-xs">
        {[
          ["Total general", resumen.total_general],
          ["Efectivo", resumen.total_efectivo],
          ["Tarjeta", resumen.total_tarjeta],
          ["Transferencia", resumen.total_transferencia],
        ].map(([label, val]) => (
          <div key={label} className="border rounded p-3 bg-gray-50">
            <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">{label}</div>
            <div className="text-lg font-bold text-gray-900">${val}</div>
          </div>
        ))}
      </div>

      {pagos.length === 0 ? (
        <div className="text-xs text-gray-500">Aún no hay pagos registrados hoy.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 text-left">
              <tr>
                <th className="px-3 py-2 border-b border-gray-200">Hora</th>
                <th className="px-3 py-2 border-b border-gray-200">Cliente</th>
                <th className="px-3 py-2 border-b border-gray-200">RUT</th>
                <th className="px-3 py-2 border-b border-gray-200">Método</th>
                <th className="px-3 py-2 border-b border-gray-200">Monto</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {pagos.map((p) => (
                <tr key={p.pago_id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b border-gray-100 font-semibold text-gray-800">{p.hora}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-700">{p.nombre} {p.apellido}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{p.rut}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{p.metodo_pago}</td>
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-900 font-semibold">${p.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[10px] text-gray-400 mt-2">Resumen basado en los pagos con fecha de hoy.</div>
        </div>
      )}
    </Section>
  );
}
