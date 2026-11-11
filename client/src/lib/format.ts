export function formatDate(value: string | null | undefined): string {
  if (!value) return '未发布'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知日期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function readingTime(markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~[\]()!-]/g, ' ')
    .trim()
  const chineseChars = (plain.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latinWords = (plain.match(/[a-zA-Z0-9]+/g) ?? []).length
  const minutes = Math.max(1, Math.ceil((chineseChars + latinWords * 2) / 400))
  return `${minutes} 分钟阅读`
}

export function absoluteUrl(path: string, base: string): string {
  try {
    return new URL(path, base).toString()
  } catch {
    return path
  }
}
