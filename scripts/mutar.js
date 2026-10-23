// Pruebas de mutación manuales: inyecta un fallo a la vez en src/reglas.js
// y revisa si cada suite lo detecta (mutante "muerto") o no ("sobrevive").
// Uso: node scripts/mutar.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ARCHIVO = path.join(__dirname, '..', 'src', 'reglas.js');
const ORIGINAL = fs.readFileSync(ARCHIVO, 'utf8');

const MUTANTES = [
  ['M01', 'Edad', 'edad >= EDAD_ADULTO', 'edad > EDAD_ADULTO'],
  ['M02', 'Edad', 'edad < EDAD_ADULTO', 'edad <= EDAD_ADULTO'],
  ["M03", 'Edad', "especialidad === 'pediatria' &&", "especialidad === 'pediatria' ||"],
  ['M04', 'Horario', 'dia === 0', 'dia === 7'],
  ['M05', 'Horario', 'hora < HORA_APERTURA', 'hora <= HORA_APERTURA'],
  ['M06', 'Horario', 'hora >= HORA_CIERRE_SABADO', 'hora > HORA_CIERRE_SABADO'],
  ['M07', 'Horario', 'dia === 6 &&', 'dia === 6 ||'],
  ['M08', 'Horario', 'hora >= HORA_CIERRE)', 'hora > HORA_CIERRE)'],
  ['M09', 'Horario', 'hora === HORA_ALMUERZO', 'hora === HORA_ALMUERZO + 1'],
  ['M10', 'Choque', 'if (c.medicoId !== nueva.medicoId) continue;', ''],
  ['M11', 'Choque', "if (c.estado === 'cancelada') continue;", ''],
  ['M12', 'Choque', 'nueva.inicio < c.fin', 'nueva.inicio <= c.fin'],
  ['M13', 'Choque', 'c.inicio < nueva.fin', 'c.inicio <= nueva.fin'],
  ['M14', 'Choque', 'return true;', 'return false;'],
  ['M15', 'Penalización', 'horas < HORAS_LIMITE_CANCELACION', 'horas <= HORAS_LIMITE_CANCELACION'],
  ['M16', 'Penalización', '&& !esEmergencia', '&& esEmergencia'],
  ['M17', 'Penalización', 'monto: MONTO_PENALIZACION', 'monto: 0'],
  ['M18', 'Penalización', 'cancelacionTardia && !esEmergencia', 'cancelacionTardia'],
];

const SUITES = {
  zombi: ['tests/zombi.test.js'],
  auditor: ['tests/auditor.test.js'],
  'auditor+fronteras': ['tests/auditor.test.js', 'tests/fronteras.test.js'],
};

function detecta(archivos) {
  const r = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--silent', ...archivos], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, TZ: 'America/Guayaquil' },
    encoding: 'utf8',
  });
  return r.status !== 0;
}

const filas = [];
try {
  for (const [id, regla, de, a] of MUTANTES) {
    if (!ORIGINAL.includes(de)) throw new Error(`${id}: no se encontró "${de}"`);
    fs.writeFileSync(ARCHIVO, ORIGINAL.replace(de, a));
    const fila = { id, regla, cambio: `${de}  →  ${a || '(eliminado)'}` };
    for (const [nombre, archivos] of Object.entries(SUITES)) fila[nombre] = detecta(archivos) ? 'muerto' : 'SOBREVIVE';
    filas.push(fila);
    console.log(id, fila.zombi, fila.auditor, fila['auditor+fronteras']);
  }
} finally {
  fs.writeFileSync(ARCHIVO, ORIGINAL);
}

console.log('\nResumen (mutantes muertos / total):');
for (const nombre of Object.keys(SUITES)) {
  const muertos = filas.filter((f) => f[nombre] === 'muerto').length;
  console.log(`  ${nombre.padEnd(18)} ${muertos}/${filas.length}  (${Math.round((muertos / filas.length) * 100)}%)`);
}
fs.writeFileSync(path.join(__dirname, '..', 'resultados-mutacion.json'), JSON.stringify(filas, null, 2));
