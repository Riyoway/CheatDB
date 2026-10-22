import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const webOutput = join(root, 'exports', 'web');
const canonical = join(root, 'data', 'cheatdb.db');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');

export function validateDatabase(db) {
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(db.prepare("SELECT value FROM metadata WHERE key='schema_version'").get()?.value, '1', 'Unsupported DB schema');
  assert.equal(db.prepare('SELECT count(*) n FROM cheats WHERE code_text IS NULL OR name IS NULL').get().n, 0);
}

// Keep each code chunk small, including games with thousands of long codes.
export function chunkCheats(cheats, byteLimit = 512 * 1024) {
  const chunks = [];
  let chunk = [], size = 2;
  for (const cheat of cheats) {
    const bytes = Buffer.byteLength(JSON.stringify(cheat)) + 1;
    assert(bytes < 24 * 1024 * 1024, `Cheat ${cheat.id} exceeds the Pages file limit`);
    if (chunk.length && (size + bytes > byteLimit || chunk.length >= 100)) {
      chunks.push(chunk);
      chunk = []; size = 2;
    }
    chunk.push(cheat); size += bytes;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

export function generateWebData() {
  const before = digest(canonical);
  const revision = before.slice(0, 16);
  const db = new DatabaseSync(canonical, { readOnly: true });
  let files = 0, largest = 0;
  const write = (path, value) => {
    const body = JSON.stringify(value);
    const size = Buffer.byteLength(body);
    assert(size < 24 * 1024 * 1024, `${path} is too large for Pages`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
    files++; largest = Math.max(largest, size);
  };
  try {
    validateDatabase(db);
    // Only clear this script's generated directory, never canonical data or existing exports.
    assert.equal(resolve(webOutput), resolve(root, 'exports', 'web'));
    rmSync(webOutput, { recursive: true, force: true });
    const dataPath = join(webOutput, 'data', revision);
    const platforms = db.prepare(`SELECT p.id,p.name,count(DISTINCT g.id) games,count(c.id) cheats
      FROM platforms p LEFT JOIN games g ON g.platform_id=p.id LEFT JOIN cheats c ON c.game_id=g.id
      GROUP BY p.id ORDER BY CASE p.id WHEN 'switch' THEN 0 WHEN '3ds' THEN 1 WHEN 'wiiu' THEN 2 ELSE 3 END`).all();
    const games = db.prepare(`SELECT g.id,g.platform_id platform,g.external_id externalId,g.name,count(c.id) cheats
      FROM games g LEFT JOIN cheats c ON c.game_id=g.id GROUP BY g.id ORDER BY g.name COLLATE NOCASE,g.id`).all();
    const gameAliases = db.prepare('SELECT alias FROM game_aliases WHERE game_id=? ORDER BY alias');
    const identifiers = db.prepare('SELECT identifier,region FROM game_identifiers WHERE game_id=? ORDER BY identifier,region');
    const cheatQuery = db.prepare('SELECT * FROM cheats WHERE game_id=? ORDER BY id');
    const authors = db.prepare('SELECT author FROM cheat_authors WHERE cheat_id=? ORDER BY author');
    const aliases = db.prepare('SELECT alias FROM cheat_aliases WHERE cheat_id=? ORDER BY alias');
    let cheatTotal = 0;
    for (const game of games) {
      game.aliases = gameAliases.all(game.id).map(row => row.alias);
      game.identifiers = identifiers.all(game.id);
      const cheats = cheatQuery.all(game.id).map(({ game_id, ...cheat }) => ({
        ...cheat,
        authors: authors.all(cheat.id).map(row => row.author),
        aliases: aliases.all(cheat.id).map(row => row.alias),
      }));
      assert.equal(cheats.length, game.cheats);
      const summaries = [];
      chunkCheats(cheats).forEach((chunk, part) => {
        write(join(dataPath, 'codes', `${game.id}-${part}.json`), chunk);
        for (const { id, name, build_id, region_id, version, type, aliases } of chunk) {
          summaries.push({ id, name, build_id, region_id, version, type, aliases, part });
        }
      });
      write(join(dataPath, 'games', `${game.id}.json`), { ...game, entries: summaries });
      cheatTotal += cheats.length;
    }
    assert.equal(cheatTotal, db.prepare('SELECT count(*) n FROM cheats').get().n);
    write(join(webOutput, 'data', 'catalog.json'), {
      schemaVersion: 1, revision, sha256: before,
      generatedAt: db.prepare("SELECT value FROM metadata WHERE key='generated_at'").get()?.value ?? null,
      totalGames: games.length, totalCheats: cheatTotal, platforms, games,
    });
    assert(files < 19500, 'Generated data approaches the Cloudflare Pages free plan file limit');
    writeFileSync(join(webOutput, '_redirects'), '/* /index.html 200\n');
    writeFileSync(join(webOutput, '_routes.json'), JSON.stringify({ version: 1, include: ['/download/*'], exclude: [] }));
    writeFileSync(join(webOutput, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; media-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n/data/*\n  Cache-Control: public, max-age=0, must-revalidate\n`);
    console.log(`${games.length} games / ${cheatTotal} cheats → exports/web (${files} JSON files; largest ${largest.toLocaleString()} bytes)`);
    return { files, largest, games: games.length, cheats: cheatTotal };
  } finally {
    db.close();
    assert.equal(digest(canonical), before, 'Canonical database changed');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generateWebData();
