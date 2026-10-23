// Refuerzo tras el análisis de mutantes: valores frontera que los caminos de McCabe no fijan.
const r = require('../src/reglas');

const d = (dia, hh, mm = 0) => new Date(2026, 9, dia, hh, mm);
const h = (hh, mm = 0) => d(26, hh, mm).getTime();
const HORA = 3600000;

describe('fronteras de edad (18 años)', () => {
  test('pediatría rechaza a quien cumple 18', () => {
    expect(r.validarEdad(18, 'pediatria').ok).toBe(false);
  });
  test('medicina general acepta a quien cumple 18', () => {
    expect(r.validarEdad(18, 'medicina_general').ok).toBe(true);
  });
});

describe('fronteras de horario', () => {
  test('08:00 abre', () => expect(r.validarHorario(d(26, 8)).ok).toBe(true));
  test('sábado 11:30 se acepta', () => expect(r.validarHorario(d(31, 11, 30)).ok).toBe(true));
  test('sábado 12:00 se cierra', () => expect(r.validarHorario(d(31, 12)).ok).toBe(false));
  test('16:30 se acepta', () => expect(r.validarHorario(d(26, 16, 30)).ok).toBe(true));
  test('17:00 se cierra', () => expect(r.validarHorario(d(26, 17)).ok).toBe(false));
  test('14:00 termina el almuerzo', () => expect(r.validarHorario(d(26, 14)).ok).toBe(true));
});

describe('fronteras de choque (citas contiguas)', () => {
  const existente = { medicoId: 1, estado: 'activa', inicio: h(9), fin: h(9, 30) };
  test('cita que empieza cuando la otra termina no choca', () => {
    expect(r.hayChoque([existente], { medicoId: 1, inicio: h(9, 30), fin: h(10) })).toBe(false);
  });
  test('cita que termina cuando la otra empieza no choca', () => {
    expect(r.hayChoque([existente], { medicoId: 1, inicio: h(8, 30), fin: h(9) })).toBe(false);
  });
  test('el choque se detecta aunque haya citas previas de otro médico', () => {
    const otra = { medicoId: 2, estado: 'activa', inicio: h(9), fin: h(9, 30) };
    expect(r.hayChoque([otra, existente], { medicoId: 1, inicio: h(9), fin: h(9, 30) })).toBe(true);
  });
});

describe('frontera de 24 horas', () => {
  const cita = d(28, 10).getTime();
  test('exactamente 24 h antes no se penaliza', () => {
    expect(r.calcularPenalizacion(cita, cita - 24 * HORA, false).penalizacion).toBe(false);
  });
  test('un minuto menos de 24 h sí se penaliza', () => {
    expect(r.calcularPenalizacion(cita, cita - 24 * HORA + 60000, false).penalizacion).toBe(true);
  });
});
