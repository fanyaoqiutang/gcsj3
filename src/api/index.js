// =======================================================
// 【API 层统一入口】
// 设计原则：
// 1. 所有业务 API 模块从此文件导出，组件统一 import '@/api'
// 2. USE_MOCK 切换由各 api 模块内部自行处理，不走 axios 拦截器
// 3. 接口契约（入参/返回结构）和后端提前对齐
// 4. 后续联调只改 api 层，页面视图逻辑尽量不动
// =======================================================

import axios from 'axios'

// ---------- axios 实例占位 ----------
// 🔴 TODO: 联调时配置真实后端地址 + 超时 + 拦截器
export const http = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000
})

// ---------- 导出所有业务 API ----------
export { guideApi } from './guide'
export { routeApi } from './route'
// 后续继续加：
// export { poiApi } from './poi'           // POI 查询（王茜）
// export { itineraryApi } from './itinerary' // 日程保存
