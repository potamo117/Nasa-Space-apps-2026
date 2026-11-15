// Mini event bus (P1). Todos los módulos se comunican con eventos de window.
//
// EVENTOS DEL JUEGO (detail entre llaves):
//  dia-cambio        {dia}                  empieza un día (06:00)
//  hora-cambio       {hora, minutos, dia}   cada minuto de juego ("06:01", ...)
//  estado-cambio     {}                     cada segundo, tras actualizar recursos
//  evento-inicio     {evento}               se disparó un evento aleatorio
//  fallos-cambio     {fallos}               cambió estado.fallos
//  prorroga-inicio   {segundos}             20:00 con fallos: cuenta regresiva
//  prorroga-tick     {segundos}             cada segundo de la prórroga
//  apagon            {}                     la electricidad llegó a 0
//  victoria          {}                     se completó el Día 5
//  derrota           {motivo}               fin del juego por derrota
//
// EVENTOS QUE ENVÍAN LOS DEMÁS A P1:
//  minijuego-terminado  {sector, exito}     lo emite P2 (modal.js) al terminar
//  juego-iniciar        {}                  lo emite P2 (botón de bienvenida)
export function emitir(nombre, detail = {}) {
  window.dispatchEvent(new CustomEvent(nombre, { detail }));
}

// Devuelve una función para cancelar la suscripción.
export function escuchar(nombre, fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(nombre, handler);
  return () => window.removeEventListener(nombre, handler);
}
