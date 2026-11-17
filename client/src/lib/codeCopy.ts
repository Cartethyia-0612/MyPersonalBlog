const RESET_DELAY_MS = 1000
const resetTimers = new WeakMap<HTMLButtonElement, number>()

const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V6a2 2 0 0 1 2-2h9"></path></svg>`
const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>`
const FAIL_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>`

/**
 * Wrap every rendered code block in a positioning container and add a copy
 * button outside the horizontal scroll area. The wrapper is what keeps the
 * button pinned to the top-right corner while the <pre> scrolls underneath it.
 */
export function decorateCodeBlocks(root: HTMLElement): void {
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block')) return

    const wrapper = document.createElement('div')
    wrapper.className = 'code-block'
    pre.parentNode?.insertBefore(wrapper, pre)
    wrapper.appendChild(pre)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'code-copy'
    button.dataset.codeCopy = 'true'
    button.innerHTML = COPY_ICON
    button.title = '复制代码'
    button.setAttribute('aria-label', '复制代码')
    wrapper.appendChild(button)
  })
}

export async function handleCodeCopyClick(event: MouseEvent, root: HTMLElement): Promise<void> {
  const target = event.target
  if (!(target instanceof Element)) return

  const button = target.closest<HTMLButtonElement>('[data-code-copy]')
  if (!button || !root.contains(button)) return

  event.preventDefault()
  const block = button.closest('.code-block')
  const code = block?.querySelector('pre code') ?? block?.querySelector('pre')
  const text = code?.textContent ?? ''
  if (!text) return

  const copied = await copyCodeText(text)
  markButton(button, copied)
}

export async function copyCodeText(text: string): Promise<boolean> {
  if (!text) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Clipboard permission can be denied outside a secure context; fall back.
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}

function markButton(button: HTMLButtonElement, copied: boolean): void {
  const existing = resetTimers.get(button)
  if (existing !== undefined) window.clearTimeout(existing)

  button.dataset.state = copied ? 'copied' : 'failed'
  button.innerHTML = copied ? CHECK_ICON : FAIL_ICON
  button.title = copied ? '已复制' : '复制失败'
  button.setAttribute('aria-label', copied ? '代码已复制' : '复制失败')

  const timer = window.setTimeout(() => {
    delete button.dataset.state
    button.innerHTML = COPY_ICON
    button.title = '复制代码'
    button.setAttribute('aria-label', '复制代码')
    resetTimers.delete(button)
  }, RESET_DELAY_MS)
  resetTimers.set(button, timer)
}
