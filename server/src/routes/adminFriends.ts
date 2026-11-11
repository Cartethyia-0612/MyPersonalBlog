import { Router } from 'express'
import { z } from 'zod'

import type { Db } from '../db'
import { AppError } from '../lib/errors'
import { parseBody } from '../lib/http'
import { imageReferenceSchema, isHttpUrl } from '../lib/validation'
import { createFriend, deleteFriend, listAllFriends, updateFriend } from '../services/friends'

const friendSchema = z.object({
  name: z.string().trim().min(1, '友链名称不能为空').max(60),
  url: z
    .string()
    .trim()
    .min(1, '友链地址不能为空')
    .max(2048)
    .refine(isHttpUrl, '请输入有效的 http(s) 地址'),
  avatarUrl: imageReferenceSchema.default(''),
  description: z.string().trim().max(300).default(''),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  visible: z.boolean().default(true),
})

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(404, 'FRIEND_NOT_FOUND', '友链不存在')
  }
  return id
}

export function createAdminFriendsRouter(db: Db): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json({ items: listAllFriends(db) })
  })

  router.post('/', (req, res) => {
    const input = parseBody(friendSchema, req)
    res.status(201).json({ friend: createFriend(db, input) })
  })

  router.put('/:id', (req, res) => {
    const input = parseBody(friendSchema, req)
    res.json({ friend: updateFriend(db, parseId(req.params.id), input) })
  })

  router.delete('/:id', (req, res) => {
    deleteFriend(db, parseId(req.params.id))
    res.json({ ok: true })
  })

  return router
}
