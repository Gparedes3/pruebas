// Reglas de negocio del sistema de citas (funciones puras, sin BD).
// Cada función está escrita con decisiones explícitas para poder dibujar su CFG.

const EDAD_ADULTO = 18;
const HORA_APERTURA = 8;
const HORA_CIERRE = 17;
const HORA_CIERRE_SABADO = 12;
const HORA_ALMUERZO = 13;
const HORAS_LIMITE_CANCELACION = 24;
const MONTO_PENALIZACION = 10;

// Regla 1: Edad. Pediatría solo menores de 18; medicina general solo adultos.
function validarEdad(edad, especialidad) {
  if (especialidad === 'pediatria' && edad >= EDAD_ADULTO) {
    return { ok: false, motivo: 'Pediatría solo atiende a menores de 18 años' };
  }
  if (especialidad === 'medicina_general' && edad < EDAD_ADULTO) {
    return { ok: false, motivo: 'Medicina general solo atiende a pacientes adultos' };
  }
  return { ok: true };
}

// Regla 2: Horarios. L-V 08:00-17:00, sábado 08:00-12:00, domingo cerrado, 13:00-14:00 almuerzo.
function validarHorario(fecha) {
  const dia = fecha.getDay();
  const hora = fecha.getHours();
  if (dia === 0) {
    return { ok: false, motivo: 'Domingo no operativo' };
  }
  if (hora < HORA_APERTURA) {
    return { ok: false, motivo: 'Antes del horario de atención' };
  }
  if (dia === 6 && hora >= HORA_CIERRE_SABADO) {
    return { ok: false, motivo: 'El sábado se atiende solo hasta las 12:00' };
  }
  if (hora >= HORA_CIERRE) {
    return { ok: false, motivo: 'Después del horario de atención' };
  }
  if (hora === HORA_ALMUERZO) {
    return { ok: false, motivo: 'Franja de almuerzo' };
  }
  return { ok: true };
}

// Regla 3: Choque de citas. Mismo médico, cita activa y rangos que se solapan.
function hayChoque(citas, nueva) {
  for (const c of citas) {
    if (c.medicoId !== nueva.medicoId) continue;
    if (c.estado === 'cancelada') continue;
    if (nueva.inicio < c.fin && c.inicio < nueva.fin) {
      return true;
    }
  }
  return false;
}

// Regla 4: Penalización tardía. Cancelar con menos de 24 h cobra multa, salvo emergencia.
function calcularPenalizacion(inicioCita, fechaCancelacion, esEmergencia) {
  const horas = (inicioCita - fechaCancelacion) / 3600000;
  const cancelacionTardia = horas < HORAS_LIMITE_CANCELACION;
  if (cancelacionTardia && !esEmergencia) {
    return { penalizacion: true, monto: MONTO_PENALIZACION };
  }
  return { penalizacion: false, monto: 0 };
}

module.exports = {
  validarEdad,
  validarHorario,
  hayChoque,
  calcularPenalizacion,
  MONTO_PENALIZACION,
};
