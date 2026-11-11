import bcrypt from 'bcryptjs'
import { afterEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase, runMigrations, type Db } from '../src/db'
import { createUser } from '../src/services/users'

let db: Db | undefined

afterEach(() => {
  if (db) closeDatabase(db)
  db = undefined
})

describe('database migrations', () => {
  it('creates the expected schema and default settings', () => {
    db = openDatabase(':memory:')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name)

    expect(tables).toContain('users')
    expect(tables).toContain('sessions')
    expect(tables).toContain('articles')
    expect(tables).toContain('friends')
    expect(tables).toContain('music_playlists')
    expect(tables).toContain('settings')
    expect(tables).toContain('seo_push_logs')

    const settingsCount = db.prepare('SELECT COUNT(*) AS count FROM settings').get() as {
      count: number
    }
    expect(settingsCount.count).toBeGreaterThanOrEqual(5)
  })

  it('never introduces comment tables', () => {
    db = openDatabase(':memory:')
    const commentTables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) LIKE '%comment%'",
      )
      .all()
    expect(commentTables).toHaveLength(0)
  })

  it('is idempotent', () => {
    db = openDatabase(':memory:')
    expect(() => runMigrations(db as Db)).not.toThrow()
  })

  it('stores passwords as bcrypt hashes, never plaintext', async () => {
    db = openDatabase(':memory:')
    const password = 'a-secure-password-123'
    await createUser(db, 'admin', password)

    const row = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('admin') as {
      password_hash: string
    }
    expect(row.password_hash).not.toBe(password)
    expect(row.password_hash.startsWith('$2')).toBe(true)
    expect(await bcrypt.compare(password, row.password_hash)).toBe(true)
  })
})
