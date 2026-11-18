// =======================================================
// 【Mock schemeList · 严格对齐后端接口契约】
// 接口文档：src/api/route.js 注释里的返回结构
// 每个 scheme 包含两套字段集合：
//   ① 普通业务字段 —— 所有页面可见
//   ② 算法内部性能字段 —— 仅 DevPerformancePage 渲染
//
// 🔴 TODO: 后续替换为后端真实返回
// =======================================================

/**
 * 生成单点规划的方案列表（2~3 套方案，模拟不同算法/出行模式）
 * @param {Array} start [lon, lat]
 * @param {Array} end   [lon, lat]
 * @param {'walk'|'metro'} mode
 * @param {string} blockedSegmentId 可选封闭道路ID
 * @returns {{ schemeList: Array }} 后端约定的返回格式
 */
export function buildMockSchemeList(start, end, mode = 'walk', blockedSegmentId = null) {
  const isDetour = !!blockedSegmentId

  // 方案 A：步行 / Dijkstra（基准）
  const schemeA = {
    schemeId: 'scheme-A',
    schemeName: '方案A',
    totalDistance: isDetour ? '4.1km' : '3.2km',
    totalTravelTime: isDetour ? '55分钟' : '42分钟',
    transferCount: 0,
    spotList: [
      { spotId: 'start', name: '起点', lon: start[0], lat: start[1], stayMinutes: 0 },
      { spotId: 'poi_005', name: '春熙路商圈', lon: 104.077774, lat: 30.655544, stayMinutes: 10 },
      { spotId: 'poi_001', name: '宽窄巷子', lon: end[0], lat: end[1], stayMinutes: 0 }
    ],
    routeGeoJson: buildRouteGeoJson(start, end, mode === 'metro', isDetour),
    // 🔽 算法性能字段（仅开发者页面可见）
    algorithmName: 'Dijkstra',
    backendCalcMs: isDetour ? 356 : 289,
    expandNodeCount: isDetour ? 5210 : 4782
  }

  // 方案 B：步行 / A*（启发式，通常更快）
  const schemeB = {
    schemeId: 'scheme-B',
    schemeName: '方案B',
    totalDistance: isDetour ? '4.5km' : '3.8km',
    totalTravelTime: isDetour ? '62分钟' : '51分钟',
    transferCount: 0,
    spotList: [
      { spotId: 'start', name: '起点', lon: start[0], lat: start[1], stayMinutes: 0 },
      { spotId: 'poi_003', name: '武侯祠', lon: 104.047992, lat: 30.646168, stayMinutes: 20 },
      { spotId: 'poi_001', name: '宽窄巷子', lon: end[0], lat: end[1], stayMinutes: 0 }
    ],
    routeGeoJson: buildRouteGeoJson(start, end, false, isDetour, true),
    // 🔽 算法性能字段
    algorithmName: 'A*',
    backendCalcMs: isDetour ? 182 : 126,
    expandNodeCount: isDetour ? 2890 : 2136
  }

  // 方案 C（地铁模式专属）
  let schemes = [schemeA, schemeB]
  if (mode === 'metro') {
    schemes = [
      {
        schemeId: 'scheme-A',
        schemeName: '方案A（地铁+步行）',
        totalDistance: isDetour ? '3.1km' : '2.8km',
        totalTravelTime: isDetour ? '35分钟' : '25分钟',
        transferCount: 1,
        spotList: [
          { spotId: 'start', name: '起点', lon: start[0], lat: start[1], stayMinutes: 0 },
          { spotId: 'metro_entry', name: '春熙路地铁站', lon: 104.0738, lat: 30.6578, stayMinutes: 0 },
          { spotId: 'metro_exit', name: '人民公园地铁站', lon: 104.0580, lat: 30.6600, stayMinutes: 0 },
          { spotId: 'poi_001', name: '宽窄巷子', lon: end[0], lat: end[1], stayMinutes: 0 }
        ],
        routeGeoJson: buildRouteGeoJson(start, end, true, isDetour),
        algorithmName: 'A*',
        backendCalcMs: isDetour ? 198 : 145,
        expandNodeCount: isDetour ? 3100 : 2290
      },
      {
        schemeId: 'scheme-B',
        schemeName: '方案B（纯步行，不走地铁）',
        totalDistance: isDetour ? '4.5km' : '3.8km',
        totalTravelTime: isDetour ? '62分钟' : '51分钟',
        transferCount: 0,
        spotList: schemeB.spotList,
        routeGeoJson: schemeB.routeGeoJson,
        algorithmName: 'Dijkstra',
        backendCalcMs: isDetour ? 389 : 312,
        expandNodeCount: isDetour ? 5580 : 5020
      }
    ]
  }

  return { schemeList: schemes }
}

