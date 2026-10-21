# Dataset tooling

All commands run on Node.js 22.13+ with built-in `node:sqlite`. No native SQLite package, Python runtime, Cloudflare account, or CLI is required for these scripts.

| Script | Purpose |
| --- | --- |
| `build-web-data.mjs` | Validate the canonical SQLite DB and generate deterministic, chunked exports in `exports/web/` |
| `check-web-build.mjs` | Verify Pages file-count/size limits, absence of SQLite copies, and `/cheatdb/` asset paths |
| `web-data.test.mjs` | Check Unicode and multiline chunk preservation, chunk limits and schema/foreign-key rejection |
| `serve-web.mjs` | Local static SPA server: public `/cheatdb/` on port 18473, or flat Pages origin on port 18475 with `--origin` |

From the repository root:

```sh
node scripts/build-web-data.mjs
node --test scripts/web-data.test.mjs
```

Or use the commands in `apps/web/package.json`. Generation opens `data/cheatdb.db` read-only, checks integrity and foreign keys, and verifies its SHA-256 remains unchanged. It only clears and rewrites `exports/web/`; existing JSON/JSONL/XML distribution exports remain untouched. Generated data is ignored by Git and regenerated during every Pages build.

Importing or regenerating the canonical database and rebuilding the existing distribution formats are separate tasks. These web scripts do not invent a new import format, alter the schema, or rewrite those exports.
