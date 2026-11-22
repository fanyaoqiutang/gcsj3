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
 * @param {{ name: string, lon: number, lat: number } | Array<number>} startPoi 起点 POI 对象（兼容旧纯坐标数组）
 * @param {{ name: string, lon: number, lat: number } | Array<number>} endPoi   终点 POI 对象（兼容旧纯坐标数组）
 * @param {'walk'|'metro'} mode
 * @param {string} blockedSegmentId 可选封闭道路ID
 * @returns {{ schemeList: Array }} 后端约定的返回格式
 */
export function buildMockSchemeList(startPoi, endPoi, mode = 'walk', blockedSegmentId = null) {
  const isDetour = !!blockedSegmentId

  // 🔴 统一提取坐标数组（兼容 POI 对象和旧的纯坐标数组）
  const toCoord = (p) => p?.lon != null ? [p.lon, p.lat] : p
  const startCoord = toCoord(startPoi)
  const endCoord   = toCoord(endPoi)
  // 🔴 提取真实名称（兜底「起点」「终点」）
  const startName  = startPoi?.name || '起点'
  const endName    = endPoi?.name   || '终点'

  // 🔴 Helper：构造完整方案对象（复用新 buildRouteGeoJson）
  const makeScheme = (schemeId, schemeName, routeCfg, transferCount, spotList) => {
    const r = buildRouteGeoJson(startCoord, endCoord, routeCfg)
    // 锚点：按 spotList 的起终点在 pathPoints 里找最近索引，切成 2~4 段
    const findIdx = (p) => {
      let best = 0, bd = Infinity
      r.pathPoints.forEach((c, i) => {
        const d = (c[0]-p.lon)**2 + (c[1]-p.lat)**2
        if (d < bd) { bd = d; best = i }
      })
      return best
    }
    const anchors = spotList.map(s => ({ spot: s, idx: findIdx(s) }))
    // 切分：spotList 里相邻 anchor 形成一段
    const segAnchors = []
    for (let i = 0; i < anchors.length - 1; i++) {
      segAnchors.push({
        fromLabel: anchors[i].spot.name,
        toLabel:   anchors[i+1].spot.name,
        startIdx:  anchors[i].idx,
        endIdx:    anchors[i+1].idx
      })
    }
    const segments = buildSegments(r.pathPoints, segAnchors, routeCfg.isMetro)
    return {
      schemeId, schemeName,
      totalDistance:    fmtDistance(r.totalDistanceM),
      totalDistanceM:   r.totalDistanceM,
      totalTravelTime:  `${r.totalDurationMin}分钟`,
      totalDurationMin: r.totalDurationMin,
      transferCount,
      spotList,
      routeGeoJson: r.geoJson,
      pathPoints:   r.pathPoints,
      segments,
      algorithmName: routeCfg.isMetro ? 'Dijkstra' : 'A*',
      backendCalcMs: 200 + Math.floor(r.totalDistanceM / 10),
      expandNodeCount: 3000 + Math.floor(r.totalDistanceM / 5)
    }
  }

  // 方案 A：步行 / Dijkstra（基准）
  const schemeA = makeScheme('scheme-A', '方案A',
    { isMetro: false, isDetour, goSouth: false }, 0,
    [
      { spotId: 'start', name: startName, lon: startCoord[0], lat: startCoord[1], stayMinutes: 0 },
      { spotId: 'poi_005', name: '春熙路商圈', lon: 104.077774, lat: 30.655544, stayMinutes: 10 },
      { spotId: 'end', name: endName, lon: endCoord[0], lat: endCoord[1], stayMinutes: 0 }
    ]
  )

  // 方案 B：步行 / A*（绕武侯祠方向，goSouth）
  const schemeB = makeScheme('scheme-B', '方案B',
    { isMetro: false, isDetour, goSouth: true }, 0,
    [
      { spotId: 'start', name: startName, lon: startCoord[0], lat: startCoord[1], stayMinutes: 0 },
      { spotId: 'poi_003', name: '武侯祠', lon: 104.047992, lat: 30.646168, stayMinutes: 20 },
      { spotId: 'end', name: endName, lon: endCoord[0], lat: endCoord[1], stayMinutes: 0 }
    ]
  )

  // 方案 C（地铁模式专属）
  let schemes = [schemeA, schemeB]
  if (mode === 'metro') {
    const schemeC_A = makeScheme('scheme-A', '方案A（地铁+步行）',
      { isMetro: true, isDetour }, 1,
      [
        { spotId: 'start', name: startName, lon: startCoord[0], lat: startCoord[1], stayMinutes: 0 },
        { spotId: 'metro_entry', name: '春熙路地铁站', lon: 104.0738, lat: 30.6578, stayMinutes: 0 },
        { spotId: 'metro_exit', name: '人民公园地铁站', lon: 104.0580, lat: 30.6600, stayMinutes: 0 },
        { spotId: 'end', name: endName, lon: endCoord[0], lat: endCoord[1], stayMinutes: 0 }
      ]
    )
    const schemeC_B = makeScheme('scheme-B', '方案B（纯步行，不走地铁）',
      { isMetro: false, isDetour, goSouth: true }, 0,
      schemeB.spotList
    )
    schemes = [schemeC_A, schemeC_B]
  }

  return { schemeList: schemes }
}

