const { DatabaseSync } = require('node:sqlite');

function crearDB(ruta = 'citas.db') {
  const db = new DatabaseSync(ruta);
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      fecha_nacimiento TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      especialidad TEXT NOT NULL CHECK (especialidad IN ('pediatria','medicina_general'))
    );
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
      medico_id INTEGER NOT NULL REFERENCES medicos(id),
      inicio TEXT NOT NULL,
      fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'activa',
      penalizacion REAL NOT NULL DEFAULT 0
    );
  `);
  const hay = db.prepare('SELECT COUNT(*) AS n FROM medicos').get().n;
  if (hay === 0) {
    db.prepare("INSERT INTO medicos (nombre, especialidad) VALUES ('Dra. Andrea Vela','pediatria')").run();
    db.prepare("INSERT INTO medicos (nombre, especialidad) VALUES ('Dr. Luis Cevallos','medicina_general')").run();
  }
  return db;
}

module.exports = { crearDB };
