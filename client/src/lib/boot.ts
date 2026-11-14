const BOOT_RESOURCE_TIMEOUT = 15_000

function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, timeout)
    void promise.finally(() => {
      window.clearTimeout(timer)
      resolve()
    })
  })
}

function whenWindowLoaded(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true })
  })
}

async function waitForFonts(): Promise<void> {
  const fontSet = document.fonts
  if (!fontSet) return

  if (document.documentElement.dataset.font !== 'system') {
    await Promise.allSettled([
      fontSet.load('16px "ESRS WenKai"', '饿师傅的技术札记'),
      fontSet.load('16px "ESRS Maple Mono"', 'ESRS // TECH NOTES'),
    ])
  }

  await fontSet.ready.catch(() => undefined)
}

function waitForEagerImages(): Promise<void> {
  const images = Array.from(document.images).filter(
    (image) => image.loading !== 'lazy' && !image.complete,
  )
  if (images.length === 0) return Promise.resolve()

  return Promise.allSettled(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  ).then(() => undefined)
}

/**
 * Wait for the initial document, web fonts and eager images.
 *
 * The timeout is a safety net for offline/blocked external assets: the app
 * must still become usable even when a font or image never resolves.
 */
export async function waitForBootResources(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const resources = Promise.allSettled([whenWindowLoaded(), waitForFonts(), waitForEagerImages()])
  await withTimeout(resources, BOOT_RESOURCE_TIMEOUT)
}
