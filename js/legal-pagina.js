import "./ui/iconos.js";
// Rellena los datos del responsable (js/legal-config.js) y conecta el botón de cookies y el selector de idioma
// en las páginas legales. El contenido de cada idioma vive en bloques <div data-lang="es|en"> (ver css/idioma.css).
import { LEGAL } from "./legal-config.js";
import { abrirPreferenciasCookies } from "./ui/cookies.js";
import { getIdioma, selectorIdiomaHTML, enlazarSelectorIdioma } from "./core/i18n.js";

function rellenar() {
  const en = getIdioma() === "en";
  document.querySelectorAll("[data-legal]").forEach((el) => {
    const clave = el.dataset.legal;
    const v = (en && LEGAL.en && LEGAL.en[clave]) || LEGAL[clave];
    if (clave === "contacto") {
      const issues = en ? "(“Issues” section)" : "(sección “Issues”)";
      const o = en ? "or through" : "o mediante";
      el.innerHTML = LEGAL.correo
        ? `<a href="mailto:${LEGAL.correo}">${LEGAL.correo}</a> ${o} <a href="${LEGAL.web}" target="_blank" rel="noopener">${LEGAL.web}</a>`
        : `<a href="${LEGAL.web}" target="_blank" rel="noopener">${LEGAL.web}</a> ${issues}`;
    } else if (v) {
      el.textContent = v;
    }
  });
}

function montarSelector() {
  const cont = document.getElementById("selector-idioma-legal");
  if (!cont) return;
  cont.innerHTML = selectorIdiomaHTML();
  enlazarSelectorIdioma(cont);
}

rellenar();
montarSelector();
window.addEventListener("idioma-cambio", () => { rellenar(); montarSelector(); });
document.querySelectorAll(".btn-cookies").forEach((b) => b.addEventListener("click", abrirPreferenciasCookies));

// Enlace directo a la sección de cookies (privacidad.html#cookies): en inglés el título tiene otro id.
if (location.hash === "#cookies" && getIdioma() === "en") document.getElementById("cookies-en")?.scrollIntoView();
