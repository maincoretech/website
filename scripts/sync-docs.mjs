// Run explicitly against reviewed sibling checkouts; website builds need no GitHub access.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { docs } from '../src/lib/docs/projects.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const parent = resolve(process.argv[2] ?? resolve(root, '..'));
const provenance = {};
for (const doc of docs) {
  const repo = resolve(parent, doc.project);
  const content = await readFile(resolve(repo, doc.source), 'utf8');
  const directory = resolve(root, 'src/lib/docs/content', doc.project);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, doc.slug + '.md'), content);
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const committed = execFileSync('git', ['show', revision + ':' + doc.source], { cwd: repo, encoding: 'utf8' });
  provenance[doc.project + '/' + doc.slug] = {
    revision, modified: content !== committed,
    sha256: createHash('sha256').update(content).digest('hex')
  };
}
await writeFile(resolve(root, 'src/lib/docs/sources.json'), JSON.stringify(provenance, null, 2) + '\n');
// Retain the licenses distributed with the imported documentation.
for (const [project, file] of [['keine', 'LICENSE'], ['hakutaku', 'LICENSE-MIT'], ['hakutaku', 'LICENSE-APACHE']]) {
  const dir = resolve(root, 'static/docs/licenses', project);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, file + '.txt'), await readFile(resolve(parent, project, file)));
}
console.log(`Synced ${docs.length} documents from ${parent}`);
