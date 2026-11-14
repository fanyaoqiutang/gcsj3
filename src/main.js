import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style/theme.css'   // 🔶 全局视觉主题

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')