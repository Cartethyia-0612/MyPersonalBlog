import { Router } from 'express'
import { z } from 'zod'

import type { Db } from '../db'
import { parseBody } from '../lib/http'
import { imageReferenceSchema, isHttpUrl, optionalHttpUrlSchema } from '../lib/validation'
import {
  getAboutContent,
  getFooterSettings,
  getMusicSettings,
  getSiteSettings,
  saveAboutContent,
  updateFooterSettings,
  updateMusicSettings,
  updateSiteSettings,
} from '../services/settings'

const sitePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    tagline: z.string().trim().max(100).optional(),
    description: z.string().trim().max(300).optional(),
    icon: imageReferenceSchema.optional(),
    author: z.string().trim().max(60).optional(),
    siteUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => (value ? value.replace(/\/+$/, '') : value)),
  })
  .strict()

const footerLinkSchema = z
  .object({
    text: z.string().trim().min(1).max(100),
    url: optionalHttpUrlSchema,
  })
  .strict()

const footerPatchSchema = z
  .object({
    icp: z.string().trim().max(80).optional(),
    policeIcp: z.string().trim().max(80).optional(),
    policeUrl: optionalHttpUrlSchema.optional(),
    virtualRecords: z.array(footerLinkSchema).max(10).optional(),
    customText: z.string().trim().max(500).optional(),
    copyright: z.string().trim().max(200).optional(),
  })
  .strict()

const metingApiSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isHttpUrl, '请输入有效的 http(s) 地址')
  .transform((value) => (value.endsWith('/') ? value : `${value}/`))

const musicPatchSchema = z
  .object({
    apiBase: metingApiSchema.optional(),
  })
  .strict()

const settingsPatchSchema = z
  .object({
    site: sitePatchSchema.optional(),
    footer: footerPatchSchema.optional(),
    music: musicPatchSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.site || value.footer || value.music), '至少需要提交一项设置')

const aboutSchema = z.object({
  contentMd: z.string().max(200_000),
})

export function createAdminSettingsRouter(db: Db): Router {
  const router = Router()

  router.get('/settings', (_req, res) => {
    res.json({
      site: getSiteSettings(db),
      footer: getFooterSettings(db),
      music: getMusicSettings(db),
    })
  })

  router.put('/settings', (req, res) => {
    const input = parseBody(settingsPatchSchema, req)
    if (input.site) updateSiteSettings(db, input.site)
    if (input.footer) updateFooterSettings(db, input.footer)
    if (input.music) updateMusicSettings(db, input.music)

    res.json({
      site: getSiteSettings(db),
      footer: getFooterSettings(db),
      music: getMusicSettings(db),
    })
  })

  router.get('/about', (_req, res) => {
    res.json({ contentMd: getAboutContent(db) })
  })

  router.put('/about', (req, res) => {
    const { contentMd } = parseBody(aboutSchema, req)
    saveAboutContent(db, contentMd)
    res.json({ contentMd })
  })

  return router
}
