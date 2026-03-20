// src/components/clients/FaceEnrollAfterCreate.jsx
import { useEffect, useRef, useState } from "react";
import { apiFaceEnroll } from "../../api";

export default function FaceEnrollAfterCreate({
  clienteId,
  onDone,
  onSkip,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (!mounted) return;

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraReady(true);
      } catch (e) {
        console.error(e);
        setError("No fue posible acceder a la cámara.");
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
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error("La cámara no está lista.");
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("No se pudo capturar la imagen."));
          return;
        }
        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  };

  const guardarRostro = async () => {
    try {
      setBusy(true);
      setError("");
      setOkMsg("");

      const blob = await captureBlob();
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });

      await apiFaceEnroll(clienteId, file);

      setOkMsg("✅ Rostro registrado correctamente.");
      if (onDone) onDone();
    } catch (e) {
      console.error(e);
      setError(e?.message || "No se pudo registrar el rostro.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border border-blue-200 bg-blue-50 rounded-xl p-4">
      <div className="mb-2">
        <h3 className="text-base font-semibold text-blue-900">
          Registrar rostro del cliente
        </h3>
        <p className="text-sm text-blue-800">
          El cliente fue creado correctamente. Ahora puedes capturar su rostro
          para marcar asistencia por reconocimiento facial.
        </p>
      </div>

      {error ? (
        <div className="mb-3 border border-red-300 bg-red-50 text-red-800 rounded px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      {okMsg ? (
        <div className="mb-3 border border-green-300 bg-green-50 text-green-800 rounded px-3 py-2 text-sm">
          {okMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-72 object-cover"
          />
        </div>

        <div className="border rounded-xl bg-white p-4">
          <div className="text-sm text-gray-700 mb-3">
            {cameraReady
              ? "Cámara lista. Asegúrate de que el rostro esté bien iluminado y centrado."
              : "Inicializando cámara..."}
          </div>

          <button
            type="button"
            onClick={guardarRostro}
            disabled={busy || !cameraReady}
            className="w-full rounded-lg bg-slate-900 text-white py-2.5 hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Guardando rostro..." : "Capturar y guardar rostro"}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="w-full mt-2 rounded-lg border border-gray-300 bg-white py-2.5 hover:bg-gray-50"
          >
            Omitir por ahora
          </button>

          <p className="mt-3 text-xs text-gray-500">
            Puedes omitir este paso y registrar el rostro más tarde desde la edición del cliente.
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}