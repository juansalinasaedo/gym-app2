// src/components/clients/SearchClient.jsx
import { useEffect, useMemo, useState } from "react";
import { norm, rutDigits, formatRUT, validarRUT } from "../../utils/rut";

export default function SearchClient({ clientes, value, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);

  useEffect(() => {
    const c = clientes.find((x) => String(x.cliente_id) === String(value));
    if (c) setQ(`${c.nombre} ${c.apellido} (${c.rut})`);
  }, [value, clientes]);

  const sugerencias = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    const sNorm = norm(s);
    const sDigits = rutDigits(s);
    return clientes
      .filter((c) => {
        const name = norm(`${c.nombre} ${c.apellido}`);
        const r = rutDigits(c.rut);
        return name.includes(sNorm) || (sDigits && r.startsWith(sDigits));
      })
      .slice(0, 10);
  }, [q, clientes]);

  const pick = (c) => {
    onSelect(String(c.cliente_id));
    setQ(`${c.nombre} ${c.apellido} (${c.rut})`);
    setOpen(false);
    setHi(-1);
  };

  return (
    <div className="relative">
      <label className="block text-xs mb-1 text-gray-600">Buscar cliente (nombre o RUT)</label>
      <input
        className="border rounded px-3 py-2 w-full"
        value={q}
        placeholder="Ej: 'Juan' o '15777461-6'"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !sugerencias.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => (i + 1) % sugerencias.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => (i <= 0 ? sugerencias.length - 1 : i - 1)); }
          if (e.key === "Enter") { e.preventDefault(); const c = hi >= 0 ? sugerencias[hi] : sugerencias[0]; if (c) pick(c); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && sugerencias.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
          {sugerencias.map((c, idx) => (
            <li
              key={c.cliente_id}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              onMouseEnter={() => setHi(idx)}
              className={`px-3 py-2 text-sm cursor-pointer ${idx === hi ? "bg-gray-100" : ""}`}
            >
              <div className="font-medium text-gray-900">{c.nombre} {c.apellido}</div>
              <div className="text-xs text-gray-600">{c.rut}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
