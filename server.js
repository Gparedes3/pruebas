const { crearDB } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
createApp(crearDB()).listen(PORT, () => console.log(`Citas médicas en http://localhost:${PORT}`));
