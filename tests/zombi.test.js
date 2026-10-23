// Suite "Desarrollador Copiador": lo que devuelve el prompt ingenuo
// "Escribe tests para las reglas de citas en Jest".
// Recorre todas las líneas, pero las aserciones no verifican el resultado.
const r = require('../src/reglas');

describe('reglas (prompt ingenuo)', () => {
  test('validarEdad funciona', () => {
    expect(r.validarEdad(10, 'pediatria')).toBeDefined();
    expect(r.validarEdad(30, 'pediatria')).toBeDefined();
    expect(r.validarEdad(10, 'medicina_general')).toBeDefined();
  });

  test('validarHorario funciona', () => {
    expect(r.validarHorario(new Date(2026, 9, 25, 10, 0))).toBeTruthy(); // domingo
    expect(r.validarHorario(new Date(2026, 9, 26, 7, 0))).toBeTruthy();
    expect(r.validarHorario(new Date(2026, 9, 31, 15, 0))).toBeTruthy(); // sábado
    expect(r.validarHorario(new Date(2026, 9, 26, 18, 0))).toBeTruthy();
    expect(r.validarHorario(new Date(2026, 9, 26, 13, 0))).toBeTruthy();
    expect(r.validarHorario(new Date(2026, 9, 26, 10, 0))).toBeTruthy();
  });

  test('hayChoque funciona', () => {
    const h = (hh, mm) => new Date(2026, 9, 26, hh, mm).getTime();
    const citas = [{ medicoId: 1, estado: 'activa', inicio: h(9, 0), fin: h(9, 30) }];
    expect(typeof r.hayChoque(citas, { medicoId: 1, inicio: h(9, 15), fin: h(9, 45) })).toBe('boolean');
    expect(typeof r.hayChoque(citas, { medicoId: 2, inicio: h(9, 15), fin: h(9, 45) })).toBe('boolean');
    expect(typeof r.hayChoque([{ ...citas[0], estado: 'cancelada' }], { medicoId: 1, inicio: h(9, 15), fin: h(9, 45) })).toBe('boolean');
  });

  test('calcularPenalizacion funciona', () => {
    const cita = new Date(2026, 9, 28, 10, 0).getTime();
    expect(r.calcularPenalizacion(cita, cita - 2 * 3600000, false)).toHaveProperty('monto');
    expect(r.calcularPenalizacion(cita, cita - 48 * 3600000, false)).toHaveProperty('monto');
  });
});
