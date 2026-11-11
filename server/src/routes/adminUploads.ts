import { Router } from 'express'
import multer from 'multer'

import type { AppConfig } from '../config'
import { AppError } from '../lib/errors'
import { MAX_UPLOAD_BYTES, saveUploadedImage } from '../services/uploads'

export function createAdminUploadsRouter(config: AppConfig): Router {
  const router = Router()
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
      fields: 4,
    },
  })

  router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'NO_FILE', '请选择要上传的图片')
    }
    const rawKind = typeof req.body?.kind === 'string' ? req.body.kind : 'image'
    const kind = rawKind === 'icon' ? 'icon' : 'image'
    const result = saveUploadedImage(req.file, config, kind)
    res.status(201).json(result)
  })

  return router
}
