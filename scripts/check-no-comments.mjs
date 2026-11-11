#!/usr/bin/env node
/**
 * Guard rail for a project requirement: the site must never grow a comment
 * section or a comment API. This intentionally checks code patterns rather than
 * prose such as "NO_COMMENTS", which is legitimate site copy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoots = [
  path.join(projectRoot, 'server', 'src'),
  path.join(projectRoot, 'client', 'src'),
]
const extensions = new Set(['.ts', '.js', '.mjs', '.vue', '.sql'])
const findings = []
let checkedFiles = 0

const serverPatterns = [
  { regex: /CREATE\s+TABLE[^;]*\bcomments?\b/i, label: 'comment table in server source' },
  {
    regex: /(?:router|app)\.(?:get|post|put|patch|delete)\s*\(\s*['"`][^'"`]*\/comments?/i,
    label: 'comment API route',
  },
  {
    regex: /['"`]\/api\/(?:[^'"`]*\/)?comments?(?:\/|['"`])/i,
    label: 'comment API path',
  },
]

const clientPatterns = [
  {
    regex: /\bComment(?:Section|List|Form|Item|Box|Area|Thread|Editor)\b/,
    label: 'comment component',
  },
  {
    regex: /class=["'][^"']*comment-(?:list|form|section|container|thread)/i,
    label: 'comment UI class',
  },
  { regex: /['"`]\/api\/(?:[^'"`]*\/)?comments?(?:\/|['"`])/i, label: 'comment API path' },
  { regex: /\bv-comments?\b/i, label: 'comment Vue component' },
]

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (!extensions.has(path.extname(entry.name))) continue
    checkedFiles += 1
    const content = fs.readFileSync(fullPath, 'utf8')
    const isServer = fullPath.startsWith(path.join(projectRoot, 'server'))
    const patterns = isServer ? serverPatterns : clientPatterns
    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        findings.push(`${path.relative(projectRoot, fullPath)} — ${pattern.label}`)
      }
    }
  }
}

for (const root of sourceRoots) {
  if (fs.existsSync(root)) walk(root)
}

if (findings.length > 0) {
  console.error('No-comments guard failed:')
  for (const finding of findings) console.error(`  - ${finding}`)
  process.exit(1)
}

console.log(
  `No-comments guard passed: ${checkedFiles} source files scanned, no comment feature found.`,
)
