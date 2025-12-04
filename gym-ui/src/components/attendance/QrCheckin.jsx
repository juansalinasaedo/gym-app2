// src/components/attendance/QrCheckin.jsx
import React, { useEffect, useRef, useState } from "react";
import { apiMarcarAsistenciaQR } from "../../api";

export default function QrCheckin({ onSuccess }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

 /* useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);*/

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = token.trim();
    if (!t || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await apiMarcarAsistenciaQR(t);
      setResult(resp || {});
      if (onSuccess) {
        onSuccess();
      }
    } catch (e) {
      setError(e.message || "Error al registrar asistencia.");
    } finally {
      setLoading(false);
      setToken("");
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const cliente = result?.cliente;
  const duplicado = !!result?.duplicado;
  const hora = result?.hora || "";

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 items-start md:items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Escáner QR
          </label>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gym-primary focus:border-gym-primary"
            placeholder="Coloca el cursor aquí y escanea el código QR del cliente..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            El lector QR actúa como teclado: escanea el código y presiona Enter.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md border border-gym-primary text-gym-primary hover:bg-gym-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Registrando..." : "Registrar entrada"}
        </button>
      </form>

      {error && (
        <div className="text-xs border border-red-200 bg-red-50 text-red-700 rounded-md px-3 py-2">
          ❌ {error}
        </div>
      )}

      {result && !error && (
        <div
          className={
            "text-xs rounded-md px-3 py-2 border " +
            (duplicado
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800")
          }
        >
          <div className="font-semibold mb-1">
            {duplicado ? "Asistencia ya registrada" : "Asistencia registrada"}
          </div>
          {cliente && (
            <div className="mb-1">
              Cliente:{" "}
              <span className="font-medium">
                {cliente.nombre} {cliente.apellido}
              </span>{" "}
              · RUT {cliente.rut}
            </div>
          )}
          {hora && (
            <div className="mb-1">
              Hora: <span className="font-mono">{hora}</span>
            </div>
          )}
          <div className="text-[11px] opacity-80">
            {result.mensaje ||
              (duplicado
                ? "El cliente ya tenía una entrada registrada para hoy."
                : "Entrada marcada para la jornada actual.")}
          </div>
        </div>
      )}
    </div>
  );
}
