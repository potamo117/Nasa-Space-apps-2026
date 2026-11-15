// Aviso de cookies / almacenamiento local. Pensado para niñas y niños de 7 a 12 años y sus tutores.
import { consentimiento, fijarConsentimiento, borrarGuardado, puedeGuardar } from "../core/almacen.js";

const ID = "aviso-cookies";

function cerrar() {
  document.getElementById(ID)?.remove();
}

function mostrar(esPreferencias, alDecidir) {
  cerrar();
  const actual = consentimiento();
  const funcionalesOn = actual === "todo";
  const cont = document.createElement("div");
  cont.id = ID;
  cont.className = "cookies-fondo";
  cont.setAttribute("role", "dialog");
  cont.setAttribute("aria-modal", "true");
  cont.setAttribute("aria-labelledby", "cookies-titulo");
  cont.innerHTML = `
    <div class="cookies-caja">
      <h2 id="cookies-titulo">🍪 Cookies y tu privacidad</h2>
      <p>Este juego puede guardar <b>en tu dispositivo</b> tu dificultad, el sonido, tus logros y tu mejor puntuación para que no los pierdas. <b>No usamos publicidad ni te seguimos.</b></p>
      <p class="cookies-padres">👨‍👩‍👧 Si eres menor de edad, pide permiso a tu mamá, papá o tutor antes de aceptar.</p>
      <div class="cookies-tipos">
        <label class="cookies-tipo fijo">
          <input type="checkbox" checked disabled>
          <span><b>Necesarias</b> (siempre activas)<small>Recuerdan tu decisión sobre las cookies.</small></span>
        </label>
        <label class="cookies-tipo">
          <input type="checkbox" id="cookies-funcionales" ${funcionalesOn ? "checked" : ""}>
          <span><b>Funcionales</b> (opcionales)<small>Recuerdan dificultad, sonido, logros y mejor puntuación.</small></span>
        </label>
      </div>
      <div class="cookies-botones">
        <button type="button" class="cookies-btn principal" id="cookies-aceptar">Aceptar todo</button>
        <button type="button" class="cookies-btn" id="cookies-necesarias">Solo necesarias</button>
        <button type="button" class="cookies-btn guardar" id="cookies-guardar">Guardar mi elección</button>
      </div>
      ${esPreferencias ? `<button type="button" class="cookies-link" id="cookies-borrar">🗑️ Borrar mis datos guardados</button>` : ""}
      <p class="cookies-links">
        <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a> ·
        <a href="privacidad.html#cookies" target="_blank" rel="noopener">Cookies</a> ·
        <a href="terminos.html" target="_blank" rel="noopener">Términos y condiciones</a>
      </p>
      ${esPreferencias ? `<button type="button" class="cookies-link" id="cookies-cerrar">Cerrar</button>` : ""}
    </div>`;
  document.body.appendChild(cont);

  const decidir = (valor) => {
    fijarConsentimiento(valor);
    cerrar();
    if (alDecidir) alDecidir(valor);
  };
  cont.querySelector("#cookies-aceptar").addEventListener("click", () => decidir("todo"));
  cont.querySelector("#cookies-necesarias").addEventListener("click", () => decidir("necesarias"));
  cont.querySelector("#cookies-guardar").addEventListener("click", () => {
    decidir(cont.querySelector("#cookies-funcionales").checked ? "todo" : "necesarias");
  });
  cont.querySelector("#cookies-borrar")?.addEventListener("click", () => {
    borrarGuardado();
    const b = cont.querySelector("#cookies-borrar");
    b.textContent = "✅ Datos borrados de este dispositivo";
    b.disabled = true;
  });
  cont.querySelector("#cookies-cerrar")?.addEventListener("click", cerrar);
  cont.querySelector("#cookies-aceptar").focus();
}

// Muestra el aviso si todavía no hay decisión. Llama a alDecidir cuando ya existe una.
export function iniciarCookies(alDecidir) {
  if (consentimiento() === null) mostrar(false, alDecidir);
  else if (alDecidir) alDecidir(consentimiento());
}

// Reabre el panel para cambiar la decisión o borrar los datos.
export function abrirPreferenciasCookies() {
  mostrar(true);
}

export { puedeGuardar };
