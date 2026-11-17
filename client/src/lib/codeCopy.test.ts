import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyCodeText, decorateCodeBlocks, handleCodeCopyClick } from './codeCopy'

function makeRoot(): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = '<pre class="hljs"><code>const answer = 42</code></pre>'
  document.body.appendChild(root)
  return root
}

describe('code block copy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('wraps each pre once and keeps the button outside the scroll container', () => {
    const root = makeRoot()
    decorateCodeBlocks(root)
    decorateCodeBlocks(root)

    const block = root.querySelector('.code-block')
    expect(block).not.toBeNull()
    expect(block?.querySelector('pre')).not.toBeNull()
    expect(block?.querySelector('.code-copy')).not.toBeNull()
    expect(block?.querySelector('pre .code-copy')).toBeNull()
    expect(root.querySelectorAll('.code-copy')).toHaveLength(1)
  })

  it('copies the code text and restores the button after one second', async () => {
    const root = makeRoot()
    decorateCodeBlocks(root)
    const button = root.querySelector<HTMLButtonElement>('.code-copy')
    if (!button) throw new Error('copy button missing')

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    button.dispatchEvent(event)
    await handleCodeCopyClick(event, root)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const answer = 42')
    expect(button.textContent).toBe('✔')
    expect(button.dataset.state).toBe('copied')

    vi.advanceTimersByTime(1000)
    expect(button.textContent).toBe('复制')
    expect(button.dataset.state).toBeUndefined()
  })

  it('falls back to a textarea when the clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

    await expect(copyCodeText('fallback text')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })
})
