import { useEffect, useState } from "react";
import {
  apiGetMembresias,
  apiCrearMembresia,
  apiEliminarMembresia,
} from "../api";

export function useMembresias() {
  const [membresias, setMembresias] = useState([]);

  const fetchMembresias = async () => {
    try {
      setMembresias(await apiGetMembresias());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMembresias();
  }, []);

  const crearMembresia = async (payload) => {
    await apiCrearMembresia(payload);
    await fetchMembresias();
  };

  const eliminarMembresia = async (id) => {
    await apiEliminarMembresia(id);
    await fetchMembresias();
  };

  return { membresias, fetchMembresias, crearMembresia, eliminarMembresia };
}
