# Mohtasham Carpets — Website

Bilingual (English / فارسی) brand website with a product catalog, contact form, and admin panel.
Built with Node.js + Express, SQLite (built into Node), and a vanilla JavaScript + CSS frontend
styled after the Mohtasham brand book (gold `#c3996c`, teal `#21403d`, plum `#5f3263`).

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
`seed/catalog.json` and is loaded the first time the database is created.

## Where things live

| Path | What it is |
|---|---|
| `server.js` | Express server + JSON API |
| `db.js` | SQLite schema and the 8 seeded sample carpets |
| `data/site.db` | The database (products, messages, admin password) |
| `data/uploads/` | Photos uploaded through the admin panel |
| `public/` | The website itself (HTML, CSS, JS, brand assets) |
| `public/js/i18n.js` | All English/Farsi text — edit wording here |
| `tools/make-placeholders.py` | Regenerates the placeholder carpet artwork |

## Language

The site defaults to English; the **فارسی / English** button in the header switches
language and flips the layout to right-to-left. The choice is remembered per browser.
