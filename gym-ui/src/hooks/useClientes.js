// src/hooks/useClientes.js
import { useEffect, useState } from "react";
import { apiGetClientes, apiCrearCliente } from "../api";

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClientes = async () => {
    try {
      const data = await apiGetClientes();
      setClientes(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const crearCliente = async (payload) => {
    setLoading(true);
    try {
      const created = await apiCrearCliente(payload);
      await fetchClientes();
      return created; // importante: devolver respuesta con cliente_id
    } finally {
      setLoading(false);
    }
  };

  return { clientes, fetchClientes, crearCliente, loading };
}