// src/hooks/useAsistenciasHoy.js
import { useEffect, useState } from "react";
import { apiGetAsistenciasHoy, apiMarcarAsistencia } from "../api";

export function useAsistenciasHoy() {
  const [items, setItems] = useState([]);
  const [posting, setPosting] = useState(false);

  const fetchAsistencias = async () => {
    try { setItems(await apiGetAsistenciasHoy()); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAsistencias(); }, []);

  const marcarEntrada = async (cliente_id) => {
    setPosting(true);
    try {
      await apiMarcarAsistencia({ cliente_id, tipo: "entrada" });
      await fetchAsistencias();
      return { ok: true };
    } catch (err) {
      const status = err?.response?.status || err?.status;
      const data = err?.data;
      return { ok: false, status, data };
    } finally {
      setPosting(false);
    }
  };

  return { items, fetchAsistencias, marcarEntrada, posting };
}
