// =======================================================
// 【第十阶段：API 层统一入口】
// 设计原则：
// 1. 所有业务 API 模块从此文件导出，组件统一 import '@/api'
// 2. USE_MOCK=true → 走 mock 数据，false → 走 axios 真实请求
// 3. 接口契约（入参/返回结构）和后端提前对齐，写在每个 api 模块注释里
// 4. 后续联调只改 api 层，页面视图逻辑尽量不动
// =======================================================

import { USE_MOCK } from '@/constants/config'
import axios from 'axios'

// ---------- axios 实例占位（后续配置 baseURL） ----------
// 🔴 TODO: 联调时配置真实后端地址 + 超时 + 拦截器
const http = axios.create({
  baseURL: USE_MOCK ? '' : 'http://localhost:5000',
  timeout: 10000
})

// 请求拦截器（占位）
http.interceptors.request.use(
  config => {
    if (USE_MOCK) {
      // mock 模式：直接在拦截器里拦截返回假数据，不发真实请求
      // 每个业务 api 模块会注册自己的 mock handler
      config.adapter = mockAdapter
    }
    return config
  },
  err => Promise.reject(err)
)

// mock handler 注册表（业务 api 模块通过 registerMockHandler 注册）
const mockHandlers = new Map()
export function registerMockHandler(path, handler) {
  mockHandlers.set(path, handler)
}

// mock adapter：拦截请求，执行注册的 handler
function mockAdapter(config) {
  const handler = mockHandlers.get(config.url)
  if (handler) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ data: handler(config), status: 200, statusText: 'OK' })
      }, 300)  // 模拟网络延迟
    })
  }
  return Promise.reject(new Error(`[MOCK] 未注册 handler: ${config.url}`))
}

// ---------- 导出所有业务 API ----------
export { guideApi } from './guide'
export { routeApi } from './route'
// 后续继续加：
// export { poiApi } from './poi'           // POI 查询（王茜）
// export { itineraryApi } from './itinerary' // 日程保存

// 导出 axios 实例（给需要单独用的地方）
export { http }