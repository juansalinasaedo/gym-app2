// src/hooks/useMembresias.js
import { useEffect, useState } from "react";
import { apiGetMembresias, apiCrearMembresia } from "../api";

export function useMembresias() {
  const [membresias, setMembresias] = useState([]);

  const fetchMembresias = async () => {
    try { setMembresias(await apiGetMembresias()); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMembresias(); }, []);

  const crearMembresia = async (payload) => {
    await apiCrearMembresia(payload);
    await fetchMembresias();
  };

  return { membresias, fetchMembresias, crearMembresia };
}
