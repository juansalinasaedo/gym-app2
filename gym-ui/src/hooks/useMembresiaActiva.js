// src/hooks/useMembresiaActiva.js
import { useEffect, useState } from "react";
import { apiGetMembresiaActiva } from "../api";

export function useMembresiaActiva(clienteId) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!clienteId) { setInfo(null); return; }
    apiGetMembresiaActiva(clienteId)
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [clienteId]);

  const activa =
    !!info && info.estado === "activa" && Number(info.dias_restantes) >= 0;

  return { info, activa };
}
