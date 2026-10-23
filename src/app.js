const express = require('express');
const path = require('path');
const reglas = require('./reglas');

const DURACION_MIN = 30;

function edadEn(fechaNacimiento, fechaRef) {
  const n = new Date(fechaNacimiento + 'T00:00');
  let edad = fechaRef.getFullYear() - n.getFullYear();
  const m = fechaRef.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && fechaRef.getDate() < n.getDate())) edad--;
  return edad;
}

function aCita(row) {
  return {
    id: row.id,
    medicoId: row.medico_id,
    estado: row.estado,
    inicio: new Date(row.inicio).getTime(),
    fin: new Date(row.fin).getTime(),
  };
}

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/medicos', (req, res) => {
    res.json(db.prepare('SELECT * FROM medicos').all());
  });

  app.get('/api/pacientes', (req, res) => {
    res.json(db.prepare('SELECT * FROM pacientes').all());
  });

  app.post('/api/pacientes', (req, res) => {
    const { nombre, fecha_nacimiento } = req.body;
    if (!nombre || !fecha_nacimiento) return res.status(400).json({ error: 'Datos incompletos' });
    const r = db.prepare('INSERT INTO pacientes (nombre, fecha_nacimiento) VALUES (?, ?)').run(nombre, fecha_nacimiento);
    res.status(201).json({ id: Number(r.lastInsertRowid), nombre, fecha_nacimiento });
  });

  app.get('/api/citas', (req, res) => {
    res.json(db.prepare(`
      SELECT c.*, p.nombre AS paciente, m.nombre AS medico, m.especialidad
      FROM citas c JOIN pacientes p ON p.id = c.paciente_id JOIN medicos m ON m.id = c.medico_id
      ORDER BY c.inicio`).all());
  });

  app.post('/api/citas', (req, res) => {
    const { paciente_id, medico_id, inicio } = req.body;
    const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(paciente_id);
    const medico = db.prepare('SELECT * FROM medicos WHERE id = ?').get(medico_id);
    if (!paciente || !medico || !inicio) return res.status(400).json({ error: 'Datos incompletos' });

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fechaInicio.getTime() + DURACION_MIN * 60000);

    const edad = reglas.validarEdad(edadEn(paciente.fecha_nacimiento, fechaInicio), medico.especialidad);
    if (!edad.ok) return res.status(422).json({ error: edad.motivo });

    const horario = reglas.validarHorario(fechaInicio);
    if (!horario.ok) return res.status(422).json({ error: horario.motivo });

    const existentes = db.prepare('SELECT * FROM citas WHERE medico_id = ?').all(medico_id).map(aCita);
    const nueva = { medicoId: medico.id, inicio: fechaInicio.getTime(), fin: fechaFin.getTime() };
    if (reglas.hayChoque(existentes, nueva)) {
      return res.status(409).json({ error: 'El médico ya tiene una cita en ese horario' });
    }

    const r = db.prepare('INSERT INTO citas (paciente_id, medico_id, inicio, fin) VALUES (?, ?, ?, ?)')
      .run(paciente.id, medico.id, fechaInicio.toISOString(), fechaFin.toISOString());
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  app.post('/api/citas/:id/cancelar', (req, res) => {
    const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
    if (!cita || cita.estado === 'cancelada') return res.status(404).json({ error: 'Cita no encontrada' });
    const ahora = req.body.fecha ? new Date(req.body.fecha) : new Date();
    const pen = reglas.calcularPenalizacion(new Date(cita.inicio).getTime(), ahora.getTime(), !!req.body.esEmergencia);
    db.prepare("UPDATE citas SET estado = 'cancelada', penalizacion = ? WHERE id = ?").run(pen.monto, cita.id);
    res.json(pen);
  });

  return app;
}

module.exports = { createApp };