/**
 * Haversine 球面距离（米）
 */
function haversineM(c1, c2) {
  if (!c1 || !c2) return 0
  const [lon1, lat1] = c1, [lon2, lat2] = c2
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** 累加多段节点的球面距离（路网距离近似，比直线更接近真实值） */
function totalPathDistanceM(coords) {
  let d = 0
  for (let i = 0; i < coords.length - 1; i++) d += haversineM(coords[i], coords[i+1])
  return d
}

/** 格式化米为 km/m */
function fmtDistance(m) {
  if (m == null) return '—'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

/**
 * 生成路网感知的密集路径节点
 * 每个出行模式/绕行策略返回 12~18 个节点，沿成都真实主干道走向
 */
function buildPathNodes(start, end, { isMetro = false, isDetour = false, goSouth = false, goEast = false } = {}) {
  const [sLon, sLat] = start, [eLon, eLat] = end
  const nodes = []

  // 方向参考：蜀都大道（东西向）、一环路（环向）、人民南路（南北向）
  // 所有中间节点沿真实道路偏移，避免球面直线
  if (isMetro) {
    // 地铁：模拟线路（隧道，沿地铁 4 号线 / 1 号线走向）
    nodes.push(
      [sLon, sLat],
      [sLon - 0.002, sLat + 0.0005],
      [sLon - 0.005, sLat + 0.001],
      [sLon - 0.008, sLat + 0.0015],
      [sLon - 0.011, sLat + 0.002],
      [sLon - 0.014, sLat + 0.002],
      [sLon - 0.017, sLat + 0.0015],
      [sLon - 0.020, sLat + 0.001],
      [sLon - 0.023, sLat],
      [sLon - 0.020, sLat - 0.0005],
      [sLon - 0.015, sLat - 0.001],
      [sLon - 0.010, sLat - 0.001],
      [sLon - 0.005, sLat - 0.0005],
      [eLon, eLat]
    )
  } else if (isDetour) {
    // 封闭绕行：先绕南二环再回（模拟封闭主干道后走平行支路）
    nodes.push(
      [sLon, sLat],
      [sLon + 0.002, sLat - 0.002],
      [sLon + 0.004, sLat - 0.005],
      [sLon + 0.002, sLat - 0.008],
      [sLon - 0.002, sLat - 0.010],
      [sLon - 0.006, sLat - 0.008],
      [sLon - 0.010, sLat - 0.005],
      [sLon - 0.012, sLat - 0.002],
      [sLon - 0.013, sLat + 0.001],
      [sLon - 0.012, sLat + 0.004],
      [sLon - 0.010, sLat + 0.006],
      [sLon - 0.007, sLat + 0.007],
      [sLon - 0.004, sLat + 0.006],
      [sLon - 0.001, sLat + 0.004],
      [eLon, eLat]
    )
  } else if (goSouth) {
    // 方案B：绕行武侯祠方向（沿人民南路+一环路南一段）
    nodes.push(
      [sLon, sLat],
      [sLon - 0.001, sLat - 0.002],
      [sLon - 0.003, sLat - 0.004],
      [sLon - 0.005, sLat - 0.006],
      [sLon - 0.007, sLat - 0.008],
      [sLon - 0.008, sLat - 0.007],
      [sLon - 0.009, sLat - 0.005],
      [sLon - 0.010, sLat - 0.003],
      [sLon - 0.011, sLat - 0.001],
      [sLon - 0.010, sLat + 0.001],
      [sLon - 0.008, sLat + 0.002],
      [sLon - 0.006, sLat + 0.002],
      [sLon - 0.004, sLat + 0.001],
      [sLon - 0.002, sLat],
      [eLon, eLat]
    )
  } else if (goEast) {
    // 向东绕行（春熙路→太古里方向）
    nodes.push(
      [sLon, sLat],
      [sLon + 0.002, sLat + 0.0005],
      [sLon + 0.005, sLat + 0.001],
      [sLon + 0.008, sLat + 0.0005],
      [sLon + 0.010, sLat - 0.001],
      [sLon + 0.008, sLat - 0.003],
      [sLon + 0.005, sLat - 0.004],
      [sLon + 0.002, sLat - 0.003],
      [sLon, sLat - 0.001],
      [eLon, eLat]
    )
  } else {
    // 步行方案A：沿蜀都大道向西（模拟主干道斑马线+人行道）
    nodes.push(
      [sLon, sLat],
      [sLon - 0.002, sLat + 0.0005],
      [sLon - 0.004, sLat + 0.001],
      [sLon - 0.006, sLat + 0.0015],
      [sLon - 0.008, sLat + 0.002],
      [sLon - 0.010, sLat + 0.0025],
      [sLon - 0.012, sLat + 0.002],
      [sLon - 0.014, sLat + 0.0015],
      [sLon - 0.012, sLat + 0.001],
      [sLon - 0.009, sLat + 0.0005],
      [sLon - 0.006, sLat],
      [sLon - 0.003, sLat - 0.0005],
      [eLon, eLat]
    )
  }

  // 修正首末点严格对齐 start/end（防止偏移造成起终点 marker 与路线脱钩）
  nodes[0] = [sLon, sLat]
  nodes[nodes.length - 1] = [eLon, eLat]
  return nodes
}

/**
 * 生成 GeoJSON LineString + 配套路网数据（pathPoints / segments / 距离时长）
 * @returns {
 *   geoJson: FeatureCollection,      // 原格式，向后兼容
 *   pathPoints: Array<[lon,lat]>,   // 纯坐标数组，供路线渲染
 *   totalDistanceM: number,         // 路网总距离（米）
 *   totalDurationMin: number,       // 预估总时长（分钟）
 * }
 */
function buildRouteGeoJson(start, end, opts = {}) {
  // 兼容旧签名：isMetro=bool / isDetour=bool / goSouth=bool
  const conf = typeof opts === 'object' ? opts : {
    isMetro: arguments[2] ?? false,
    isDetour: arguments[3] ?? false,
    goSouth:  arguments[4] ?? false
  }
  const { isMetro = false, isDetour = false, goSouth = false, goEast = false } = conf

  const pathPoints = buildPathNodes(start, end, { isMetro, isDetour, goSouth, goEast })
  const totalDistanceM = totalPathDistanceM(pathPoints)
  // 平均速度：地铁 45km/h，步行 4.5km/h
  const speedMpm = isMetro ? 45000 / 60 : (isDetour ? 4200 / 60 : 4500 / 60)
  const totalDurationMin = Math.round(totalDistanceM / speedMpm)

  const geoJson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: pathPoints },
      properties: { isMetro, isDetour }
    }]
  }

  return {
    geoJson,
    pathPoints,
    totalDistanceM,
    totalDurationMin
  }
}

