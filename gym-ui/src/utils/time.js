// src/utils/time.js
export function horaBonita(row) {
    if (row.hora) return row.hora; // ya viene formateada del backend
    if (row.fecha_hora) {
      try {
        const d = new Date(row.fecha_hora);
        return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      } catch {}
    }
    return "";
  }  