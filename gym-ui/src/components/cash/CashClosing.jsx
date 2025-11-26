import { useState, useEffect } from "react";
import { apiGetCierreHoy, apiCrearCierreCaja } from "../../api";

export default function CashClosing({ resumen, onClosed }) {
  const [cerradoInfo, setCerradoInfo] = useState(null);
  const [efectivo, setEfectivo] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGetCierreHoy()
      .then((data) => setCerradoInfo(data))
      .catch((e) => {
        console.error("Error cargando cierre de hoy:", e);
      });
  }, []);

  // Si ya está cerrada la caja de hoy, mostramos un mensajito
  if (cerradoInfo?.cerrado) {
    return (
      <div className="mt-4 p-3 border rounded bg-emerald-50 text-xs">
        <div className="font-semibold text-emerald-900">
          Caja cerrada para hoy
        </div>
        {cerradoInfo.resumen && (
          <div className="text-emerald-900/80 mt-1">
            Diferencia total: ${cerradoInfo.resumen.diferencia_total}
          </div>
        )}
      </div>
    );
  }

  const handleClose = async () => {
    setLoading(true);
    try {
      await apiCrearCierreCaja({
        total_declarado_efectivo: Number(efectivo || 0),
        total_declarado_tarjeta: Number(tarjeta || 0),
        total_declarado_transferencia: Number(transferencia || 0),
        observaciones: obs,
      });

      // Marcamos como cerrado para no volver a mostrar el formulario
      setCerradoInfo({ cerrado: true });
      onClosed?.();
    } catch (e) {
      console.error("Error al crear cierre de caja:", e);
      alert("Error al cerrar caja. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border rounded p-3 bg-white text-xs">
      <div className="font-semibold text-gray-800 mb-2">
        Cierre de caja de hoy
      </div>

      {/* Opcional: mostrar totales del sistema como referencia */}
      {resumen && (
        <div className="mb-2 text-[11px] text-gray-600">
          <div>Total sistema hoy: ${resumen.total_general}</div>
          <div>
            Efectivo: ${resumen.total_efectivo} · Tarjeta: $
            {resumen.total_tarjeta} · Transf: $
            {resumen.total_transferencia}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <input
          className="border rounded px-2 py-1 text-xs"
          placeholder="Efectivo contado"
          value={efectivo}
          onChange={(e) => setEfectivo(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 text-xs"
          placeholder="Tarjeta contada"
          value={tarjeta}
          onChange={(e) => setTarjeta(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 text-xs"
          placeholder="Transferencia contada"
          value={transferencia}
          onChange={(e) => setTransferencia(e.target.value)}
        />
      </div>

      <textarea
        className="w-full border rounded px-2 py-1 text-xs"
        placeholder="Observaciones (opcional)"
        value={obs}
        onChange={(e) => setObs(e.target.value)}
      />

      <button
        onClick={handleClose}
        disabled={loading}
        className="mt-2 px-3 py-1 rounded bg-gym-primary-dark text-white text-[11px]"
      >
        {loading ? "Cerrando..." : "Cerrar caja de hoy"}
      </button>
    </div>
  );
}