/**
 * 把 pathPoints 按 anchorIdx 切分成 segments（带 distanceM/durationMin）
 * @param {Array<[lon,lat]>} pathPoints
 * @param {Array<{fromLabel, toLabel, startIdx, endIdx}>} anchors 调用方指定的子段锚点
 * @param {boolean} isMetro
 */
function buildSegments(pathPoints, anchors, isMetro = false) {
  const speedMpm = isMetro ? 45000 / 60 : 4500 / 60
  return anchors.map((a, idx) => {
    const segCoords = pathPoints.slice(a.startIdx, a.endIdx + 1)
    const distanceM = totalPathDistanceM(segCoords)
    return {
      idx,
      coords: segCoords,
      fromLabel: a.fromLabel,
      toLabel:   a.toLabel,
      distanceM,
      durationMin: Math.max(1, Math.round(distanceM / speedMpm)),
      distanceKm: fmtDistance(distanceM),
    }
  })
}

/**
 * 生成多点游览的方案列表
 * @param {Array<[number,number]>} poiCoords 景点坐标数组
 * @param {'walk'|'metro'} mode
 * @param {boolean} preservedOrder 是否保持用户手动排序
 * @param {Array<{id:string,name:string,lon:number,lat:number,stayMinutes?:number}>} poiFullList
 *   完整 POI 列表（含 name）。mock 通过坐标匹配 poiCoords[i] 和 poiFullList 里的 POI，
 *   取真实名称填入 spotList，兜底才用 `景点${i+1}`。
 * @returns {{ schemeList: Array }}
 */
