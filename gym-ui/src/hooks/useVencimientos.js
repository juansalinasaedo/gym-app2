// src/hooks/useVencimientos.js
import { useEffect, useState } from "react";
import { apiGetVencimientosProximos } from "../api";

export function useVencimientos() {
  const [vencimientos, setVencimientos] = useState([]);
  const fetchVencimientos = async () => {
    try { setVencimientos((await apiGetVencimientosProximos()).vencimientos || []); }
    catch (e) { console.error(e); }
  };
  useEffect(() => { fetchVencimientos(); }, []);
  return { vencimientos, fetchVencimientos };
}
