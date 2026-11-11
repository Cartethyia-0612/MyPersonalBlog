import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

let counter = 0
const timers = new Map<number, number>()

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])

  function dismiss(id: number): void {
    items.value = items.value.filter((item) => item.id !== id)
    const timer = timers.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.delete(id)
    }
  }

  function notify(message: string, kind: ToastKind = 'success', duration = 3200): void {
    const id = ++counter
    items.value = [...items.value, { id, message, kind }]
    const timer = window.setTimeout(() => dismiss(id), duration)
    timers.set(id, timer)
  }

  return { items, notify, dismiss }
})
