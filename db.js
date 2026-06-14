'use strict';
require('dotenv').config();

const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const BUCKET = process.env.SUPABASE_BUCKET || 'carpets';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase credentials. Copy .env.example to .env and set ' +
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
}

// Service-role client: full access, bypasses Row Level Security. Server-side only.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data ? data.value : null;
}

async function setSetting(key, value) {
  const { error } = await supabase
    .from('settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}

module.exports = { supabase, BUCKET, hashPassword, verifyPassword, getSetting, setSetting };
