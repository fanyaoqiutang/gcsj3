// =======================================================
// 【第一阶段核心：最小化Vue3入口】
// 约束：只做Vue实例挂载，不导入任何地图/工具/接口
// =======================================================

import { createApp } from 'vue'
import App from './App.vue'
import { DEBUG_MODE } from '@/constants/config'

// 创建Vue实例并挂载
const app = createApp(App)

// 可选：挂载DEBUG_MODE到Vue全局属性，方便后续组件用this.$DEBUG_MODE调用（Options API）
// 或用getCurrentInstance().appContext.config.globalProperties.$DEBUG_MODE（Composition API）
app.config.globalProperties.$DEBUG_MODE = DEBUG_MODE

// 【后续扩展位置】
// - 导入Pinia store：import { createPinia } from 'pinia'; app.use(createPinia())
// - 导入全局样式：import './assets/main.css'
// - 导入axios全局拦截器：import './utils/request'
// - 导入OpenLayers地图初始化逻辑（子模块1）
// - 挂载调试面板根组件（子模块2）

app.mount('#app')