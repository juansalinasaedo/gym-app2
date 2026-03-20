import { useEffect, useState } from "react";
import { apiGetMembresiaActiva } from "../api";

export function useMembresiaActiva(clienteId) {
  const [info, setInfo] = useState(null);
  const [activa, setActiva] = useState(false);

  const fetchMembresia = async () => {
    if (!clienteId) {
      setInfo(null);
      setActiva(false);
      return;
    }

    try {
      const r = await apiGetMembresiaActiva(clienteId);
      setInfo(r || null);
      setActiva(r?.estado === "activa");
    } catch (e) {
      setInfo(null);
      setActiva(false);
    }
  };

  useEffect(() => {
    fetchMembresia();
  }, [clienteId]);

  return {
    info,
    activa,
    refreshMembresia: fetchMembresia
  };
}