/**
 * 生成 GeoJSON LineString（带拐点让路线"像条路"）
 */
function buildRouteGeoJson(start, end, isMetro = false, isDetour = false, goSouth = false) {
  const coords = []
  const [sLon, sLat] = start
  const [eLon, eLat] = end

  coords.push([sLon, sLat])

  if (isDetour) {
    // 封闭绕行：先反方向走再绕回来
    coords.push([sLon + 0.003, sLat - 0.004])
    coords.push([sLon + 0.001, sLat - 0.008])
    coords.push([sLon - 0.005, sLat - 0.006])
    coords.push([sLon - 0.008, sLat - 0.002])
  } else if (goSouth) {
    // 方案B：绕行武侯祠方向
    coords.push([sLon - 0.003, sLat - 0.004])
    coords.push([sLon - 0.007, sLat - 0.008])
    coords.push([sLon - 0.010, sLat - 0.005])
  } else if (isMetro) {
    // 地铁：中间段直线（模拟隧道）
    coords.push([sLon - 0.004, sLat + 0.001])
    coords.push([sLon - 0.012, sLat + 0.002])
  } else {
    // 步行方案A：沿蜀都大道向西
    coords.push([sLon - 0.003, sLat + 0.001])
    coords.push([sLon - 0.007, sLat + 0.002])
    coords.push([sLon - 0.010, sLat + 0.003])
  }

  coords.push([eLon, eLat])

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { isMetro, isDetour }
    }]
  }
}

/**
 * 生成多点游览的方案列表
 * @param {Array<[number,number]>} poiCoords 景点坐标数组
 * @param {'walk'|'metro'} mode
 * @returns {{ schemeList: Array }}
 */
export function buildMockMultiPoiSchemeList(poiCoords, mode = 'walk') {
  if (!poiCoords || poiCoords.length < 2) return { schemeList: [] }

  const fullCoords = []
  for (let i = 0; i < poiCoords.length - 1; i++) {
    const [from, to] = [poiCoords[i], poiCoords[i + 1]]
    fullCoords.push(from)
    fullCoords.push([(from[0] + to[0]) / 2 + (Math.random() - 0.5) * 0.003,
                     (from[1] + to[1]) / 2 + (Math.random() - 0.5) * 0.003])
  }
  fullCoords.push(poiCoords[poiCoords.length - 1])

  const distance = (poiCoords.length * 1.5).toFixed(1) + 'km'
  const time = Math.round(poiCoords.length * 12 + 20) + '分钟'

  return {
    schemeList: [
      {
        schemeId: 'scheme-A',
        schemeName: '方案A（推荐）',
        totalDistance: distance,
        totalTravelTime: time,
        transferCount: mode === 'metro' ? Math.max(1, Math.floor(poiCoords.length / 2)) : 0,
        spotList: poiCoords.map((c, i) => ({ spotId: `poi_${i}`, name: `景点${i + 1}`, lon: c[0], lat: c[1], stayMinutes: 30 })),
        routeGeoJson: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: fullCoords }, properties: {} }]
        },
        algorithmName: 'A*',
        backendCalcMs: 180 + poiCoords.length * 20,
        expandNodeCount: 1500 + poiCoords.length * 300
      },
      {
        schemeId: 'scheme-B',
        schemeName: '方案B',
        totalDistance: (parseFloat(distance) * 1.2).toFixed(1) + 'km',
        totalTravelTime: Math.round(parseInt(time) * 1.2) + '分钟',
        transferCount: 0,
        spotList: poiCoords.map((c, i) => ({ spotId: `poi_${i}`, name: `景点${i + 1}`, lon: c[0], lat: c[1], stayMinutes: 30 })),
        routeGeoJson: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: fullCoords.slice().reverse() }, properties: {} }]
        },
        algorithmName: 'Dijkstra',
        backendCalcMs: 280 + poiCoords.length * 35,
        expandNodeCount: 3200 + poiCoords.length * 500
      }
    ]
  }
}
