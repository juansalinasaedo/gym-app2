// src/hooks/usePagosHoy.js
import { useEffect, useState } from "react";
import { apiGetPagosHoy } from "../api";

export function usePagosHoy() {
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState({
    total_general: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0,
  });

  const fetchPagos = async () => {
    try {
      const data = await apiGetPagosHoy();
      setPagos(data.pagos || []);
      setResumen(data.resumen || resumen);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchPagos(); }, []);
  return { pagos, resumen, fetchPagos };
}
