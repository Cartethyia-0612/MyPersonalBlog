export interface DeviceDescription {
  browser: string
  os: string
  deviceType: '桌面设备' | '手机' | '平板' | '未知设备'
  label: string
}

function majorVersion(value: string | undefined): string {
  return value?.split('.')[0] ?? ''
}

function detectBrowser(ua: string): string {
  let match = /Edg(?:A|iOS)?\/([\d.]+)/.exec(ua)
  if (match) return `Edge ${majorVersion(match[1])}`.trim()

  match = /OPR\/([\d.]+)/.exec(ua)
  if (match) return `Opera ${majorVersion(match[1])}`.trim()

  match = /Firefox\/([\d.]+)/.exec(ua)
  if (match) return `Firefox ${majorVersion(match[1])}`.trim()

  match = /FxiOS\/([\d.]+)/.exec(ua)
  if (match) return `Firefox ${majorVersion(match[1])}`.trim()

  match = /CriOS\/([\d.]+)/.exec(ua)
  if (match) return `Chrome ${majorVersion(match[1])}`.trim()

  match = /Chrome\/([\d.]+)/.exec(ua)
  if (match) return `Chrome ${majorVersion(match[1])}`.trim()

  match = /Version\/([\d.]+).*Safari/.exec(ua)
  if (match) return `Safari ${majorVersion(match[1])}`.trim()

  match = /curl\/([\d.]+)/.exec(ua)
  if (match) return `curl ${majorVersion(match[1])}`.trim()

  if (/Wget\//.test(ua)) return 'Wget'
  return '未知浏览器'
}

function detectOs(ua: string): string {
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10/11'
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1'
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7'
  if (/Windows/.test(ua)) return 'Windows'

  if (/Android ([\d.]+)/.test(ua)) {
    return `Android ${majorVersion(/Android ([\d.]+)/.exec(ua)?.[1])}`.trim()
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const version = /OS ([\d_]+)/.exec(ua)?.[1]?.replace(/_/g, '.')
    return version ? `iOS ${majorVersion(version)}` : 'iOS'
  }
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return '未知系统'
}

function detectDeviceType(ua: string): DeviceDescription['deviceType'] {
  if (/iPad|Tablet/i.test(ua)) return '平板'
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return '手机'
  return '桌面设备'
}

export function describeUserAgent(userAgent: string): DeviceDescription {
  const ua = userAgent.trim()
  if (!ua) {
    return {
      browser: '未知浏览器',
      os: '未知系统',
      deviceType: '未知设备',
      label: '未知设备',
    }
  }

  const browser = detectBrowser(ua)
  const os = detectOs(ua)
  return {
    browser,
    os,
    deviceType: detectDeviceType(ua),
    label: `${browser} · ${os}`,
  }
}

export function normalizeIp(ip: string): string {
  const value = ip.trim()
  if (!value) return '未知'
  if (value === '::1') return '127.0.0.1'
  return value.startsWith('::ffff:') ? value.slice(7) : value
}
