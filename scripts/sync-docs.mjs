// Run explicitly against reviewed sibling checkouts; website builds need no GitHub access.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { docs } from '../src/lib/docs/projects.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const parent = resolve(process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? resolve(root, '..'));
const check = process.argv.includes('--check');
const provenance = {};
let stale = false;
for (const doc of docs) {
  const repo = resolve(parent, doc.project);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trimEnd();
  const revision = git('rev-parse', 'HEAD');
  // Publish a reproducible committed snapshot, never another task's working tree.
  const content = execFileSync('git', ['show', revision + ':' + doc.source], { cwd: repo, encoding: 'utf8' });
  const manifest = git('show', revision + ':Cargo.toml');
  const version = manifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (!version) throw new Error('Missing project version: ' + doc.project);
  const directory = resolve(root, 'src/lib/docs/content', doc.project);
  const destination = resolve(directory, doc.slug + '.md');
  if (check) {
    if (await readFile(destination, 'utf8').catch(() => '') !== content) { console.error('Stale: ' + doc.href); stale = true; }
  } else {
    await mkdir(directory, { recursive: true });
    await writeFile(destination, content);
  }
  provenance[doc.project + '/' + doc.slug] = {
    revision, version, updated: git('log', '-1', '--format=%cs', revision, '--', doc.source), modified: false,
    sha256: createHash('sha256').update(content).digest('hex')
  };
}
const record = JSON.stringify(provenance, null, 2) + '\n';
if (check) {
  if (await readFile(resolve(root, 'src/lib/docs/sources.json'), 'utf8') !== record) stale = true;
} else await writeFile(resolve(root, 'src/lib/docs/sources.json'), record);
// Retain the licenses distributed with the imported documentation.
for (const [project, file] of [['keine', 'LICENSE'], ['hakutaku', 'LICENSE-MIT'], ['hakutaku', 'LICENSE-APACHE']]) {
  const dir = resolve(root, 'static/docs/licenses', project);
  const content = execFileSync('git', ['show', 'HEAD:' + file], { cwd: resolve(parent, project), encoding: 'utf8' });
  if (check) {
    if (await readFile(resolve(dir, file + '.txt'), 'utf8') !== content) stale = true;
  } else {
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, file + '.txt'), content);
  }
}
if (stale) { console.error('Documentation snapshots need synchronization.'); process.exitCode = 1; }
else console.log(`${check ? 'Verified' : 'Synced'} ${docs.length} committed documents from ${parent}`);
