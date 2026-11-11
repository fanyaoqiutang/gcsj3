// =======================================================
// 【第八阶段：Mock 封闭路段 + 绕行路线数据】
// 🔴 TODO: 后续替换为后端封闭路段查询 + Dijkstra/A* 绕行规划接口返回
// 约束：仅前端 UI + Mock 渲染，不做真实路网阻断计算
// =======================================================

/**
 * 预设可封闭路段（坐标为该路段的 LineString）
 * 选取原则：覆盖 3 条方案的部分路径段，模拟真实拥堵
 */
export const mockBlockedSegments = [
  {
    segmentId: 'seg_01',
    name: '蜀都大道（盐市口段）',
    // 该路段 LineString 坐标（方案A经过）
    geometry: {
      type: 'LineString',
      coordinates: [
        [104.0710, 30.6572],
        [104.0675, 30.6580],
        [104.0640, 30.6590]
      ]
    },
    hint: '模拟早高峰主干道拥堵'
  },
  {
    segmentId: 'seg_02',
    name: '人民公园地铁站出口',
    // 方案B（地铁）出站段
    geometry: {
      type: 'LineString',
      coordinates: [
        [104.0600, 30.6598],
        [104.0580, 30.6600],
        [104.0560, 30.6615]
      ]
    },
    hint: '模拟施工封路'
  },
  {
    segmentId: 'seg_03',
    name: '锦里南路',
    // 方案C（美食绕路）经过
    geometry: {
      type: 'LineString',
      coordinates: [
        [104.049828, 30.645994],
        [104.0480, 30.6470],
        [104.0460, 30.6490]
      ]
    },
    hint: '模拟景区限流管制'
  }
]

/**
 * 预设绕行路线 GeoJSON（每个封闭路段对应一条）
 * 🔴 TODO: 后续替换为后端算法返回的真实绕行路径
 */
export const mockDetourRoutes = {
  seg_01: {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.077774, 30.655544],
          [104.0750, 30.6540],
          [104.0720, 30.6520],      // ↓ 绕行南下
          [104.0680, 30.6500],
          [104.0650, 30.6490],
          [104.0610, 30.6510],      // ↓ 绕行北上
          [104.0570, 30.6550],
          [104.0550, 30.6600],
          [104.053307, 30.663869]
        ]
      },
      properties: {
        mode: 'walk',
        isDetour: true,
        blockedSegmentId: 'seg_01',
        distance: 4250,
        duration: 55
      }
    }]
  },

  seg_02: {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.077774, 30.655544],
          [104.0755, 30.6568],
          [104.0738, 30.6578],
          [104.0700, 30.6590],
          [104.0660, 30.6595],
          [104.0620, 30.6598],
          [104.0590, 30.6620],      // ↓ 绕行替换封闭段
          [104.0565, 30.6635],
          [104.053307, 30.663869]
        ]
      },
      properties: {
        mode: 'metro',
        isDetour: true,
        blockedSegmentId: 'seg_02',
        distance: 3100,
        duration: 32
      }
    }]
  },

  seg_03: {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.077774, 30.655544],
          [104.0730, 30.6540],
          [104.0680, 30.6515],
          [104.0620, 30.6480],
          [104.0520, 30.6480],      // ↓ 绕行避开锦里
          [104.0450, 30.6500],
          [104.0480, 30.6560],
          [104.0510, 30.6610],
          [104.053307, 30.663869]
        ]
      },
      properties: {
        mode: 'walk',
        isDetour: true,
        blockedSegmentId: 'seg_03',
        distance: 6100,
        duration: 85
      }
    }]
  }
}

/**
 * 根据封闭路段 id 获取绕行路线
 * 🔴 TODO: 后续改为 axios 请求后端绕行规划接口
 */
export function getDetourRoute(blockedSegmentId) {
  return mockDetourRoutes[blockedSegmentId] || null
}