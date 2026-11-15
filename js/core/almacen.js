// Almacenamiento local que RESPETA el consentimiento de cookies/almacenamiento.
//  - "todo":       las preferencias y el progreso se guardan en este dispositivo (localStorage).
//  - "necesarias": solo se guarda la propia decisión; lo demás vive en memoria durante la sesión.
//  - sin decisión: se trata como "necesarias".
const CLAVE_CONSENTIMIENTO = "lunar-consentimiento";
const PREFIJO = "lunar-";
const memoria = new Map();

function ls() {
  try { return window.localStorage; } catch (e) { return null; }
}

export function consentimiento() {
  const v = ls()?.getItem(CLAVE_CONSENTIMIENTO) ?? null;
  return v === "todo" || v === "necesarias" ? v : null;
}

export function puedeGuardar() {
  return consentimiento() === "todo";
}

export function fijarConsentimiento(valor) {
  const v = valor === "todo" ? "todo" : "necesarias";
  try { ls()?.setItem(CLAVE_CONSENTIMIENTO, v); } catch (e) { /* sin almacenamiento */ }
  if (v === "todo") {
    // Lo que se usó en esta sesión pasa a guardarse.
    memoria.forEach((valorMem, clave) => { try { ls()?.setItem(clave, valorMem); } catch (e) { /* ok */ } });
  } else {
    borrarGuardado();
  }
}

// Quita del dispositivo todo lo guardado por el juego salvo la decisión de consentimiento.
export function borrarGuardado() {
  const s = ls();
  if (!s) return;
  try {
    Object.keys(s).filter((k) => k.startsWith(PREFIJO) && k !== CLAVE_CONSENTIMIENTO).forEach((k) => s.removeItem(k));
  } catch (e) { /* ok */ }
}

// Borra también lo de memoria y la decisión (vuelve a preguntar).
export function borrarTodo() {
  memoria.clear();
  borrarGuardado();
  try { ls()?.removeItem(CLAVE_CONSENTIMIENTO); } catch (e) { /* ok */ }
}

export function leer(clave, defecto = null) {
  const k = PREFIJO + clave;
  if (puedeGuardar()) {
    try { const v = ls()?.getItem(k); if (v !== null && v !== undefined) return v; } catch (e) { /* ok */ }
  }
  return memoria.has(k) ? memoria.get(k) : defecto;
}

export function escribir(clave, valor) {
  const k = PREFIJO + clave;
  const texto = String(valor);
  memoria.set(k, texto);
  if (puedeGuardar()) { try { ls()?.setItem(k, texto); } catch (e) { /* ok */ } }
}

export function leerJSON(clave, defecto) {
  const v = leer(clave, null);
  if (v === null) return defecto;
  try { return JSON.parse(v); } catch (e) { return defecto; }
}

export function escribirJSON(clave, valor) {
  escribir(clave, JSON.stringify(valor));
}
