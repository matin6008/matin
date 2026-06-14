-- Mohtasham Carpets — Supabase (Postgres) schema.
-- Run this once in the Supabase dashboard → SQL Editor → New query → Run.
-- It mirrors the original SQLite schema. Data is seeded separately by `npm run setup`.

create table if not exists collections (
  slug    text primary key,
  name_en text not null,
  name_fa text not null,
  spec_en text not null default '',
  spec_fa text not null default '',
  cover   text not null default '',
  sort    integer not null default 0
);

create table if not exists products (
  id          bigint generated always as identity primary key,
  name_en     text not null,
  name_fa     text not null,
  desc_en     text not null default '',
  desc_fa     text not null default '',
  collection  text not null references collections(slug),
  size        text not null default '',
  material_en text not null default '',
  material_fa text not null default '',
  knots       text not null default '',
  image       text not null default '',
  featured    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists messages (
  id         bigint generated always as identity primary key,
  name       text not null,
  phone      text not null default '',
  email      text not null default '',
  message    text not null,
  read       integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key   text primary key,
  value text not null
);

-- Products joined with their collection, so the API can select one flat row
-- (matches the old SQL join in server.js).
create or replace view products_full as
  select p.id, p.name_en, p.name_fa, p.desc_en, p.desc_fa, p.collection, p.size,
         p.material_en, p.material_fa, p.knots, p.image, p.featured, p.created_at,
         c.name_en as collection_en, c.name_fa as collection_fa,
         c.spec_en as spec_en, c.spec_fa as spec_fa
  from products p
  join collections c on c.slug = p.collection;

-- Collections with a live product count.
create or replace view collections_full as
  select c.slug, c.name_en, c.name_fa, c.spec_en, c.spec_fa, c.cover, c.sort,
         count(p.id) as count
  from collections c
  left join products p on p.collection = c.slug
  group by c.slug;

-- Lock the tables down. All app access goes through the server with the
-- service_role key, which bypasses RLS; enabling RLS with no public policy
-- means the anon/public key cannot read or write these tables directly.
alter table collections enable row level security;
alter table products    enable row level security;
alter table messages    enable row level security;
alter table settings    enable row level security;
