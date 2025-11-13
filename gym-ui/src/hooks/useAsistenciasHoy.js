// src/hooks/useAsistenciasHoy.js
import { useCallback, useEffect, useState } from "react";
import { apiGetAsistenciasHoy, apiMarcarAsistencia } from "../api";

export function useAsistenciasHoy() {
  const [items, setItems] = useState([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const fetchAsistencias = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGetAsistenciasHoy();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Error al cargar asistencias.");
    }
  }, []);

  useEffect(() => {
    fetchAsistencias();
  }, [fetchAsistencias]);

  /** Marca asistencia para un cliente. Por defecto es "entrada". */
  const marcar = useCallback(
    async (clienteId, tipo = "entrada") => {
      setPosting(true);
      setError(null);
      try {
        await apiMarcarAsistencia(clienteId, tipo);
        await fetchAsistencias();
        return { ok: true };
      } catch (e) {
        // mensaje amigable desde el backend si viene como JSON {error|detail}
        const msg = e?.message || "No se pudo registrar asistencia.";
        setError(msg);
        return { ok: false, message: msg };
      } finally {
        setPosting(false);
      }
    },
    [fetchAsistencias]
  );

  /** Azúcar: marcar ENTRADA en 1 clic */
  const marcarEntrada = useCallback(
    (clienteId) => marcar(clienteId, "entrada"),
    [marcar]
  );

  /** (Opcional) Azúcar: marcar SALIDA si más adelante lo usas */
  const marcarSalida = useCallback(
    (clienteId) => marcar(clienteId, "salida"),
    [marcar]
  );

  return {
    items,
    fetchAsistencias,
    posting,
    error,
    marcar,          // genérico
    marcarEntrada,   // atajo
    marcarSalida,    // atajo (por si lo necesitas)
  };
}
