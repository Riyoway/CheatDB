import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './build-web-data.mjs';

const dist = join(root, 'apps/web/dist');
let files = 0;
function check(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) check(path);
    else {
      files++;
      assert(statSync(path).size < 25 * 1024 * 1024, `Pages file limit: ${path}`);
      assert(!path.endsWith('.db'), 'The canonical database must not be shipped or copied');
    }
  }
}
check(dist);
assert(files <= 20000, `Pages file count limit: ${files}`);
const html = readFileSync(join(dist, 'index.html'), 'utf8');
assert(html.includes('src="/cheatdb/assets/'));
assert(!/(?:href|src)="\/(?!cheatdb\/)/.test(html), 'Root-relative asset found');
assert.equal(readFileSync(join(dist, '_redirects'), 'utf8'), '/* /index.html 200\n');
console.log(`Pages build verified: ${files} files, all <25 MiB, assets under /cheatdb/`);
