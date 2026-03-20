// src/components/clients/CreateClientForm.jsx
import { useState } from "react";
import { apiCrearCliente } from "../../api";
import { formatRUT, validarRUT } from "../../utils/rut";
import FaceEnrollAfterCreate from "./FaceEnrollAfterCreate";

function getApiErrorMessage(err) {
  if (err?.message && typeof err.message === "string") return err.message;
  if (err?.response?.data) {
    const d = err.response.data;
    return d?.error || d?.message || d?.detail || "❌ Error al crear cliente";
  }
  if (err?.data) {
    return err.data?.error || err.data?.message || "❌ Error al crear cliente";
  }
  return "❌ Error al crear cliente";
}

export default function CreateClientForm({ onCreated, setMsg, onCreate }) {
  const [loading, setLoading] = useState(false);
  const [rutError, setRutError] = useState(false);
  const [clienteCreadoId, setClienteCreadoId] = useState(null);

  const [localMsg, setLocalMsg] = useState(null); // { type, text }

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    rut: "",
    email: "",
    direccion: "",
    estado_laboral: "",
    sexo: "",
  });

  const resetForm = () => {
    setForm({
      nombre: "",
      apellido: "",
      rut: "",
      email: "",
      direccion: "",
      estado_laboral: "",
      sexo: "",
    });
    setRutError(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const ok = validarRUT(form.rut);
    if (!ok) {
      setRutError(true);
      setLocalMsg({
        type: "error",
        text: "🚫 RUT inválido. Verifica el dígito verificador.",
      });
      return;
    }

    setLoading(true);
    setLocalMsg(null);
    setMsg?.(null);

    try {
      const creator = onCreate || apiCrearCliente;
      const res = await creator(form);

      const newId =
        res?.cliente_id ||
        res?.cliente?.cliente_id ||
        null;

      setLocalMsg({
        type: "success",
        text: "✅ Cliente creado correctamente. Ahora puedes registrar su rostro.",
      });

      resetForm();

      if (newId) {
        setClienteCreadoId(newId);
        onCreated?.(newId);
      } else {
        setClienteCreadoId(null);
      }
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err);
      setLocalMsg({ type: "error", text: msg });
      setClienteCreadoId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md:col-span-4">
      {localMsg?.text && (
        <div
          className={`border rounded px-3 py-2 mb-3 text-sm ${
            localMsg.type === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          {localMsg.text}
        </div>
      )}

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
            className={`border rounded px-3 py-2 w-full ${
              rutError ? "border-red-500" : ""
            }`}
            placeholder="RUT"
            value={form.rut}
            onChange={(e) => {
              const formatted = formatRUT(e.target.value);
              setForm({ ...form, rut: formatted });
              const shouldValidate =
                formatted.replace(/[^\dkK]/g, "").length > 7;
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
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="border rounded px-3 py-2 md:col-span-2"
          placeholder="Dirección"
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
        />

        <select
          className="border rounded px-3 py-2"
          value={form.estado_laboral}
          onChange={(e) => setForm({ ...form, estado_laboral: e.target.value })}
        >
          <option value="">Estado Laboral</option>
          <option value="Dependiente">Dependiente</option>
          <option value="Independiente">Independiente</option>
          <option value="Estudiante">Estudiante</option>
          <option value="Cesante">Cesante</option>
          <option value="Otro">Otro</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={form.sexo}
          onChange={(e) => setForm({ ...form, sexo: e.target.value })}
        >
          <option value="">Sexo</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="O">Otro</option>
        </select>

        <button
          className="bg-gray-900 text-white rounded px-4 py-2 md:col-span-4 text-sm disabled:opacity-60"
          disabled={loading || rutError}
        >
          {loading ? "Guardando..." : "Crear cliente"}
        </button>
      </form>

      {clienteCreadoId ? (
        <FaceEnrollAfterCreate
          clienteId={clienteCreadoId}
          onDone={() => {
            setLocalMsg({
              type: "success",
              text: "✅ Cliente creado y rostro registrado correctamente.",
            });
          }}
          onSkip={() => {
            setLocalMsg({
              type: "success",
              text: "✅ Cliente creado correctamente. El registro facial quedó pendiente.",
            });
            setClienteCreadoId(null);
          }}
        />
      ) : null}
    </div>
  );
}