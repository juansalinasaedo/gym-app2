import { useEffect, useState, useCallback } from "react";
import { apiGetMembresiaActiva } from "../api";

function calcDiasRestantes(fechaFin) {
  if (!fechaFin) return null;

  const hoy = new Date();
  const fin = new Date(`${fechaFin}T00:00:00`);

  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);

  return Math.floor((fin - hoy) / (1000 * 60 * 60 * 24));
}

export function useMembresiaActiva(clienteId) {
  const [info, setInfo] = useState(null);
  const [activa, setActiva] = useState(false);

  const fetchMembresia = useCallback(async () => {
    if (!clienteId) {
      setInfo(null);
      setActiva(false);
      return;
    }

    try {
      const r = await apiGetMembresiaActiva(clienteId);
      const m = r?.membresia || null;

      if (!m) {
        setInfo(null);
        setActiva(false);
        return;
      }

      const diasRestantes = calcDiasRestantes(m.fecha_fin);

      const infoNormalizada = {
        ...m,
        nombre_plan: m.nombre || "",
        dias_restantes: diasRestantes,
      };

      setInfo(infoNormalizada);
      setActiva(Boolean(r?.activa && m?.estado === "activa" && diasRestantes >= 0));
    } catch (e) {
      setInfo(null);
      setActiva(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchMembresia();
  }, [fetchMembresia]);

  return {
    info,
    activa,
    refreshMembresia: fetchMembresia,
  };
}