// =======================================================
// 【第四阶段：Mock 路线 GeoJSON 数据】
// 🔴 TODO: 后续替换为后端 Flask 接口返回的真实 GeoJSON
// 路线：春熙路 → 宽窄巷子（GCJ-02 坐标，对齐高德底图）
// =======================================================

/**
 * 纯步行路线
 * 模拟：沿蜀都大道向西 → 长顺街向北 → 宽窄巷子
 * 距离约 3.2km，预估耗时约 40 分钟（步行速度 80m/min）
 */
export const mockWalkRoute = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.077774, 30.655544], // 春熙路起点
          [104.0745, 30.6568],
          [104.0712, 30.6572],
          [104.0680, 30.6581],
          [104.0650, 30.6595],
          [104.0620, 30.6610],
          [104.0592, 30.6625],
          [104.0568, 30.6635],
          [104.053307, 30.663869]  // 宽窄巷子终点
        ]
      },
      properties: {
        mode: 'walk',
        distance: 3180,         // 米
        duration: 40,            // 分钟
        transitCount: 0          // 换乘次数
      }
    }
  ]
}

/**
 * 地铁+步行路线
 * 模拟：春熙路步行到地铁2号线入口 → 地铁到人民公园 → 步行到宽窄巷子
 * 距离约 2.8km（其中步行 1.6km，地铁 1.2km），预估耗时约 25 分钟
 */
export const mockMetroRoute = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.077774, 30.655544], // 春熙路起点（步行）
          [104.0755, 30.6568],
          [104.0738, 30.6578],      // 春熙路地铁2号线入口
          [104.0700, 30.6590],      // ↓ 地铁隧道段（虚线）
          [104.0660, 30.6595],
          [104.0620, 30.6598],
          [104.0580, 30.6600],      // 人民公园地铁站出口 ↑
          [104.0558, 30.6618],      // ↓ 步行段
          [104.0542, 30.6630],
          [104.053307, 30.663869]   // 宽窄巷子终点
        ]
      },
      properties: {
        mode: 'metro',
        distance: 2750,
        duration: 25,
        transitCount: 1
      }
    }
  ]
}

/**
 * 根据出行模式获取 Mock 路线
 * 🔴 TODO: 后续替换为 axios 请求后端接口
 * @param {'walk' | 'metro'} mode
 * @param {Array} start [lon, lat] 起点坐标
 * @param {Array} end [lon, lat] 终点坐标
 * @returns {Object} GeoJSON FeatureCollection
 */
export function getMockRouteByMode(mode, start, end) {
  if (mode === 'metro') return mockMetroRoute
  return mockWalkRoute
}
/**
 * 【第六阶段】根据 POI 坐标数组生成 Mock 串联路线 GeoJSON
 * 用于：日程拖拽排序后 → 自动重绘当天路线
 * 算法：直线串联 + 每两点之间加 2~3 个随机拐点（让折线"像条路"）
 * 🔴 TODO: 后续替换为后端 Dijkstra/A* 接口返回的真实路线
 * @param {Array<[number, number]>} poiCoords 景点坐标数组 [[lon, lat], ...]
 * @param {string} mode 'walk' | 'metro'
 * @returns {Object} GeoJSON FeatureCollection
 */
export function generateMockMultiPoiRoute(poiCoords, mode = 'walk') {
  if (!poiCoords || poiCoords.length < 2) return null

  // 生成带拐点的折线
  const fullCoords = []
  for (let i = 0; i < poiCoords.length - 1; i++) {
    const from = poiCoords[i]
    const to = poiCoords[i + 1]
    fullCoords.push(from)

    // 在 from → to 之间加 2 个随机拐点（让线不是直的）
    const midLon = (from[0] + to[0]) / 2
    const midLat = (from[1] + to[1]) / 2
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const offset = 0.003  // 约 300 米偏移

    // 拐点1
    const k1Lon = midLon + (Math.random() - 0.5) * offset + dx * 0.25
    const k1Lat = midLat + (Math.random() - 0.5) * offset + dy * 0.25
    fullCoords.push([k1Lon, k1Lat])

    // 拐点2
    const k2Lon = midLon + (Math.random() - 0.5) * offset + dx * 0.75
    const k2Lat = midLat + (Math.random() - 0.5) * offset + dy * 0.75
    fullCoords.push([k2Lon, k2Lat])
  }
  fullCoords.push(poiCoords[poiCoords.length - 1])

  // 计算总距离（简化版：直线距离累加 + 20% 道路弯曲系数）
  let totalDist = 0
  for (let i = 0; i < poiCoords.length - 1; i++) {
    const [lon1, lat1] = poiCoords[i]
    const [lon2, lat2] = poiCoords[i + 1]
    const dLon = (lon2 - lon1) * 85000  // 成都纬度每度约 85km
    const dLat = (lat2 - lat1) * 111000 // 纬度每度约 111km
    totalDist += Math.sqrt(dLon * dLon + dLat * dLat)
  }
  totalDist = Math.round(totalDist * 1.2)  // 加 20% 道路弯曲

  // 预估耗时（步行 80m/min，地铁混合 120m/min）
  const speed = mode === 'metro' ? 120 : 80
  const duration = Math.round(totalDist / speed)

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: fullCoords },
      properties: {
        mode,
        distance: totalDist,
        duration,
        transitCount: mode === 'metro' ? Math.max(1, Math.floor(poiCoords.length / 2)) : 0
      }
    }]
  }
}