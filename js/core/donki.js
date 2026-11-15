// Datos reales de clima espacial (NASA DONKI) con respaldo local si falla la red.
import { t } from "./i18n.js";
const API = "https://api.nasa.gov/DONKI";
const KEY = "DEMO_KEY";
const TIMEOUT_MS = 4000;

let cache = null;
let promesa = null;

const iso = (d) => d.toISOString().slice(0, 10);

async function pedir(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const datos = await r.json();
    if (!Array.isArray(datos)) throw new Error("respuesta inesperada");
    return datos;
  } finally {
    clearTimeout(t);
  }
}

const RESPALDO_MINIMO = {
  FLR: [{ flrID: "respaldo", peakTime: "2024-05-14T17:03Z", classType: "X8.7" }],
  CME: [],
};

export function cargarDonki() {
  if (cache) return Promise.resolve(cache);
  if (promesa) return promesa;
  promesa = (async () => {
    try {
      const fin = new Date();
      const ini = new Date(Date.now() - 30 * 86400000);
      const q = `startDate=${iso(ini)}&endDate=${iso(fin)}&api_key=${KEY}`;
      const [FLR, CME] = await Promise.all([pedir(`${API}/FLR?${q}`), pedir(`${API}/CME?${q}`)]);
      cache = { fuente: "api", FLR, CME };
    } catch (e) {
      try {
        const r = await fetch(new URL("../../data/donki-respaldo.json", import.meta.url));
        const j = await r.json();
        cache = { fuente: "respaldo", FLR: j.FLR || [], CME: j.CME || [] };
      } catch (e2) {
        cache = { fuente: "respaldo", ...RESPALDO_MINIMO };
      }
    }
    if (!cache.FLR.length) cache.FLR = RESPALDO_MINIMO.FLR;
    return cache;
  })();
  return promesa;
}

function valorClase(clase) {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/i.exec(clase || "");
  if (!m) return 0;
  const base = { A: 0, B: 1, C: 2, M: 3, X: 4 }[m[1].toUpperCase()];
  return base * 100 + parseFloat(m[2]);
}

// Riesgo 0-100 según la clase de la fulguración (C moderado, M elevado, X extremo).
function riesgoDe(clase) {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/i.exec(clase || "");
  if (!m) return 75;
  const n = parseFloat(m[2]);
  switch (m[1].toUpperCase()) {
    case "X": return Math.min(97, 85 + n);
    case "M": return Math.min(84, 66 + n * 2);
    default:  return Math.min(65, 45 + n * 2);
  }
}

// La fulguración más fuerte de los datos cargados (o null si aún no hay datos).
export function eventoSolarDestacado() {
  if (!cache || !cache.FLR.length) return null;
  const mejor = cache.FLR.reduce((a, b) => (valorClase(b.classType) > valorClase(a.classType) ? b : a));
  const f = mejor.peakTime || mejor.beginTime || "";
  return {
    clase: mejor.classType || "?",
    fecha: f.slice(0, 10),
    fuente: cache.fuente,
    riesgo: Math.round(riesgoDe(mejor.classType)),
    cmes: (cache.CME || []).length,
  };
}

export function textoDonki() {
  const d = eventoSolarDestacado();
  if (!d) return "";
  const origen = d.fuente === "api" ? t("NASA DONKI (datos reales)") : t("NASA DONKI (datos de respaldo)");
  return t("{origen}: fulguración clase {clase} del {fecha}.", { origen, clase: d.clase, fecha: d.fecha });
}
