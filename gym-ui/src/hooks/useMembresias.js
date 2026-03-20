import { useEffect, useState } from "react";
import {
  apiGetMembresias,
  apiCrearMembresia,
  apiDeleteMembresia,
  apiUpdateMembresia,
} from "../api";

export function useMembresias() {
  const [membresias, setMembresias] = useState([]);

  const fetchMembresias = async () => {
    const data = await apiGetMembresias();
    setMembresias(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchMembresias().catch(console.error);
  }, []);

  const crearMembresia = async (payload) => {
    await apiCrearMembresia(payload);
    await fetchMembresias();
  };

  const eliminarMembresia = async (id) => {
    await apiDeleteMembresia(id);
    await fetchMembresias();
  };

  const actualizarMembresia = async (id, payload) => {
    await apiUpdateMembresia(id, payload);
    await fetchMembresias();
  };

  return {
    membresias,
    fetchMembresias,
    crearMembresia,
    eliminarMembresia,
    actualizarMembresia,
  };
}
