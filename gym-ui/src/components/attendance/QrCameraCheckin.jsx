// src/components/attendance/QrCameraCheckin.jsx
import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { apiMarcarAsistenciaQR } from "../../api";

const SCANNER_ID = "qr-camera-reader";

export default function QrCameraCheckin({ onSuccess }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!scanning) return;

    const onScanSuccess = async (decodedText /*, decodedResult */) => {
      const token = (decodedText || "").trim();
      if (!token) return;

      // Evitar múltiples lecturas del mismo QR
      setScanning(false);
      setError(null);
      setResult(null);

      try {
        const resp = await apiMarcarAsistenciaQR(token);
        setResult(resp || {});
        if (onSuccess) {
          onSuccess();
        }
      } catch (e) {
        setError(e.message || "Error al registrar asistencia.");
      }
    };

    const onScanError = (err) => {
      // Puedes loguearlo si quieres, pero normalmente se ignora
      // console.debug("QR scan error:", err);
    };

    const scanner = new Html5QrcodeScanner(
      SCANNER_ID,
      {
        fps: 10,
        qrbox: 250,
      },
      false
    );

    scannerRef.current = scanner;
    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner
        .clear()
        .catch(() => {
          /* nada */
        });
    };
  }, [scanning, onSuccess]);

  const handleRestart = () => {
    setResult(null);
    setError(null);
    setScanning(true);
  };

  const cliente = result?.cliente;
  const duplicado = !!result?.duplicado;
  const hora = result?.hora || "";

  return (
    <div className="space-y-3">
      <div
        id={SCANNER_ID}
        className="w-full max-w-md border border-gray-200 rounded-lg overflow-hidden bg-black/5"
      />

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

      <div className="flex gap-2 text-[11px] text-gray-600">
        <button
          type="button"
          onClick={handleRestart}
          className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
        >
          Volver a escanear
        </button>
        <span className="self-center">
          Al escanear un código válido, se detiene la cámara para evitar lecturas
          repetidas. Usa “Volver a escanear” para leer otro cliente.
        </span>
      </div>
    </div>
  );
}
