#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const SRC = join(import.meta.dirname, '..', 'src')

const SHARED_PREFIX_REPLACEMENTS = [
  ['shared/components/', 'components/'],
  ['shared/ui/', 'components/ui/'],
  ['shared/api/', 'services/'],
  ['shared/lib/', 'utils/'],
  ['shared/hooks/', 'hooks/'],
  ['shared/types/', 'types/'],
  ['shared/config/', 'config/'],
  ['shared/data/', 'data/'],
]

function rewrite(content) {
  let s = content
  for (const [from, to] of SHARED_PREFIX_REPLACEMENTS) {
    if (s.includes(from)) s = s.split(from).join(to)
  }

  // app/store.ts → store/ (index.ts)
  s = s.replace(/\.\/app\/store\b/g, './store')
  for (let i = 1; i <= 10; i++) {
    const p = `${'../'.repeat(i)}app/store`
    const q = `${'../'.repeat(i)}store`
    if (s.includes(p)) s = s.split(p).join(q)
  }

  // routes/ → router/
  for (let i = 0; i <= 10; i++) {
    const prefix = i === 0 ? './' : `${'../'.repeat(i)}`
    s = s.split(`${prefix}routes/`).join(`${prefix}router/`)
  }

  // layouts/ → layout/
  for (let i = 0; i <= 10; i++) {
    const prefix = i === 0 ? './' : `${'../'.repeat(i)}`
    s = s.split(`${prefix}layouts/`).join(`${prefix}layout/`)
  }

  return s
}

const exts = new Set(['.ts', '.tsx', '.css'])

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (exts.has(extname(e.name))) out.push(p)
  }
  return out
}

async function main() {
  const files = await walk(SRC)
  let n = 0
  for (const f of files) {
    const raw = await readFile(f, 'utf8')
    const next = rewrite(raw)
    if (next !== raw) {
      await writeFile(f, next, 'utf8')
      n++
    }
  }
  console.log(`Rewrote imports in ${n} files`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
