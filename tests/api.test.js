// Pruebas de integración: las reglas conectadas a Express + SQLite.
const request = require('supertest');
const { crearDB } = require('../src/db');
const { createApp } = require('../src/app');

let app;
beforeEach(() => {
  app = createApp(crearDB(':memory:'));
});

async function paciente(fecha_nacimiento) {
  const res = await request(app).post('/api/pacientes').send({ nombre: 'Ana', fecha_nacimiento });
  return res.body.id;
}

test('agenda una cita válida', async () => {
  const id = await paciente('1990-05-10');
  const res = await request(app).post('/api/citas').send({ paciente_id: id, medico_id: 2, inicio: '2026-10-26T10:00' });
  expect(res.status).toBe(201);
});

test('rechaza a un adulto en pediatría (422)', async () => {
  const id = await paciente('1990-05-10');
  const res = await request(app).post('/api/citas').send({ paciente_id: id, medico_id: 1, inicio: '2026-10-26T10:00' });
  expect(res.status).toBe(422);
  expect(res.body.error).toMatch(/Pediatría/);
});

test('rechaza un domingo (422)', async () => {
  const id = await paciente('1990-05-10');
  const res = await request(app).post('/api/citas').send({ paciente_id: id, medico_id: 2, inicio: '2026-10-25T10:00' });
  expect(res.status).toBe(422);
});

test('impide la doble reserva (409)', async () => {
  const id = await paciente('1990-05-10');
  await request(app).post('/api/citas').send({ paciente_id: id, medico_id: 2, inicio: '2026-10-26T10:00' });
  const res = await request(app).post('/api/citas').send({ paciente_id: id, medico_id: 2, inicio: '2026-10-26T10:15' });
  expect(res.status).toBe(409);
});

test('cancela tarde y aplica $10 de penalización', async () => {
  const id = await paciente('1990-05-10');
  const cita = await request(app).post('/api/citas').send({ paciente_id: id, medico_id: 2, inicio: '2026-10-26T10:00' });
  const res = await request(app).post(`/api/citas/${cita.body.id}/cancelar`).send({ fecha: '2026-10-26T08:00', esEmergencia: false });
  expect(res.body).toEqual({ penalizacion: true, monto: 10 });
});
