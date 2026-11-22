﻿﻿﻿// =======================================================
// 銆愯矾绾胯鍒?API 路 涓ユ牸瀵归綈鍚庣鎺ュ彛濂戠害銆?
// 鍚庣杩斿洖缁撴瀯锛歿 schemeList: [{ 鏂规A }, { 鏂规B }, ...] }
// 姣忎釜鏂规鍖呭惈涓ゅ瀛楁闆嗗悎锛?
//   鈶?鏅€氫笟鍔″瓧娈?鈥斺€?鎵€鏈夐〉闈㈠彲瑙侊紙schemeId/schemeName/totalDistance/totalTravelTime/transferCount/spotList/routeGeoJson锛?
//   鈶?绠楁硶鎬ц兘瀛楁 鈥斺€?浠?DevPerformancePage 娓叉煋锛坅lgorithmName/backendCalcMs/expandNodeCount锛?
//
// 馃敶 鑱旇皟鏃朵粎闇€鎶?USE_MOCK 鍒嗘敮鏇挎崲涓?http.post锛屼笟鍔￠€昏緫闆舵敼鍔?
// =======================================================

import { USE_MOCK } from './index'
import { http } from './index'
import { buildMockSchemeList, buildMockMultiPoiSchemeList } from '@/data/mockSchemeList'

export const routeApi = {
  /**
   * 鍗曠偣涓ょ偣璺嚎瑙勫垝
   * @param {{ origin: [number,number], destination: [number,number], mode: 'walk'|'metro', blockedSegmentId?: string }} params
   * @returns {Promise<{ schemeList: Array }>}
   */
  planRoute(params) {
    if (USE_MOCK) {
      return new Promise(resolve => {
        setTimeout(() => {
          // 🔴 传完整 POI 对象（含 name），不再只传坐标
          resolve(buildMockSchemeList(
            params.startPoi || params.origin,    // 兼容老参数（传纯坐标也行）
            params.endPoi   || params.destination,
            params.mode || 'walk',
            params.blockedSegmentId || null
          ))
        }, 400)
      })
    }
    // 馃敶 鑱旇皟鏃跺惎鐢細return http.post('/api/route/plan', params).then(r => r.data)
  },

  /**
   * 澶氭櫙鐐规父瑙堣鍒?
   * @param {{ poiCoords: Array<[number,number]>, mode: 'walk'|'metro', blockedSegmentId?: string, preservedOrder?: boolean }} params
   *   preservedOrder=true 鎺ユ敹鐢ㄦ埛鎵嬪姟鎺掍簭锛屼笉鍋氭帰璺垪涓?TSP 鎷呲L
   * @returns {Promise<{ schemeList: Array }>}
   */
  planMultiPoiRoute(params) {
    if (USE_MOCK) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(buildMockMultiPoiSchemeList(
            params.poiCoords,
            params.mode || 'walk',
            params.preservedOrder || false,
            params.poiFullList || []   // 🔴 完整 POI 列表（含 name）
          ))
        }, 500)
      })
    }
    // 馃敶 鑱旇皟鏃跺惎鐢細return http.post('/api/route/multi-poi', params).then(r => r.data)
  }
}