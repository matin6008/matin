'use strict';
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'site.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS collections (
    slug    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fa TEXT NOT NULL,
    spec_en TEXT NOT NULL DEFAULT '',
    spec_fa TEXT NOT NULL DEFAULT '',
    cover   TEXT NOT NULL DEFAULT '',
    sort    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// v1 had a products.category column with placeholder seeds; rebuild that table
// for the catalog-based schema (real products live in seed/catalog.json).
const legacy = db
  .prepare("SELECT 1 AS hit FROM pragma_table_info('products') WHERE name = 'category'")
  .get();
if (legacy) db.exec('DROP TABLE products');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en     TEXT NOT NULL,
    name_fa     TEXT NOT NULL,
    desc_en     TEXT NOT NULL DEFAULT '',
    desc_fa     TEXT NOT NULL DEFAULT '',
    collection  TEXT NOT NULL REFERENCES collections(slug),
    size        TEXT NOT NULL DEFAULT '',
    material_en TEXT NOT NULL DEFAULT '',
    material_fa TEXT NOT NULL DEFAULT '',
    knots       TEXT NOT NULL DEFAULT '',
    image       TEXT NOT NULL DEFAULT '',
    featured    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

if (!getSetting('admin_password')) {
  setSetting('admin_password', hashPassword('mohtasham1401'));
}
if (!getSetting('session_secret')) {
  setSetting('session_secret', crypto.randomBytes(32).toString('hex'));
}

// seed collections and products from the extracted catalogs
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'catalog.json'), 'utf8'));

const collCount = db.prepare('SELECT COUNT(*) AS n FROM collections').get().n;
if (collCount === 0) {
  const ins = db.prepare(`
    INSERT INTO collections (slug, name_en, name_fa, spec_en, spec_fa, cover, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  seed.collections.forEach((c, i) => {
    ins.run(c.slug, c.name_en, c.name_fa, c.spec_en, c.spec_fa, c.cover, i);
  });
}

const prodCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (prodCount === 0) {
  const ins = db.prepare(`
    INSERT INTO products (name_en, name_fa, desc_en, desc_fa, collection, size,
                          material_en, material_fa, knots, image, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of seed.products) {
    ins.run(p.name_en, p.name_fa, p.desc_en, p.desc_fa, p.collection, p.size,
            p.material_en, p.material_fa, p.knots, p.image, p.featured);
  }
}

module.exports = { db, hashPassword, verifyPassword, getSetting, setSetting, UPLOAD_DIR };
