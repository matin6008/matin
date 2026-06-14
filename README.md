# Mohtasham Carpets — Website

Bilingual (English / فارسی) brand website with a product catalog, contact form, and admin panel.
Built with Node.js + Express, **Supabase** (Postgres + Storage) for data and photos, and a vanilla
JavaScript + CSS frontend styled after the Mohtasham brand book
(gold `#c3996c`, teal `#21403d`, plum `#5f3263`).

## First-time setup (connect to Supabase)

The site reads its data from a Supabase project. You only do this once.

1. **Add credentials.** Copy `.env.example` to `.env` and fill in, from the Supabase
   dashboard → *Project Settings → API*:
   - `SUPABASE_URL` — the Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** secret key
2. **Create the tables.** In the Supabase dashboard → *SQL Editor*, paste the contents of
   `schema.sql` and run it.
3. **Seed data + storage.** From the terminal:
   ```sh
   export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
   cd mohtasham-website
   npm install
   npm run setup
   ```
   This creates the public `carpets` storage bucket, seeds the admin password and session
   secret, and loads the 35 carpets from `seed/catalog.json`.

> The `.env` file holds secrets and is git-ignored — never commit it. The service_role key
> is used **server-side only**; it is never sent to the browser.

## How to start the website

**Easiest:** double-click `start.command` in Finder.

**From the terminal:**

```sh
export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
cd mohtasham-website
node server.js
```

Then open **http://localhost:3000** in your browser.

> Node.js was installed via nvm and is not on the default PATH — the `export PATH=...`
> line (already inside `start.command`) takes care of that.

## Admin panel

- Address: **http://localhost:3000/admin.html**
- Default password: **`mohtasham1401`**
- ⚠️ **Change the password right away**: Admin → Settings → Change admin password.

In the admin panel you can:
- Add / edit / delete carpets (names and descriptions in both English and Farsi)
- Assign each carpet to one of the six collections and upload its photo
- Mark carpets as *featured* so they appear on the home page
- Read and delete messages sent through the contact form

## Collections

The catalog is organised into six collections extracted from the product catalogs
(France, Versace, Rochak, Onyx, Helena, Patchwork — 35 carpets with real photos).
To re-extract photos from the catalog PDFs or change which designs are included, see
`tools/extract-catalog.py` and `tools/make-seed.py`; the seed data lives in
`seed/catalog.json` and is loaded into Supabase by `npm run setup`.

## Where things live

| Path | What it is |
|---|---|
| `server.js` | Express server + JSON API (async Supabase queries) |
| `db.js` | Supabase client + password / settings helpers |
| `schema.sql` | Postgres tables + views — run once in the Supabase SQL editor |
| `setup.js` | One-time seed: storage bucket + catalog + admin password (`npm run setup`) |
| `.env` | Supabase URL + service_role key (git-ignored, you create it) |
| Supabase Postgres | The database (collections, products, messages, admin password) |
| Supabase Storage (`carpets` bucket) | Photos uploaded through the admin panel |
| `public/` | The website itself (HTML, CSS, JS, brand assets) |
| `public/js/i18n.js` | All English/Farsi text — edit wording here |
| `tools/make-placeholders.py` | Regenerates the placeholder carpet artwork |

## Language

The site defaults to English; the **فارسی / English** button in the header switches
language and flips the layout to right-to-left. The choice is remembered per browser.
