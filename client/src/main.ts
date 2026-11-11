import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'

import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/markdown.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Apply the remembered theme before the first paint of the Vue tree.
useThemeStore(pinia).init()

app.use(router)
app.mount('#app')
