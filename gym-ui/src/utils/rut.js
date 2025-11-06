// src/utils/rut.js

// Normalizador básico para comparación insensible a tildes y mayúsculas
export const norm = (s = "") =>
  s.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Solo dígitos del RUT + K
export const rutDigits = (s = "") => s.toString().replace(/[^\dkK]/g, "").toUpperCase();

// Formateo de RUT con puntos y guión
export function formatRUT(value) {
  const clean = (value || "").replace(/[^\dkK]/g, "").toUpperCase();
  if (clean.length <= 1) return clean;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const cuerpoFmt =
    cuerpo
      .split("")
      .reverse()
      .join("")
      .match(/.{1,3}/g)
      ?.join(".")
      .split("")
      .reverse()
      .join("") || cuerpo;
  return `${cuerpoFmt}-${dv}`;
}

// Validador de RUT (módulo 11)
export function validarRUT(rutCompleto) {
  if (!rutCompleto || !rutCompleto.includes("-")) return false;
  const [cuerpoRaw, dvRaw] = rutCompleto.split("-");
  const cuerpo = cuerpoRaw.replace(/\./g, "");
  const dv = dvRaw.toUpperCase();

  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : `${resto}`;
  return dv === dvEsperado;
}
