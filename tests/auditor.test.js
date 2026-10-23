// Suite "Ingeniero QA Auditor": exactamente V(G) tests por función,
// uno por camino linealmente independiente, con oráculos estrictos (toEqual / toBe).
const r = require('../src/reglas');

const d = (dia, hh, mm = 0) => new Date(2026, 9, dia, hh, mm); // octubre 2026: 25 = domingo, 26 = lunes, 31 = sábado
const h = (hh, mm = 0) => d(26, hh, mm).getTime();
const HORA = 3600000;

describe('validarEdad — V(G) = 5', () => {
  test('C1: pediatría con adulto se rechaza', () => {
    expect(r.validarEdad(20, 'pediatria')).toEqual({ ok: false, motivo: 'Pediatría solo atiende a menores de 18 años' });
  });
  test('C2: pediatría con menor se acepta', () => {
    expect(r.validarEdad(10, 'pediatria')).toEqual({ ok: true });
  });
  test('C3: medicina general con menor se rechaza', () => {
    expect(r.validarEdad(10, 'medicina_general')).toEqual({ ok: false, motivo: 'Medicina general solo atiende a pacientes adultos' });
  });
  test('C4: medicina general con adulto se acepta', () => {
    expect(r.validarEdad(30, 'medicina_general')).toEqual({ ok: true });
  });
  test('C5: especialidad no contemplada pasa sin validar', () => {
    expect(r.validarEdad(5, 'cardiologia')).toEqual({ ok: true });
  });
});

describe('validarHorario — V(G) = 7', () => {
  test('C1: domingo se bloquea', () => {
    expect(r.validarHorario(d(25, 10))).toEqual({ ok: false, motivo: 'Domingo no operativo' });
  });
  test('C2: antes de apertura se bloquea', () => {
    expect(r.validarHorario(d(26, 7))).toEqual({ ok: false, motivo: 'Antes del horario de atención' });
  });
  test('C3: sábado por la tarde se bloquea', () => {
    expect(r.validarHorario(d(31, 15))).toEqual({ ok: false, motivo: 'El sábado se atiende solo hasta las 12:00' });
  });
  test('C4: sábado por la mañana se acepta', () => {
    expect(r.validarHorario(d(31, 10))).toEqual({ ok: true });
  });
  test('C5: entre semana después del cierre se bloquea', () => {
    expect(r.validarHorario(d(26, 18))).toEqual({ ok: false, motivo: 'Después del horario de atención' });
  });
  test('C6: franja de almuerzo se bloquea', () => {
    expect(r.validarHorario(d(26, 13, 30))).toEqual({ ok: false, motivo: 'Franja de almuerzo' });
  });
  test('C7: entre semana en horario se acepta', () => {
    expect(r.validarHorario(d(26, 10))).toEqual({ ok: true });
  });
});

describe('hayChoque — V(G) = 6', () => {
  const existente = { medicoId: 1, estado: 'activa', inicio: h(9), fin: h(9, 30) };
  test('C1: sin citas no hay choque', () => {
    expect(r.hayChoque([], { medicoId: 1, inicio: h(9), fin: h(9, 30) })).toBe(false);
  });
  test('C2: otro médico a la misma hora no choca', () => {
    expect(r.hayChoque([existente], { medicoId: 2, inicio: h(9), fin: h(9, 30) })).toBe(false);
  });
  test('C3: cita cancelada no bloquea el horario', () => {
    expect(r.hayChoque([{ ...existente, estado: 'cancelada' }], { medicoId: 1, inicio: h(9), fin: h(9, 30) })).toBe(false);
  });
  test('C4: nueva cita posterior no choca', () => {
    expect(r.hayChoque([existente], { medicoId: 1, inicio: h(10), fin: h(10, 30) })).toBe(false);
  });
  test('C5: nueva cita anterior no choca', () => {
    expect(r.hayChoque([existente], { medicoId: 1, inicio: h(8), fin: h(8, 30) })).toBe(false);
  });
  test('C6: solapamiento parcial choca', () => {
    expect(r.hayChoque([existente], { medicoId: 1, inicio: h(9, 15), fin: h(9, 45) })).toBe(true);
  });
});

describe('calcularPenalizacion — V(G) = 3', () => {
  const cita = d(28, 10).getTime();
  test('C1: cancelación anticipada no se penaliza', () => {
    expect(r.calcularPenalizacion(cita, cita - 48 * HORA, false)).toEqual({ penalizacion: false, monto: 0 });
  });
  test('C2: cancelación tardía por emergencia no se penaliza', () => {
    expect(r.calcularPenalizacion(cita, cita - 2 * HORA, true)).toEqual({ penalizacion: false, monto: 0 });
  });
  test('C3: cancelación tardía sin emergencia se penaliza con $10', () => {
    expect(r.calcularPenalizacion(cita, cita - 2 * HORA, false)).toEqual({ penalizacion: true, monto: 10 });
  });
});
