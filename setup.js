'use strict';
require('dotenv').config();

// One-time setup: creates the Storage bucket and seeds the database.
// Run AFTER applying schema.sql in the Supabase SQL editor:
//   npm run setup
// Safe to re-run — it only fills in what's missing.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { supabase, BUCKET, hashPassword, getSetting, setSetting } = require('./db');

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (data) { console.log(`✓ bucket "${BUCKET}" already exists`); return; }
  // getBucket errors when the bucket is absent; create it as public.
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '8MB',
  });
  if (createErr) throw createErr;
  console.log(`✓ created public bucket "${BUCKET}"`);
}

async function ensureSettings() {
  if (!(await getSetting('admin_password'))) {
    await setSetting('admin_password', hashPassword(process.env.ADMIN_PASSWORD || 'mohtasham1401'));
    console.log('✓ seeded admin_password');
  }
  if (!(await getSetting('session_secret'))) {
    await setSetting('session_secret', crypto.randomBytes(32).toString('hex'));
    console.log('✓ seeded session_secret');
  }
}

async function seedCatalog() {
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'catalog.json'), 'utf8'));

  const { count: collCount } = await supabase
    .from('collections').select('*', { count: 'exact', head: true });
  if (!collCount) {
    const rows = seed.collections.map((c, i) => ({
      slug: c.slug, name_en: c.name_en, name_fa: c.name_fa,
      spec_en: c.spec_en, spec_fa: c.spec_fa, cover: c.cover, sort: i,
    }));
    const { error } = await supabase.from('collections').insert(rows);
    if (error) throw error;
    console.log(`✓ seeded ${rows.length} collections`);
  } else {
    console.log(`✓ collections already present (${collCount})`);
  }

  const { count: prodCount } = await supabase
    .from('products').select('*', { count: 'exact', head: true });
  if (!prodCount) {
    const rows = seed.products.map((p) => ({
      name_en: p.name_en, name_fa: p.name_fa, desc_en: p.desc_en, desc_fa: p.desc_fa,
      collection: p.collection, size: p.size, material_en: p.material_en,
      material_fa: p.material_fa, knots: p.knots, image: p.image, featured: p.featured,
    }));
    const { error } = await supabase.from('products').insert(rows);
    if (error) throw error;
    console.log(`✓ seeded ${rows.length} products`);
  } else {
    console.log(`✓ products already present (${prodCount})`);
  }
}

async function main() {
  // Quick check that schema.sql has been applied.
  const { error } = await supabase.from('settings').select('key').limit(1);
  if (error) {
    throw new Error(
      'Tables are missing. Apply schema.sql in the Supabase SQL editor first.\n' +
      `(Supabase said: ${error.message})`
    );
  }
  await ensureBucket();
  await ensureSettings();
  await seedCatalog();
  console.log('\nSetup complete. Start the site with: npm start');
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message || err);
  process.exit(1);
});
