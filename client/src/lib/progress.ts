import { reactive } from 'vue'

export const routeProgress = reactive({
  visible: false,
  value: 0,
})

let tickTimer: number | undefined
let hideTimer: number | undefined

function clearTimers(): void {
  if (tickTimer !== undefined) window.clearInterval(tickTimer)
  if (hideTimer !== undefined) window.clearTimeout(hideTimer)
  tickTimer = undefined
  hideTimer = undefined
}

export function beginProgress(): void {
  if (typeof window === 'undefined') return
  clearTimers()
  routeProgress.visible = true
  routeProgress.value = 8
  tickTimer = window.setInterval(() => {
    const remaining = 86 - routeProgress.value
    routeProgress.value = Math.min(86, routeProgress.value + Math.max(0.8, remaining * 0.08))
  }, 160)
}

export function completeProgress(): void {
  if (typeof window === 'undefined') return
  if (!routeProgress.visible) return
  if (tickTimer !== undefined) window.clearInterval(tickTimer)
  tickTimer = undefined
  routeProgress.value = 100
  hideTimer = window.setTimeout(() => {
    routeProgress.visible = false
    routeProgress.value = 0
  }, 280)
}

export function failProgress(): void {
  completeProgress()
}
