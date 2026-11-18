// =======================================================
// 【路线规划 API · 严格对齐后端接口契约】
// 后端返回结构：{ schemeList: [{ 方案A }, { 方案B }, ...] }
// 每个方案包含两套字段集合：
//   ① 普通业务字段 —— 所有页面可见（schemeId/schemeName/totalDistance/totalTravelTime/transferCount/spotList/routeGeoJson）
//   ② 算法性能字段 —— 仅 DevPerformancePage 渲染（algorithmName/backendCalcMs/expandNodeCount）
//
// 🔴 联调时仅需把 USE_MOCK 分支替换为 http.post，业务逻辑零改动
// =======================================================

import { USE_MOCK } from '@/constants/config'
import { http } from './index'
import { buildMockSchemeList, buildMockMultiPoiSchemeList } from '@/data/mockSchemeList'

export const routeApi = {
  /**
   * 单点两点路线规划
   * @param {{ origin: [number,number], destination: [number,number], mode: 'walk'|'metro', blockedSegmentId?: string }} params
   * @returns {Promise<{ schemeList: Array }>}
   */
  planRoute(params) {
    if (USE_MOCK) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(buildMockSchemeList(
            params.origin,
            params.destination,
            params.mode || 'walk',
            params.blockedSegmentId || null
          ))
        }, 400)
      })
    }
    // 🔴 联调时启用：return http.post('/api/route/plan', params).then(r => r.data)
  },

  /**
   * 多景点游览规划（TSP 顺序优化）
   * @param {{ poiCoords: Array<[number,number]>, mode: 'walk'|'metro', blockedSegmentId?: string }} params
   * @returns {Promise<{ schemeList: Array }>}
   */
  planMultiPoiRoute(params) {
    if (USE_MOCK) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(buildMockMultiPoiSchemeList(
            params.poiCoords,
            params.mode || 'walk'
          ))
        }, 500)
      })
    }
    // 🔴 联调时启用：return http.post('/api/route/multi-poi', params).then(r => r.data)
  }
}