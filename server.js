'use strict';
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

const {
  supabase, BUCKET, hashPassword, verifyPassword, getSetting, setSetting,
} = require('./db');

const PORT = process.env.PORT || 3000;

// Photos are held in memory just long enough to push them to Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype));
  },
});

async function uploadImage(file) {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const key = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

// Wrap async route handlers so rejected promises become a clean 500.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Builds and returns the fully-configured Express app. Used both by the local
// server (below) and by the Vercel serverless entry point (api/index.js).
async function buildApp() {
  const SECRET = await getSetting('session_secret');
  if (!SECRET) {
    throw new Error('Database not seeded yet. Run `npm run setup` first.');
  }

  const app = express();
  app.use(express.json());
  app.use(cookieParser(SECRET));
  // Serve the static site locally. On Vercel the `public/` folder is served by
  // the CDN and isn't bundled into the function, so skip it when absent.
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

  // ---------- public API ----------

  app.get('/api/collections', wrap(async (req, res) => {
    const { data, error } = await supabase
      .from('collections_full').select('*').order('sort', { ascending: true });
    if (error) throw error;
    res.json(data);
  }));

  app.get('/api/products', wrap(async (req, res) => {
    const { collection, featured } = req.query;
    let q = supabase.from('products_full').select('*');
    if (collection && collection !== 'all') q = q.eq('collection', collection);
    if (featured === '1') q = q.eq('featured', 1);
    q = q.order('featured', { ascending: false }).order('id', { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  }));

  app.get('/api/products/:id', wrap(async (req, res) => {
    const { data, error } = await supabase
      .from('products_full').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'not found' });
    res.json(data);
  }));

  app.post('/api/contact', wrap(async (req, res) => {
    const { name, phone = '', email = '', message } = req.body || {};
    if (!name || !name.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'name and message are required' });
    }
    const { error } = await supabase.from('messages').insert({
      name: name.trim().slice(0, 200),
      phone: String(phone).slice(0, 50),
      email: String(email).slice(0, 200),
      message: message.trim().slice(0, 5000),
    });
    if (error) throw error;
    res.json({ ok: true });
  }));

  // ---------- admin auth ----------

  const SESSION_COOKIE = 'mohtasham_admin';

  function requireAdmin(req, res, next) {
    if (req.signedCookies[SESSION_COOKIE] === 'ok') return next();
    res.status(401).json({ error: 'unauthorized' });
  }

  app.post('/api/admin/login', wrap(async (req, res) => {
    const { password } = req.body || {};
    if (!password || !verifyPassword(password, await getSetting('admin_password'))) {
      return res.status(401).json({ error: 'wrong password' });
    }
    res.cookie(SESSION_COOKIE, 'ok', {
      signed: true, httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600 * 1000,
    });
    res.json({ ok: true });
  }));

  app.post('/api/admin/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/admin/session', (req, res) => {
    res.json({ loggedIn: req.signedCookies[SESSION_COOKIE] === 'ok' });
  });

  app.post('/api/admin/password', requireAdmin, wrap(async (req, res) => {
    const { current, next } = req.body || {};
    if (!current || !verifyPassword(current, await getSetting('admin_password'))) {
      return res.status(400).json({ error: 'current password is wrong' });
    }
    if (!next || next.length < 8) {
      return res.status(400).json({ error: 'new password must be at least 8 characters' });
    }
    await setSetting('admin_password', hashPassword(next));
    res.json({ ok: true });
  }));

  // ---------- admin: products ----------

  async function productBody(req) {
    const b = req.body;
    const { data, error } = await supabase
      .from('collections').select('slug').order('sort', { ascending: true });
    if (error) throw error;
    const known = data.map((r) => r.slug);
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

  app.post('/api/admin/products', requireAdmin, upload.single('image'), wrap(async (req, res) => {
    const p = await productBody(req);
    if (!p.name_en || !p.name_fa) return res.status(400).json({ error: 'name_en and name_fa are required' });
    p.image = req.file ? await uploadImage(req.file) : (req.body.image || '/assets/carpet-kashan-gold.svg');
    const { data, error } = await supabase.from('products').insert(p).select('id').single();
    if (error) throw error;
    res.json({ ok: true, id: data.id });
  }));

  app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), wrap(async (req, res) => {
    const { data: existing, error: findErr } = await supabase
      .from('products').select('id, image').eq('id', req.params.id).maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: 'not found' });
    const p = await productBody(req);
    if (!p.name_en || !p.name_fa) return res.status(400).json({ error: 'name_en and name_fa are required' });
    p.image = req.file ? await uploadImage(req.file) : existing.image;
    const { error } = await supabase.from('products').update(p).eq('id', existing.id);
    if (error) throw error;
    res.json({ ok: true });
  }));

  app.delete('/api/admin/products/:id', requireAdmin, wrap(async (req, res) => {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  }));

  // ---------- admin: messages ----------

  app.get('/api/admin/messages', requireAdmin, wrap(async (req, res) => {
    const { data, error } = await supabase
      .from('messages').select('*').order('id', { ascending: false });
    if (error) throw error;
    res.json(data);
  }));

  app.post('/api/admin/messages/:id/read', requireAdmin, wrap(async (req, res) => {
    const { error } = await supabase.from('messages').update({ read: 1 }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  }));

  app.delete('/api/admin/messages/:id', requireAdmin, wrap(async (req, res) => {
    const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  }));

  // Last-resort error handler so a failed Supabase call returns JSON, not HTML.
  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'server error' });
  });

  return app;
}

module.exports = buildApp;

// When run directly (`npm start`), start a local HTTP server. On Vercel the app
// is imported by api/index.js and this block is skipped.
if (require.main === module) {
  buildApp()
    .then((app) => {
      app.listen(PORT, () => {
        console.log(`Mohtasham Carpets website running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
