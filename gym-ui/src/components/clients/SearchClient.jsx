// src/components/clients/SearchClient.jsx
import { useState } from "react";

export default function SearchClient({ clientes, value, onSelect }) {
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);

  const filtered = clientes
    .filter((c) => {
      const full = `${c.nombre} ${c.apellido} ${c.rut}`.toLowerCase();
      return full.includes(query.toLowerCase());
    })
    .slice(0, 10);

  const handleSelect = (c) => {
    onSelect(String(c.cliente_id));
    setQuery(`${c.nombre} ${c.apellido} (${c.rut})`);
    setShowList(false);
  };

  const handleClear = () => {
    setQuery("");
    onSelect(""); // Limpia la selección en el padre (CashierPanel)
    setShowList(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs mb-1 text-gray-600">
        Buscar cliente (nombre o RUT)
      </label>

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="border rounded px-3 py-2 w-full"
          placeholder="Ej: 'Juan' o '15777461-6'"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowList(true);
          }}
          onFocus={() => setShowList(true)}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
            title="Limpiar búsqueda"
          >
            🧹 Limpiar
          </button>
        )}
      </div>

      {showList && filtered.length > 0 && (
        <ul
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto"
          role="listbox"
        >
          {filtered.map((c) => (
            <li
              key={c.cliente_id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(c);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
            >
              <div className="font-medium text-gray-900">
                {c.nombre} {c.apellido}
              </div>
              <div className="text-xs text-gray-600">{c.rut}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
