/**
 * REVI Assets v2 — Servidor Backend
 * Node.js + Express + SQLite nativo (node:sqlite)
 * Puerto: 3000
 */

const express    = require('express');
const cors       = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── JWT Configuration ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

// ── Rate Limiting ────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                  // 100 requests per windowMs
  message: 'Demasiadas solicitudes, intenta en 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 intentos de login por IP en 15 min
  message: 'Demasiados intentos de login, intenta en 15 minutos',
  skipSuccessfulRequests: true,
});

// ── JWT Middleware ───────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

// ── Middleware ────────────────────────────────────────────────────
// Log ANTES de CORS (para debuguear)
app.use((req, _res, next) => {
  console.log(`[PRE-CORS] ${new Date().toISOString()}  ${req.method}  ${req.path}  Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Permitir: sin origin (requests de CLI, postman, etc), localhost en cualquier puerto, o env variable
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('172.20')) {
      callback(null, true);
    } else if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(limiter); // Global rate limiting

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

// ── Helpers ───────────────────────────────────────────────────────
const now = () => new Date().toISOString();

const logAudit = (activo_id, accion, usuario, campo, val_prev, val_nuevo) => {
  db.prepare(`
    INSERT INTO auditoria (activo_id, accion, usuario, campo, valor_prev, valor_nuevo, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(activo_id, accion, usuario || 'sistema', campo || null,
         val_prev || null, val_nuevo || null, now());
};

const boolToInt = (v) => (v ? 1 : 0);
const intToBool = (row) => row ? {
  ...row,
  validado:       row.validado === 1,
  sync_pendiente: row.sync_pendiente === 1,
} : row;

// ══════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ══════════════════════════════════════════════════════════════════

// POST /auth/register — Crear nuevo usuario
app.post('/auth/register', authLimiter, (req, res) => {
  try {
    const { email, password, usuario } = req.body;

    // Validaciones
    if (!email || !password || !usuario) {
      return res.status(400).json({ error: 'email, password y usuario son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar email único
    const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existe) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }

    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    const ts = now();

    db.prepare(`
      INSERT INTO usuarios (id, email, password_hash, usuario, activo, fecha_creacion)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(id, email, password_hash, usuario, ts);

    res.status(201).json({ success: true, id, message: 'Usuario creado. Inicia sesión.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login — Login con email y contraseña
app.post('/auth/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    // Buscar usuario
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Email o contraseña incorrecto' });
    }

    // Verificar activo
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario deshabilitado' });
    }

    // Validar password
    const passwordMatch = bcrypt.compareSync(password, usuario.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email o contraseña incorrecto' });
    }

    // Actualizar fecha_ultima_login
    db.prepare('UPDATE usuarios SET fecha_ultima_login = ? WHERE id = ?')
      .run(now(), usuario.id);

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, usuario: usuario.usuario },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token, usuario: usuario.usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/me — Obtener usuario actual (validar token)
app.get('/auth/me', (req, res) => {
  // Extraer token manualmente aquí porque no queremos autenticateToken obligatorio
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    res.json({ usuario: user });
  });
});

// ══════════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════════
app.get('/health', (_req, res) => {
  const stats = db.prepare('SELECT COUNT(*) AS total FROM activos').get();
  res.json({ status: 'ok', version: '2.0.0', timestamp: now(), activos: stats.total });
});

// ══════════════════════════════════════════════════════════════════
// ACTIVOS — CRUD
// ══════════════════════════════════════════════════════════════════

// GET /api/activos
app.get('/api/activos', authenticateToken, (req, res) => {
  try {
    const { centro_costo, area, estado, validado, search } = req.query;
    let sql = `
      SELECT a.*,
        CASE WHEN (SELECT COUNT(*) FROM fotos WHERE activo_id = a.id) > 0 THEN 1 ELSE 0 END AS tiene_foto
      FROM activos a
      WHERE 1=1
    `;
    const params = [];

    if (centro_costo) { sql += ' AND a.centro_costo = ?';  params.push(centro_costo); }
    if (area)         { sql += ' AND a.area = ?';           params.push(area); }
    if (estado)       { sql += ' AND a.estado_equipo = ?';  params.push(estado); }
    if (validado !== undefined) {
      sql += ' AND a.validado = ?';
      params.push(validado === 'true' ? 1 : 0);
    }
    if (search) {
      const q = `%${search}%`;
      sql += ` AND (a.nombre_equipo LIKE ? OR a.codigo_nuevo LIKE ?
                 OR a.codigo_antiguo LIKE ? OR a.raf LIKE ?
                 OR a.marca LIKE ? OR a.centro_costo LIKE ?)`;
      params.push(q, q, q, q, q, q);
    }

    sql += ' ORDER BY a.created_at DESC';
    const rows = db.prepare(sql).all(...params).map(row => ({
      ...intToBool(row),
      tiene_foto: row.tiene_foto === 1,
    }));
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activos/:id
app.get('/api/activos/:id', authenticateToken, (req, res) => {
  try {
    const activo = db.prepare('SELECT * FROM activos WHERE id = ?').get(req.params.id);
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const fotos = db.prepare(
      'SELECT id, tipo, orden, fecha FROM fotos WHERE activo_id = ? ORDER BY orden'
    ).all(req.params.id);

    const tieneFoto = fotos.length > 0;
    res.json({ ...intToBool(activo), tiene_foto: tieneFoto, fotos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activos
app.post('/api/activos', authenticateToken, (req, res) => {
  try {
    const b = req.body;

    // Validaciones
    const err = [];
    if (!b.nombre_equipo)    err.push('nombre_equipo requerido');
    if (!b.centro_costo)     err.push('centro_costo requerido');
    if (!b.area)             err.push('area requerido');
    if (!b.estado_equipo)    err.push('estado_equipo requerido');
    if (!b.fecha_inventario) err.push('fecha_inventario requerido');
    if (!b.usuario_registro) err.push('usuario_registro requerido');
    if (err.length) return res.status(400).json({ errores: err });

    // Duplicado codigo_nuevo
    if (b.codigo_nuevo) {
      const existe = db.prepare('SELECT id FROM activos WHERE codigo_nuevo = ?').get(b.codigo_nuevo);
      if (existe) return res.status(409).json({ error: `Código AF ya existe: ${b.codigo_nuevo}` });
    }

    const id = b.id || uuidv4();
    const ts = now();

    db.prepare(`
      INSERT INTO activos (
        id, codigo_nuevo, codigo_antiguo, raf, nombre_equipo, descripcion,
        categoria, centro_costo, area, linea_productiva, periferico,
        layout_ubicacion, marca, modelo, anio, estado_equipo, responsable,
        fecha_inventario, observaciones, fecha_registro, usuario_registro,
        fecha_ultima_mod, validado, sync_pendiente
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, b.codigo_nuevo||null, b.codigo_antiguo||null, b.raf||null,
      b.nombre_equipo, b.descripcion||null, b.categoria||null,
      b.centro_costo, b.area, b.linea_productiva||null, b.periferico||null,
      b.layout_ubicacion||null, b.marca||null, b.modelo||null, b.anio||null,
      b.estado_equipo, b.responsable||null, b.fecha_inventario,
      b.observaciones||null, b.fecha_registro||ts, b.usuario_registro,
      ts, 0, 0
    );

    logAudit(id, 'CREAR', b.usuario_registro);
    res.status(201).json({ id, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/activos/:id
app.patch('/api/activos/:id', authenticateToken, (req, res) => {
  try {
    const activo = db.prepare('SELECT * FROM activos WHERE id = ?').get(req.params.id);
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const usuario = req.user.usuario || 'sistema';
    const CAMPOS  = [
      'codigo_nuevo','codigo_antiguo','raf','nombre_equipo','descripcion',
      'categoria','centro_costo','area','linea_productiva','periferico',
      'layout_ubicacion','marca','modelo','anio','estado_equipo','responsable',
      'fecha_inventario','observaciones','validado',
    ];
    const sets = [];
    const vals = [];

    for (const campo of CAMPOS) {
      if (req.body[campo] !== undefined) {
        sets.push(`${campo} = ?`);
        const val = campo === 'validado' ? boolToInt(req.body[campo]) : req.body[campo];
        vals.push(val);
        if (String(activo[campo] ?? '') !== String(req.body[campo] ?? '')) {
          logAudit(req.params.id, 'MODIFICAR', usuario, campo,
            String(activo[campo] ?? ''), String(req.body[campo] ?? ''));
        }
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' });

    sets.push('fecha_ultima_mod = ?', 'sync_pendiente = 0');
    vals.push(now(), req.params.id);

    db.prepare(`UPDATE activos SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/activos/:id
app.delete('/api/activos/:id', authenticateToken, (req, res) => {
  try {
    const activo = db.prepare('SELECT nombre_equipo FROM activos WHERE id = ?').get(req.params.id);
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const usuario = req.user.usuario || 'sistema';
    logAudit(req.params.id, 'ELIMINAR', usuario, 'nombre_equipo', activo.nombre_equipo, null);

    db.prepare('DELETE FROM fotos WHERE activo_id = ?').run(req.params.id);
    db.prepare('DELETE FROM activos WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// FOTOS
// ══════════════════════════════════════════════════════════════════

app.get('/api/activos/:id/fotos', authenticateToken, (req, res) => {
  try {
    const fotos = db.prepare(
      'SELECT * FROM fotos WHERE activo_id = ? ORDER BY orden'
    ).all(req.params.id);
    res.json({ data: fotos, total: fotos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activos/:id/fotos', authenticateToken, (req, res) => {
  try {
    const { imagen_data, tipo, orden } = req.body;
    if (!imagen_data) return res.status(400).json({ error: 'imagen_data requerido' });
    if (imagen_data.length > 700000) return res.status(400).json({ error: 'Imagen muy grande (máx ~500KB)' });

    const activo = db.prepare('SELECT id FROM activos WHERE id = ?').get(req.params.id);
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const id = uuidv4();
    db.prepare(
      'INSERT INTO fotos (id, activo_id, imagen_data, orden, fecha, tipo) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, req.params.id, imagen_data, orden || 0, now(), tipo || 'principal');

    res.status(201).json({ id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fotos/:id', authenticateToken, (req, res) => {
  try {
    const foto = db.prepare('SELECT id FROM fotos WHERE id = ?').get(req.params.id);
    if (!foto) return res.status(404).json({ error: 'Foto no encontrada' });
    db.prepare('DELETE FROM fotos WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN
// ══════════════════════════════════════════════════════════════════

app.get('/api/sync', authenticateToken, (req, res) => {
  try {
    const since = req.query.since || '1970-01-01T00:00:00Z';
    const rows  = db.prepare(`
      SELECT * FROM activos WHERE updated_at > ? OR created_at > ?
      ORDER BY updated_at DESC
    `).all(since, since).map(intToBool);

    res.json({ timestamp: now(), since, changes: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/batch', authenticateToken, (req, res) => {
  try {
    const { activos: lista = [] } = req.body;
    const usuario = req.user.usuario;
    const result = { creados: 0, ignorados: 0, errores: [] };

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO activos (
        id, codigo_nuevo, codigo_antiguo, raf, nombre_equipo, descripcion,
        categoria, centro_costo, area, linea_productiva, periferico,
        layout_ubicacion, marca, modelo, anio, estado_equipo, responsable,
        fecha_inventario, observaciones, fecha_registro, usuario_registro,
        fecha_ultima_mod, validado, sync_pendiente
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      for (const a of lista) {
        const info = stmt.run(
          a.id, a.codigo_nuevo||null, a.codigo_antiguo||null, a.raf||null,
          a.nombre_equipo, a.descripcion||null, a.categoria||null,
          a.centro_costo, a.area, a.linea_productiva||null, a.periferico||null,
          a.layout_ubicacion||null, a.marca||null, a.modelo||null, a.anio||null,
          a.estado_equipo, a.responsable||null, a.fecha_inventario,
          a.observaciones||null, a.fecha_registro, a.usuario_registro,
          a.fecha_ultima_mod, boolToInt(a.validado), 0
        );
        if (info.changes > 0) {
          result.creados++;
          logAudit(a.id, 'SYNC_CREAR', usuario || a.usuario_registro);
        } else {
          result.ignorados++;
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// REPORTES
// ══════════════════════════════════════════════════════════════════

app.get('/api/reports/validation', authenticateToken, (_req, res) => {
  try {
    const s = db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN validado = 0 THEN 1 ELSE 0 END)       AS pendientes_validar,
        SUM(CASE WHEN sync_pendiente = 1 THEN 1 ELSE 0 END) AS sin_sincronizar
      FROM activos
    `).get();

    const sinFoto = db.prepare(`
      SELECT COUNT(*) AS total FROM activos
      WHERE id NOT IN (SELECT DISTINCT activo_id FROM fotos)
    `).get();

    const duplicados = db.prepare(`
      SELECT COUNT(*) AS total FROM (
        SELECT codigo_nuevo FROM activos
        WHERE codigo_nuevo IS NOT NULL
        GROUP BY codigo_nuevo HAVING COUNT(*) > 1
      )
    `).get();

    const porCentro = db.prepare(`
      SELECT centro_costo, COUNT(*) AS total,
             SUM(CASE WHEN validado = 1 THEN 1 ELSE 0 END) AS validados
      FROM activos GROUP BY centro_costo ORDER BY total DESC
    `).all();

    const porEstado = db.prepare(`
      SELECT estado_equipo, COUNT(*) AS total
      FROM activos GROUP BY estado_equipo ORDER BY total DESC
    `).all();

    res.json({
      generado_en:        now(),
      total_activos:      s.total,
      pendientes_validar: s.pendientes_validar,
      sin_sincronizar:    s.sin_sincronizar,
      sin_fotografia:     sinFoto.total,
      codigos_duplicados: duplicados.total,
      por_centro_costo:   porCentro,
      por_estado:         porEstado,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Duplicados ────────────────────────────────────────────────────
app.get('/api/duplicados', authenticateToken, (_req, res) => {
  try {
    // Encuentra todos los códigos_nuevos que aparecen más de una vez
    const codigosDuplicados = db.prepare(`
      SELECT codigo_nuevo FROM activos
      WHERE codigo_nuevo IS NOT NULL
      GROUP BY codigo_nuevo HAVING COUNT(*) > 1
    `).all().map(row => row.codigo_nuevo);

    // Obtén los activos que tienen código duplicado
    if (codigosDuplicados.length === 0) {
      return res.json({ data: [], total: 0 });
    }

    const placeholders = codigosDuplicados.map(() => '?').join(',');
    const activos = db.prepare(`
      SELECT a.*,
        CASE WHEN (SELECT COUNT(*) FROM fotos WHERE activo_id = a.id) > 0 THEN 1 ELSE 0 END AS tiene_foto
      FROM activos a
      WHERE a.codigo_nuevo IN (${placeholders})
      ORDER BY a.codigo_nuevo, a.nombre_equipo
    `).all(...codigosDuplicados).map(row => ({
      ...intToBool(row),
      tiene_foto: row.tiene_foto === 1,
    }));

    res.json({ data: activos, total: activos.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auditoria', authenticateToken, (req, res) => {
  try {
    const { activo_id, limit = 100 } = req.query;
    let sql = 'SELECT * FROM auditoria';
    const params = [];
    if (activo_id) { sql += ' WHERE activo_id = ?'; params.push(activo_id); }
    sql += ` ORDER BY fecha DESC LIMIT ${parseInt(limit)}`;
    const rows = db.prepare(sql).all(...params);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 404 + error handler ──────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `No encontrado: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

// ── Arrancar ─────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       REVI Assets v2 — Servidor          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Local : http://localhost:${PORT}            ║`);
  console.log(`║  Red   : http://192.168.1.15:${PORT}         ║`);
  console.log('║  BD    : REVI_ASSETS.db                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/api/activos`);
  console.log(`  GET  http://localhost:${PORT}/api/reports/validation`);
  console.log('');
});

module.exports = app;
