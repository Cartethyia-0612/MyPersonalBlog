;(function () {
  try {
    var stored = localStorage.getItem('eshi-theme')
    var mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    var resolved = mode === 'system' ? (dark ? 'dark' : 'light') : mode
    document.documentElement.dataset.theme = resolved
    document.documentElement.dataset.themeMode = mode
    var font = localStorage.getItem('eshi-font')
    document.documentElement.dataset.font = font === 'system' ? 'system' : 'site'
    var blur = parseInt(localStorage.getItem('eshi-blur'), 10)
    if (!(blur >= 0 && blur <= 5)) blur = 3
    var blurFactors = [0, 0.3, 0.55, 1, 1.3, 1.6]
    document.documentElement.dataset.blur = String(blur)
    document.documentElement.style.setProperty('--blur-factor', String(blurFactors[blur]))
    document.documentElement.style.colorScheme = resolved
  } catch (error) {
    document.documentElement.dataset.theme = 'light'
  }
})()
