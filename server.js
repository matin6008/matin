'use strict';
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const path = require('node:path');

const { db, hashPassword, verifyPassword, getSetting, setSetting, UPLOAD_DIR } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = getSetting('session_secret');

app.use(express.json());
app.use(cookieParser(SECRET));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype));
  },
});

// ---------- public API ----------

const PRODUCT_FIELDS = `p.id, p.name_en, p.name_fa, p.desc_en, p.desc_fa, p.collection, p.size,
                        p.material_en, p.material_fa, p.knots, p.image, p.featured,
                        c.name_en AS collection_en, c.name_fa AS collection_fa,
                        c.spec_en AS spec_en, c.spec_fa AS spec_fa`;
const PRODUCT_JOIN = 'FROM products p JOIN collections c ON c.slug = p.collection';

app.get('/api/collections', (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, COUNT(p.id) AS count
    FROM collections c LEFT JOIN products p ON p.collection = c.slug
    GROUP BY c.slug ORDER BY c.sort
  `).all());
});

app.get('/api/products', (req, res) => {
  const { collection, featured } = req.query;
  let sql = `SELECT ${PRODUCT_FIELDS} ${PRODUCT_JOIN}`;
  const where = [];
  const params = [];
  if (collection && collection !== 'all') { where.push('p.collection = ?'); params.push(collection); }
  if (featured === '1') where.push('p.featured = 1');
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY p.featured DESC, p.id ASC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare(`SELECT ${PRODUCT_FIELDS} ${PRODUCT_JOIN} WHERE p.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/contact', (req, res) => {
  const { name, phone = '', email = '', message } = req.body || {};
  if (!name || !name.trim() || !message || !message.trim()) {
    return res.status(400).json({ error: 'name and message are required' });
  }
  db.prepare('INSERT INTO messages (name, phone, email, message) VALUES (?, ?, ?, ?)')
    .run(name.trim().slice(0, 200), String(phone).slice(0, 50),
         String(email).slice(0, 200), message.trim().slice(0, 5000));
  res.json({ ok: true });
});

// ---------- admin auth ----------

const SESSION_COOKIE = 'mohtasham_admin';

function requireAdmin(req, res, next) {
  if (req.signedCookies[SESSION_COOKIE] === 'ok') return next();
  res.status(401).json({ error: 'unauthorized' });
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || !verifyPassword(password, getSetting('admin_password'))) {
    return res.status(401).json({ error: 'wrong password' });
  }
  res.cookie(SESSION_COOKIE, 'ok', {
    signed: true, httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600 * 1000,
  });
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => {
  res.json({ loggedIn: req.signedCookies[SESSION_COOKIE] === 'ok' });
});

app.post('/api/admin/password', requireAdmin, (req, res) => {
  const { current, next } = req.body || {};
  if (!current || !verifyPassword(current, getSetting('admin_password'))) {
    return res.status(400).json({ error: 'current password is wrong' });
  }
  if (!next || next.length < 8) {
    return res.status(400).json({ error: 'new password must be at least 8 characters' });
  }
  setSetting('admin_password', hashPassword(next));
  res.json({ ok: true });
});

// ---------- admin: products ----------

function productBody(req) {
  const b = req.body;
  const known = db.prepare('SELECT slug FROM collections ORDER BY sort').all().map((r) => r.slug);
  return {
    name_en: (b.name_en || '').trim(), name_fa: (b.name_fa || '').trim(),
    desc_en: (b.desc_en || '').trim(), desc_fa: (b.desc_fa || '').trim(),
    collection: known.includes(b.collection) ? b.collection : known[0],
    size: (b.size || '').trim(),
    material_en: (b.material_en || '').trim(), material_fa: (b.material_fa || '').trim(),
    knots: (b.knots || '').trim(),
    featured: b.featured === '1' || b.featured === 1 || b.featured === true ? 1 : 0,
  };
}

app.post('/api/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  const p = productBody(req);
  if (!p.name_en || !p.name_fa) return res.status(400).json({ error: 'name_en and name_fa are required' });
  const image = req.file ? `/uploads/${req.file.filename}` : (req.body.image || '/assets/carpet-kashan-gold.svg');
  const info = db.prepare(`
    INSERT INTO products (name_en, name_fa, desc_en, desc_fa, collection, size,
                          material_en, material_fa, knots, image, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.name_en, p.name_fa, p.desc_en, p.desc_fa, p.collection, p.size,
         p.material_en, p.material_fa, p.knots, image, p.featured);
  res.json({ ok: true, id: Number(info.lastInsertRowid) });
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT id, image FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const p = productBody(req);
  if (!p.name_en || !p.name_fa) return res.status(400).json({ error: 'name_en and name_fa are required' });
  const image = req.file ? `/uploads/${req.file.filename}` : existing.image;
  db.prepare(`
    UPDATE products SET name_en=?, name_fa=?, desc_en=?, desc_fa=?, collection=?, size=?,
                        material_en=?, material_fa=?, knots=?, image=?, featured=?
    WHERE id=?
  `).run(p.name_en, p.name_fa, p.desc_en, p.desc_fa, p.collection, p.size,
         p.material_en, p.material_fa, p.knots, image, p.featured, existing.id);
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- admin: messages ----------

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all());
});

app.post('/api/admin/messages/:id/read', requireAdmin, (req, res) => {
  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Mohtasham Carpets website running at http://localhost:${PORT}`);
});
