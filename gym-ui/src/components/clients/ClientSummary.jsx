// src/components/clients/ClientSummary.jsx
import { horaBonita } from "../../utils/time";
import { API_BASE } from "../../api";   // <--- NUEVO

export default function ClientSummary({
  cliente, infoMembresia, puedeEntrar, onEntrada, loadingEntrada,
  yaEntroHoy, horaPrimeraEntrada
}) {
  if (!cliente)
    return (
      <div className="text-gray-500 text-xs p-3 border rounded h-full flex items-center bg-gray-50">
        Selecciona un cliente con el buscador o crea uno nuevo.
      </div>
    );

  // Normalizar campos nuevos
  const direccion = cliente.direccion?.trim() || "—";
  const estadoLaboral = cliente.estado_laboral?.trim() || "—";
  const sexo = (cliente.sexo || "").toUpperCase(); // 'M', 'F', 'O'
  const sexoLabel = sexo === "M" ? "Masculino" : sexo === "F" ? "Femenino" : sexo === "O" ? "Otro" : "—";
  const handleVerQR = () => {
    const url = `${API_BASE}/api/clientes/${cliente.cliente_id}/qr`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-3 border rounded h-full flex flex-col gap-3 bg-gray-50 text-xs">
      {/* Datos del cliente */}
      <div>
        <div className="text-gray-900 text-sm font-semibold">
          {cliente.nombre} {cliente.apellido}
        </div>
        <div className="text-gray-600">
          Rut {cliente.rut} · {cliente.email || "sin email"}
        </div>
        <div className="text-gray-600">
          Estado cliente: <span className="font-semibold">{cliente.estado}</span>
        </div>

        {/* Botón Ver QR */}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleVerQR}
            className="inline-flex items-center px-2 py-1 text-[11px] border border-gray-300 rounded hover:bg-gray-100"
          >
            Ver QR
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(`${API_BASE}/api/clientes/${cliente.cliente_id}/credencial`, "_blank")
            }
            className="inline-flex items-center px-2 py-1 text-[11px] border border-gray-300 rounded hover:bg-gray-100"
          >
            Descargar credencials
          </button>
        </div>

        {/* Nuevos campos */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white rounded border border-gray-200 px-2 py-1">
            <span className="text-[11px] text-gray-500">Dirección: </span>
            <span className="font-medium text-gray-800">{direccion}</span>
          </div>
          <div className="bg-white rounded border border-gray-200 px-2 py-1">
            <span className="text-[11px] text-gray-500">Estado laboral: </span>
            <span className="font-medium text-gray-800">{estadoLaboral}</span>
          </div>
          <div className="bg-white rounded border border-gray-200 px-2 py-1">
            <span className="text-[11px] text-gray-500">Sexo: </span>
            <span className="font-medium text-gray-800">{sexoLabel}</span>
          </div>
        </div>
      </div>

      {/* Membresía */}
      <div className="bg-white rounded border border-gray-200 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide mb-2">
              Membresía actual
            </div>

            {!infoMembresia || infoMembresia.estado === "sin_membresia" ? (
              <div className="text-red-600 text-sm font-semibold">Sin membresía activa</div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {infoMembresia.nombre_plan}
                  </div>
                  <div className="text-[11px] text-gray-500">${infoMembresia.precio}</div>
                  <span
                    className={`px-2 py-[2px] rounded-full text-[10px] font-semibold ${
                      infoMembresia.estado === "activa"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}
                  >
                    {infoMembresia.estado === "activa" ? "Activa" : "Vencida"}
                  </span>
                </div>

                <div className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                  <div>
                    Inicio:{" "}
                    <span className="font-medium text-gray-800">
                      {infoMembresia.fecha_inicio}
                    </span>
                  </div>
                  <div>
                    Vence:{" "}
                    <span className="font-medium text-gray-800">
                      {infoMembresia.fecha_fin}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-gray-600">Días restantes:</span>
                  <span
                    className={`text-sm font-bold px-2 py-[2px] rounded ${
                      infoMembresia.dias_restantes >= 0
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {infoMembresia.dias_restantes}
                  </span>
                </div>
              </>
            )}
          </div>

          {puedeEntrar && (
            <div className="shrink-0">
              <button
                onClick={onEntrada}
                disabled={loadingEntrada || yaEntroHoy}
                className={`rounded px-3 py-2 text-xs ${
                  yaEntroHoy
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-black text-white"
                }`}
                title={
                  yaEntroHoy
                    ? "Ya se registró una entrada hoy"
                    : "Registrar entrada inmediata"
                }
              >
                {yaEntroHoy
                  ? horaPrimeraEntrada
                    ? `Entrada registrada ${horaPrimeraEntrada}`
                    : "Entrada ya registrada"
                  : loadingEntrada
                  ? "Marcando..."
                  : "Entrada (1 clic)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
