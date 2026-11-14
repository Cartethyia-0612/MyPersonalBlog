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
    document.documentElement.style.colorScheme = resolved
  } catch (error) {
    document.documentElement.dataset.theme = 'light'
  }
})()
