const db = require('./db');
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('Revi2026', 10);
const result = db.prepare('UPDATE usuarios SET password_hash=? WHERE email=?').run(hash, 'rsagardia@grupo-revi.com');
console.log('Actualizado:', result.changes, 'usuario(s)');
