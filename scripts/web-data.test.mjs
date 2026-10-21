import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { chunkCheats, validateDatabase } from './build-web-data.mjs';

test('code chunks preserve order, Unicode, multiline codes and metadata at byte boundaries', () => {
  const cheats = Array.from({ length: 205 }, (_, id) => ({ id, name: '無限コイン', code_text: '0123\nABCD', authors: ['作者'] }));
  const chunks = chunkCheats(cheats, 1024);
  assert.deepEqual(chunks.flat(), cheats);
  assert(chunks.every(chunk => Buffer.byteLength(JSON.stringify(chunk)) <= 1024));
  assert(chunkCheats(cheats, 100000).every(chunk => chunk.length <= 100));
  assert.deepEqual(chunkCheats([]), []);
  assert.deepEqual(chunkCheats([{ id: 1, code_text: 'a'.repeat(2000) }], 1024).flat(), [{ id: 1, code_text: 'a'.repeat(2000) }]);
});

test('validation rejects unsupported schemas and broken foreign keys', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE metadata(key TEXT,value TEXT); INSERT INTO metadata VALUES ('schema_version','2');
    CREATE TABLE games(id INTEGER PRIMARY KEY); CREATE TABLE cheats(id INTEGER,game_id INTEGER REFERENCES games(id),name TEXT,code_text TEXT);`);
  assert.throws(() => validateDatabase(db), /Unsupported DB schema/);
  db.exec("UPDATE metadata SET value='1'");
  validateDatabase(db);
  db.exec("PRAGMA foreign_keys=OFF; INSERT INTO cheats VALUES (1,9,'test','code')");
  assert.throws(() => validateDatabase(db));
  db.close();
});