export function buildMockMultiPoiSchemeList(poiCoords, mode = 'walk', preservedOrder = false, poiFullList = []) {
  if (!poiCoords || poiCoords.length < 2) return { schemeList: [] }

  /** 用坐标匹配真实 POI 名称（容差 0.000001°，避免浮点误差） */
  const findPoiName = (coord) => {
    const [lon, lat] = coord
    const hit = poiFullList.find(p => Math.abs(p.lon - lon) < 1e-6 && Math.abs(p.lat - lat) < 1e-6)
    return hit?.name || hit?.poiName || hit?.scenicName || hit?.title
  }

  // 🔴 用 poiFullList 里的真实名称，兜底才用 `景点${i+1}`
  const spotList = poiCoords.map((c, i) => {
    const realName = findPoiName(c) || `景点${i + 1}`
    const fullMatch = poiFullList.find(p => Math.abs(p.lon - c[0]) < 1e-6 && Math.abs(p.lat - c[1]) < 1e-6)
    return {
      spotId: fullMatch?.id || `poi_${i}`,
      name: realName,
      lon: c[0], lat: c[1],
      stayMinutes: fullMatch?.stayMinutes ?? fullMatch?.stayDuration ?? 30,
      description: fullMatch?.description || fullMatch?.desc || fullMatch?.intro || ''
    }
  })

  // 🔴 多景点路径：每两个相邻 POI 之间用 buildRouteGeoJson 生成密集路网节点，再拼接
  const isMetro = mode === 'metro'
  let pathPoints = []
  const segAnchors = []
  for (let i = 0; i < poiCoords.length - 1; i++) {
    const subPath = buildRouteGeoJson(poiCoords[i], poiCoords[i+1], { isMetro, goSouth: i % 2 === 1, goEast: i % 3 === 1 })
    // 首段保留完整，后续段去掉首点（已在上一段末尾出现）
    const segCoords = i === 0 ? subPath.pathPoints : subPath.pathPoints.slice(1)
    const prevLen = pathPoints.length
    pathPoints = pathPoints.concat(segCoords)
    // 锚点：起点=上一锚终点，终点=当前段末点
    const startIdx = i === 0 ? 0 : prevLen
    const endIdx   = pathPoints.length - 1
    segAnchors.push({
      fromLabel: spotList[i].name,
      toLabel:   spotList[i+1].name,
      startIdx,
      endIdx
    })
  }
  // 修正首末点严格对齐
  pathPoints[0] = [spotList[0].lon, spotList[0].lat]
  pathPoints[pathPoints.length - 1] = [spotList[spotList.length - 1].lon, spotList[spotList.length - 1].lat]

  const totalDistanceM = totalPathDistanceM(pathPoints)
  const speedMpm = isMetro ? 45000 / 60 : 4500 / 60
  const totalDurationMin = Math.round(totalDistanceM / speedMpm)
  const segments = buildSegments(pathPoints, segAnchors, isMetro)
  const geoJson = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: pathPoints }, properties: { isMetro } }]
  }

  // 手动排序 & 方案A/B 都用同一套路网 pathPoints（方案B 稍长 15% 体现不同算法）
  const makeMultiScheme = (schemeId, schemeName, isVariant = false) => {
    const variantScale = isVariant ? 1.15 : 1.0
    const d = Math.round(totalDistanceM * variantScale)
    const dur = Math.round(totalDurationMin * variantScale)
    return {
      schemeId, schemeName,
      totalDistance:    fmtDistance(d),
      totalDistanceM:   d,
      totalTravelTime:  `${dur}分钟`,
      totalDurationMin: dur,
      transferCount: isMetro ? Math.max(1, Math.floor(poiCoords.length / 2)) : 0,
      spotList,
      routeGeoJson: geoJson,
      pathPoints,
      segments,
      algorithmName: preservedOrder ? 'UserManual' : (isVariant ? 'A*' : 'Dijkstra'),
      backendCalcMs: 200 + Math.floor(d / 20),
      expandNodeCount: 3000 + Math.floor(d / 10)
    }
  }

  if (preservedOrder) {
    return { schemeList: [makeMultiScheme('scheme-A', '按自定义顺序')] }
  }

  if (isMetro) {
    return {
      schemeList: [
        makeMultiScheme('scheme-A', '方案A（地铁+步行）'),
        makeMultiScheme('scheme-B', '方案B（纯步行，不走地铁）', true)
      ]
    }
  }
  return {
    schemeList: [
      makeMultiScheme('scheme-A', '方案A（推荐）'),
      makeMultiScheme('scheme-B', '方案B（绕行更多景点）', true)
    ]
  }
}