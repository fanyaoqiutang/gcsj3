// =======================================================
// 【第七阶段：Mock 多方案路线数据】
// 🔴 TODO: 后续替换为后端接口返回的多方案 GeoJSON 数组
// 场景：春熙路(起点) → 宽窄巷子(终点)，3种方案
// =======================================================

/**
 * 生成 Mock 路线 GeoJSON（带拐点的折线）
 */
function makeMockRoute(startLon, startLat, endLon, endLat, midPattern) {
  const coords = [[startLon, startLat]]
  midPattern.forEach(([dx, dy]) => {
    coords.push([startLon + dx, startLat + dy])
  })
  coords.push([endLon, endLat])
  return coords
}

export const mockRouteOptions = [
  {
    optionId: 'opt_1',
    name: '方案A · 纯步行直达',
    description: '沿蜀都大道直行，距离最短',
    mode: 'walk',
    color: '#3498db',        // 蓝色
    metrics: {
      distance: 3180,
      duration: 40,
      transitCount: 0
    },
    coordinates: makeMockRoute(
      104.077774, 30.655544,  // 春熙路
      104.053307, 30.663869,  // 宽窄巷子
      [
        [-0.0035, 0.0012], [-0.0070, 0.0028], [-0.0110, 0.0045],
        [-0.0150, 0.0055], [-0.0190, 0.0072], [-0.0215, 0.0082]
      ]
    )
  },
  {
    optionId: 'opt_2',
    name: '方案B · 地铁优先',
    description: '2号线地铁直达人民公园，最快',
    mode: 'metro',
    color: '#e67e22',        // 橙色
    metrics: {
      distance: 2750,
      duration: 25,
      transitCount: 1
    },
    coordinates: makeMockRoute(
      104.077774, 30.655544,
      104.053307, 30.663869,
      [
        [-0.0022, 0.0018], [-0.0045, 0.0035],   // 步行到地铁站
        [-0.0070, 0.0042], [-0.0100, 0.0044],   // 地铁隧道（虚线）
        [-0.0135, 0.0047], [-0.0165, 0.0052],   // 地铁隧道
        [-0.0190, 0.0068], [-0.0210, 0.0078]    // 步行出站
      ]
    )
  },
  {
    optionId: 'opt_3',
    name: '方案C · 美食绕路',
    description: '经过锦里/武侯祠，适合顺路游玩',
    mode: 'walk',
    color: '#27ae60',        // 绿色
    metrics: {
      distance: 5620,
      duration: 75,
      transitCount: 0
    },
    coordinates: [
      [104.077774, 30.655544],  // 春熙路起点
      [104.0730, 30.6540],       // 向南
      [104.0680, 30.6515],
      [104.0620, 30.6480],
      [104.049828, 30.645994],  // 经过锦里
      [104.047992, 30.646168],  // 经过武侯祠
      [104.0450, 30.6500],
      [104.0480, 30.6560],
      [104.0510, 30.6610],
      [104.053307, 30.663869]   // 宽窄巷子终点
    ]
  }
]

/**
 * 将方案坐标转为 OpenLayers 可用的 Feature
 * 🔴 TODO: 后续改为从后端接口获取完整 GeoJSON
 */
export function buildFeatureFromOption(option, coordTransformFn) {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: option.coordinates
    },
    properties: {
      optionId: option.optionId,
      mode: option.mode,
      color: option.color,
      metrics: option.metrics
    }
  }
}