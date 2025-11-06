// src/components/clients/CreateClientForm.jsx
import { useState } from "react";
import { apiCrearCliente } from "../../api";
import { formatRUT, validarRUT } from "../../utils/rut";

export default function CreateClientForm({ onCreated, setMsg }) {
  const [loading, setLoading] = useState(false);
  const [rutError, setRutError] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    rut: "",
    email: ""
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = validarRUT(form.rut);
    if (!ok) {
      setRutError(true);
      setMsg?.("🚫 RUT inválido. Verifica el dígito verificador.");
      return;
    }
    setLoading(true);
    setMsg?.(null);
    try {
      await apiCrearCliente(form);
      setMsg?.("✅ Cliente creado");
      setForm({ nombre: "", apellido: "", rut: "", email: "" });
      setRutError(false);
      onCreated?.(); // refrescar listas/panel superior
    } catch (err) {
      console.error(err);
      setMsg?.("❌ Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        className="border rounded px-3 py-2"
        placeholder="Nombre"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        required
      />
      <input
        className="border rounded px-3 py-2"
        placeholder="Apellido"
        value={form.apellido}
        onChange={(e) => setForm({ ...form, apellido: e.target.value })}
        required
      />
      <div className="col-span-1">
        <input
          className={`border rounded px-3 py-2 w-full ${rutError ? "border-red-500" : ""}`}
          placeholder="RUT"
          value={form.rut}
          onChange={(e) => {
            const formatted = formatRUT(e.target.value);
            setForm({ ...form, rut: formatted });
            const shouldValidate = formatted.replace(/[^\dkK]/g, "").length > 7;
            setRutError(shouldValidate ? !validarRUT(formatted) : false);
          }}
          required
        />
        {rutError && (
          <div className="text-xs text-red-600 mt-1">
            ⚠️ RUT inválido, verifica el dígito verificador.
          </div>
        )}
      </div>
      <input
        className="border rounded px-3 py-2"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <button
        className="bg-gray-900 text-white rounded px-4 py-2 md:col-span-4 text-sm disabled:opacity-60"
        disabled={loading || rutError}
        title={rutError ? "RUT inválido" : ""}
      >
        {loading ? "Guardando..." : "Crear cliente"}
      </button>
    </form>
  );
}
