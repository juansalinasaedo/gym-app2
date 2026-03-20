import React, { useEffect, useRef, useState } from "react";
import { apiFaceIdentify, apiFaceConfirm } from "../api";

/**
 * Modo B (Confirmación):
 * 1) Detectar -> llama /api/face/identify y muestra candidato
 * 2) Confirmar -> llama /api/asistencias/face/confirm y registra asistencia
 */
export default function FaceCheckin({ onSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("Listo");
  const [candidate, setCandidate] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!mounted) return;

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        setStatus("Cámara lista");
      } catch (e) {
        setStatus("No se pudo acceder a la cámara (permiso o dispositivo)");
      }
    })();

    return () => {
      mounted = false;
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      } catch {}
    };
  }, []);

  const captureBlob = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return null;

    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;

    c.width = w;
    c.height = h;

    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, w, h);

    return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.9));
  };

  const onIdentify = async () => {
    setBusy(true);
    setCandidate(null);
    setStatus("Analizando...");

    try {
      const blob = await captureBlob();
      if (!blob) throw new Error("No se pudo capturar imagen (cámara no lista)");

      const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
      const r = await apiFaceIdentify(file);

      if (!r?.match) {
        const scoreTxt = r?.score != null ? ` (score ${Number(r.score).toFixed(3)})` : "";
        setStatus(`Sin coincidencia${scoreTxt}`);
        return;
      }

      setCandidate({ cliente: r.cliente, score: r.score });
      setStatus("Coincidencia encontrada. Presiona Confirmar.");
    } catch (e) {
      setStatus(e?.message || "Error al detectar");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!candidate?.cliente?.cliente_id) return;

    setBusy(true);
    setStatus("Registrando asistencia...");

    try {
      const r = await apiFaceConfirm(candidate.cliente.cliente_id, candidate.score);
      setStatus(`✅ Asistencia registrada (${r?.hora || "ok"})`);
      setCandidate(null);

      if (onSuccess) {
        await onSuccess();
      }
    } catch (e) {
      setStatus(e?.message || "Error confirmando asistencia");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl shadow bg-white p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h2 className="text-lg font-semibold text-gym-text-main">Asistencia por rostro</h2>
        <span className="text-sm text-gym-text-muted">{status}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-72 object-cover" />
        </div>

        <div className="rounded-xl border p-3">
          {!candidate ? (
            <p className="text-sm text-gym-text-muted">
              Presiona <b>Detectar</b> para identificar. Si hay coincidencia, podrás confirmar manualmente.
            </p>
          ) : (
            <div className="space-y-1">
              <div className="text-sm">
                <div className="font-semibold text-gym-text-main">
                  {candidate.cliente?.nombre} {candidate.cliente?.apellido}
                </div>
                <div className="text-gym-text-muted">RUT: {candidate.cliente?.rut || "—"}</div>
                <div className="text-gym-text-muted">
                  Score: {candidate.score != null ? Number(candidate.score).toFixed(3) : "—"}
                </div>
              </div>

              <button
                onClick={onConfirm}
                disabled={busy}
                className="mt-3 w-full rounded-xl bg-green-600 text-white py-2 hover:bg-green-700 disabled:opacity-60"
              >
                Confirmar asistencia
              </button>
            </div>
          )}

          <button
            onClick={onIdentify}
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-slate-900 text-white py-2 hover:bg-slate-800 disabled:opacity-60"
          >
            Detectar
          </button>

          <p className="mt-2 text-xs text-gym-text-muted">
            Tip: buena luz y rostro centrado mejora el match.
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}