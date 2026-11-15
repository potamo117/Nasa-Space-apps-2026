import "./ui/iconos.js";
// Rellena los datos del responsable (js/legal-config.js) y conecta el botón de cookies en las páginas legales.
import { LEGAL } from "./legal-config.js";
import { abrirPreferenciasCookies } from "./ui/cookies.js";

document.querySelectorAll("[data-legal]").forEach((el) => {
  const v = LEGAL[el.dataset.legal];
  if (el.dataset.legal === "contacto") {
    el.innerHTML = LEGAL.correo
      ? `<a href="mailto:${LEGAL.correo}">${LEGAL.correo}</a> o mediante <a href="${LEGAL.web}" target="_blank" rel="noopener">${LEGAL.web}</a>`
      : `<a href="${LEGAL.web}" target="_blank" rel="noopener">${LEGAL.web}</a> (sección “Issues”)`;
  } else if (v) {
    el.textContent = v;
  }
});
document.getElementById("btn-cookies")?.addEventListener("click", abrirPreferenciasCookies);
