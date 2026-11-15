// Internacionalización (ES / EN).
//
// Convención: el TEXTO EN ESPAÑOL ES LA CLAVE. t("Hola") devuelve "Hola" en español y la
// traducción de js/i18n/en.js en inglés. Los parámetros se escriben {nombre}:
//     t("Quedan {n} zonas", { n: 3 })
// Así el español original queda intacto en el código y solo hay que mantener un diccionario (en.js).
//
// HTML estático: data-i18n="Texto en español"  → textContent
//                data-i18n-aria="..." / data-i18n-title="..." → aria-label / title
import { leer, escribir } from "./almacen.js";
import { EN } from "../i18n/en.js";

export const IDIOMAS = ["es", "en"];
const CLAVE = "idioma";

function detectar() {
  const guardado = leer(CLAVE, null);
  if (IDIOMAS.includes(guardado)) return guardado;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "es";
  return String(nav).toLowerCase().startsWith("en") ? "en" : "es";
}

let idioma = detectar();
const faltantes = new Set();

export function getIdioma() {
  return idioma;
}

function rellenar(texto, params) {
  if (!params) return texto;
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

export function t(es, params) {
  if (idioma === "es") return rellenar(es, params);
  const en = EN[es];
  if (en === undefined) {
    if (!faltantes.has(es)) {
      faltantes.add(es);
      console.warn("[i18n] falta traducción al inglés:", es);
    }
    return rellenar(es, params);
  }
  return rellenar(en, params);
}

// Traduce los elementos con data-i18n* dentro de `raiz`.
export function traducirDOM(raiz = document) {
  if (!raiz || !raiz.querySelectorAll) return;
  raiz.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  raiz.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  raiz.querySelectorAll("[data-i18n-title]").forEach((el) => { el.setAttribute("title", t(el.dataset.i18nTitle)); });
}

function aplicarDocumento() {
  document.documentElement.lang = idioma;
  const titulo = document.documentElement.dataset.titulo; // clave en español del <title>
  if (titulo) document.title = t(titulo);
  traducirDOM(document);
}

// Cambia el idioma, lo guarda y avisa a toda la app con el evento "idioma-cambio".
export function setIdioma(nuevo) {
  if (!IDIOMAS.includes(nuevo) || nuevo === idioma) return;
  idioma = nuevo;
  escribir(CLAVE, nuevo);
  aplicarDocumento();
  window.dispatchEvent(new CustomEvent("idioma-cambio", { detail: { idioma } }));
}

// HTML de un selector ES | EN (para pantallas generadas con innerHTML).
export function selectorIdiomaHTML() {
  return `<div class="idioma-sel" role="group" aria-label="${t("Idioma")}">
    ${IDIOMAS.map((l) => `<button type="button" class="idioma-btn${l === idioma ? " activo" : ""}" data-idioma="${l}" lang="${l}" aria-pressed="${l === idioma}">${l.toUpperCase()}</button>`).join("")}
  </div>`;
}

// Conecta los botones de un selector; al elegir idioma llama a `alCambiar`.
export function enlazarSelectorIdioma(raiz, alCambiar) {
  raiz.querySelectorAll("[data-idioma]").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.idioma === idioma) return;
      setIdioma(b.dataset.idioma);
      if (alCambiar) alCambiar(idioma);
    });
  });
}

// Se aplica al cargar el módulo (el DOM de index.html ya está parseado: los scripts son type="module").
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicarDocumento);
else aplicarDocumento();
