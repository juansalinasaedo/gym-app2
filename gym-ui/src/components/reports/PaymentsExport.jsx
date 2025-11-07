import React, { useState } from "react";
import { apiExportPagosExcel } from "../../api";

export default function PaymentsExport() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [downloading, setDownloading] = useState(false);

  const onDownload = async () => {
    try {
      setDownloading(true);
      const blob = await apiExportPagosExcel(desde, hasta);
      const dFrom = desde || new Date(Date.now() - 30*24*3600*1000).toISOString().slice(0,10);
      const dTo   = hasta || new Date().toISOString().slice(0,10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pagos_${dFrom.replaceAll("-","")}_${dTo.replaceAll("-","")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error al descargar el Excel de pagos.");
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-2">
      <div className="text-sm font-semibold text-gray-800">
        Exportar pagos a Excel (orden DESC)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Desde</label>
          <input type="date" className="border rounded px-2 py-1 w-full"
                 value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Hasta</label>
          <input type="date" className="border rounded px-2 py-1 w-full"
                 value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button
            onClick={onDownload}
            disabled={downloading}
            className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2 text-sm w-full disabled:opacity-60"
          >
            {downloading ? "Generando..." : "Descargar Excel"}
          </button>
        </div>
      </div>
      <div className="text-[11px] text-gray-500">
        Si no eliges fechas, exporta los últimos 30 días.
      </div>
    </div>
  );
}
