// ========================================================
// 路径规划接口模块
// 契约（和后端对齐）:
//   POST /api/route/plan
//   Request:  { origin:[lon,lat], destination:[lon,lat], mode, algorithm }
//   Response: { geojson, metrics:{distance, duration, transitCount}, segments }
// ========================================================

import { USE_MOCK } from '@/constants/config'
import { http, registerMockHandler } from './index'
import { getMockRouteByMode } from '@/data/mockRoutes'

const API_PLAN = '/api/route/plan'

// 注册 mock handler（USE_MOCK=true 时走这里）
registerMockHandler(API_PLAN, (config) => {
  const body = JSON.parse(config.data || '{}')
  const gj = getMockRouteByMode(body.mode, body.origin, body.destination)
  return {
    geojson: gj,
    metrics: gj.features[0].properties,
    segments: []
  }
})

export const routeApi = {
  /**
   * 规划路径
   * @param {{ origin: number[], destination: number[], mode: string, algorithm: string }} params
   * @returns {Promise<{geojson: any, metrics: any, segments: any[]}>}
   */
  async planRoute(params) {
    if (USE_MOCK) {
      // mock 模式：直接走 handler（已注册）
      const res = await http.post(API_PLAN, params)
      return res.data
    }
    // 真实后端
    const res = await http.post(API_PLAN, params)
    return res.data
  }
}
