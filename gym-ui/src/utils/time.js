// src/utils/time.js
export function horaBonita(value) {
  if (!value) return "";

  // Caso 1: viene un objeto completo
  if (typeof value === "object") {
    if (value.hora) return value.hora;

    if (value.fecha_hora) {
      const raw = String(value.fecha_hora).trim();
      const normalized =
        raw.includes(" ") && !raw.includes("T")
          ? raw.replace(" ", "T")
          : raw;

      const d = new Date(normalized);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      return raw.slice(11, 16) || "";
    }

    return "";
  }

  // Caso 2: viene string directo con fecha/hora
  if (typeof value === "string") {
    const raw = value.trim();
    const normalized =
      raw.includes(" ") && !raw.includes("T")
        ? raw.replace(" ", "T")
        : raw;

    const d = new Date(normalized);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return raw.slice(11, 16) || "";
  }

  return "";
}