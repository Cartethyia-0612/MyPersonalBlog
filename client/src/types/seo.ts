export interface SeoPushLog {
  id: number
  provider: 'indexnow' | 'baidu'
  urlCount: number
  success: boolean
  statusCode: number | null
  message: string
  createdAt: string
}

export interface SeoOverview {
  siteUrl: string
  canPush: boolean
  sitemapUrl: string
  robotsUrl: string
  urlCount: number
  articleCount: number
  indexNow: {
    configured: boolean
    keyPreview: string
    keyLocation: string
  }
  baidu: {
    configured: boolean
    tokenPreview: string
  }
  logs: SeoPushLog[]
}

export interface SeoKeyPatch {
  indexNowKey?: string
  baiduToken?: string
  clearIndexNowKey?: boolean
  clearBaiduToken?: boolean
}

export interface SeoPushResponse {
  log: SeoPushLog
  overview: SeoOverview
}
