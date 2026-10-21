# CheatDB

CheatDB is a normalized collection of game cheat codes for Nintendo platforms.

The primary dataset is stored in SQLite. JSON and JSONL exports are included for applications that prefer text-based formats.

## Repository layout

```text
CheatDB/
├─ apps/
│  └─ web/        # Web frontend for db.riyo.me/cheatdb
├─ packages/      # Shared code used by apps and tooling
├─ data/
│  └─ cheatdb.db  # Canonical SQLite database
├─ exports/       # Generated distribution formats
├─ scripts/       # Import, build, export, validation, and web-data tooling
└─ README.md
```

`data/cheatdb.db` is the canonical source of truth. Files under `exports/` are distribution formats derived from the dataset. The web frontend lives in `apps/web/`; shared packages should only be added when code is genuinely shared between multiple consumers.

## Contents

- `data/cheatdb.db` — canonical SQLite database
- `exports/JSON/Nintendo/switch.json` — Nintendo Switch cheats
- `exports/JSON/Nintendo/3ds.json` — Nintendo 3DS cheats
- `exports/JSON/Nintendo/nes.json` — Nintendo Entertainment System cheats
- `exports/JSON/Nintendo/wiiu.json` — Wii U cheats
- `exports/JSON/Nintendo/all.jsonl` — one cheat record per line across all Nintendo platforms
- `exports/JGeckoU/AUMJ88.xml` — JGecko U XML export for Minecraft: Wii U Edition (AUMJ88)

## Dataset size

| Platform | Games / variants | Cheats |
| --- | ---: | ---: |
| Nintendo Switch | 2,491 | 56,476 |
| Nintendo 3DS | 644 | 12,265 |
| Nintendo Entertainment System | 2,180 | 42,172 |
| Wii U | 12 | 6,948 |
| **Total** | **5,327** | **117,861** |

## JSON structure

Each platform JSON file contains an array of game records.

```json
{
  "id": "platform-specific game identifier",
  "name": "Game title",
  "cheat": [
    {
      "name": "Cheat name",
      "code": "code line or an array of code lines"
    }
  ]
}
```

Additional fields are included only when applicable:

- `build_id` — game build identifier
- `region_id` — region or product identifier
- `version` — game or code version
- `type` — code or execution type
- `notes` — compatibility or usage notes
- `aliases` — alternate names
- `authors` — credited code authors when present

Game records may also contain platform-specific identifiers such as `aliases`, `game_ids`, or `region_ids`.

`code` is stored as a string for a single-line code or as an array of strings for a multi-line code.

## SQLite structure

The main tables in `data/cheatdb.db` are:

- `platforms`
- `games`
- `game_aliases`
- `game_identifiers`
- `cheats`
- `cheat_aliases`
- `cheat_authors`

The database also includes `cheat_view` for simple queries and an FTS5 index for text search.

```sql
SELECT game_name, cheat_name, code_text
FROM cheat_view
WHERE platform = 'wiiu'
  AND game_name LIKE '%Minecraft%';
```

## Web browser

The dedicated browser lives in `apps/web/` and is published at **https://db.riyo.me/cheatdb/**. It supports game/title-ID/alias search, platform filtering, build and region filters, cheat-name search, author credits, and code copying. Selected games and searches can be linked using `?game=1&q=Mario`.

```sh
cd apps/web
npm ci
npm run dev
```

Open http://127.0.0.1:5173/cheatdb/. Node.js **22.13+** is required; `.node-version` pins the tested Node 22 release. No database server is needed.

`npm run build` opens **only** `data/cheatdb.db`, in read-only mode, validates it, generates `exports/web/`, type-checks the app, builds `apps/web/dist/`, and checks Cloudflare Pages file limits. Generated web exports are copied into the build, never into the app's source tree. The SQLite file and the existing JSON, JSONL and XML exports are not copied or modified. `npm test` runs the generator's checks.

### Two repositories, two Pages projects

| Repository | Responsibility | Public URL |
| --- | --- | --- |
| `Riyoway/Database` | Database portal, common portal UI, path-routing Worker | `https://db.riyo.me/` |
| `Riyoway/CheatDB` | Canonical dataset, exports and dedicated browser | `https://db.riyo.me/cheatdb/` |

For the **CheatDB Pages project**, set:

| Setting | Value |
| --- | --- |
| Repository | `Riyoway/CheatDB` |
| Root directory | `apps/web` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION=22.22.3` |
| Custom domain | **None**; keep the project's own `*.pages.dev` URL |

Only the **Database Portal** Pages project owns the `db.riyo.me` custom domain. The Worker is maintained and deployed from **`Riyoway/Database`**, using the `db.riyo.me/cheatdb*` route so that bare-prefix queries are included. The Worker checks the exact path boundary before proxying. Its origin is `https://cheatdb.pages.dev`.

The Worker redirects the bare `/cheatdb` to `/cheatdb/`, strips exactly one `/cheatdb` prefix for proxy requests, preserves queries, and rewrites origin redirects onto the public path. For example:

```text
Public request                            Internal Pages request
/cheatdb/                              → /
/cheatdb/switch/?game=1                 → /switch/?game=1
/cheatdb/assets/app.js                  → /assets/app.js
/cheatdb/data/catalog.json              → /data/catalog.json
```

Vite uses `base: "/cheatdb/"`; navigation and data requests use that same base. The build intentionally contains flat `assets/` and `data/` directories because the proxy removes the prefix. Pages' `_redirects` serves the SPA on direct platform URLs. The raw Pages origin is internal; use the routed public URL or the local public-path server to review the browser.

Production uses the Git-integrated `cheatdb` Pages project and the `database-path-router` Worker maintained in the private `Riyoway/Database` repository. The portal is deployed by the `riyo-database` Pages project. Main-branch pushes update each Pages project automatically; Worker changes are deployed separately from `Database/worker/wrangler.jsonc`.

See [apps/web/README.md](apps/web/README.md) for local proxy testing, data loading, and design details. Local development commands do not access Cloudflare.

Cheat compatibility may depend on the exact game version, build, region, emulator, or hardware environment.
