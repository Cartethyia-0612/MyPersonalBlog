import type { Db } from '../db'
import { AppError } from '../lib/errors'

interface FriendRow {
  id: number
  name: string
  url: string
  avatar_url: string
  description: string
  sort_order: number
  visible: number
  created_at: string
  updated_at: string
}

export interface Friend {
  id: number
  name: string
  url: string
  avatarUrl: string
  description: string
  sortOrder: number
  visible: boolean
  createdAt: string
  updatedAt: string
}

export interface FriendInput {
  name: string
  url: string
  avatarUrl: string
  description: string
  sortOrder: number
  visible: boolean
}

function toFriend(row: FriendRow): Friend {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    avatarUrl: row.avatar_url,
    description: row.description,
    sortOrder: row.sort_order,
    visible: Boolean(row.visible),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listVisibleFriends(db: Db): Friend[] {
  const rows = db
    .prepare('SELECT * FROM friends WHERE visible = 1 ORDER BY sort_order ASC, id ASC')
    .all() as FriendRow[]
  return rows.map(toFriend)
}

export function listAllFriends(db: Db): Friend[] {
  const rows = db
    .prepare('SELECT * FROM friends ORDER BY sort_order ASC, id ASC')
    .all() as FriendRow[]
  return rows.map(toFriend)
}

export function getFriendStats(db: Db): { total: number; visible: number } {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN visible = 1 THEN 1 ELSE 0 END) AS visible
       FROM friends`,
    )
    .get() as { total: number; visible: number | null }
  return { total: row.total, visible: row.visible ?? 0 }
}

export function createFriend(db: Db, input: FriendInput): Friend {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO friends
       (name, url, avatar_url, description, sort_order, visible, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.url.trim(),
      input.avatarUrl.trim(),
      input.description.trim(),
      input.sortOrder,
      input.visible ? 1 : 0,
      now,
      now,
    )
  return toFriend(
    db
      .prepare('SELECT * FROM friends WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as FriendRow,
  )
}

export function updateFriend(db: Db, id: number, input: FriendInput): Friend {
  const result = db
    .prepare(
      `UPDATE friends
       SET name = ?, url = ?, avatar_url = ?, description = ?, sort_order = ?, visible = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name.trim(),
      input.url.trim(),
      input.avatarUrl.trim(),
      input.description.trim(),
      input.sortOrder,
      input.visible ? 1 : 0,
      new Date().toISOString(),
      id,
    )
  if (result.changes === 0) throw new AppError(404, 'FRIEND_NOT_FOUND', '友链不存在')
  return toFriend(db.prepare('SELECT * FROM friends WHERE id = ?').get(id) as FriendRow)
}

export function deleteFriend(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM friends WHERE id = ?').run(id)
  if (result.changes === 0) throw new AppError(404, 'FRIEND_NOT_FOUND', '友链不存在')
}
