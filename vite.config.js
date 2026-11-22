import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// 【核心：@路径别名依赖】Vite官方推荐写法，适配Windows
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 【你要的：@别名 → src目录】
  // 让后续 import { DEBUG_MODE } from '@/constants/config' 生效
  // 替代相对路径 '../../constants/config'
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Flask 算法后端
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      // GeoServer WMS / WFS 代理（绕开浏览器 CORS）
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})