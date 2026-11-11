// =======================================================
// 【第五阶段：Mock 日程数据】
// 🔴 TODO: 后续替换为后端接口返回的真实日程，或前端本地存储
// 结构：按天分组，每天包含景点列表
//       景点 id 对应 mockPois.js 中的 POI id
// =======================================================

export const mockItinerary = [
  {
    day: 1,
    dateLabel: 'Day 1 · 市中心文化游',
    spots: [
      { poiId: 'poi_001', order: 1, note: '上午 9:00 到达，喝茶休闲' },
      { poiId: 'poi_002', order: 2, note: '午餐，尝三大炮' },
      { poiId: 'poi_003', order: 3, note: '下午逛武侯祠' }
    ]
  },
  {
    day: 2,
    dateLabel: 'Day 2 · 熊猫基地一日游',
    spots: [
      { poiId: 'poi_004', order: 1, note: '上午 8:30 出发，看熊猫' }
    ]
  },
  {
    day: 3,
    dateLabel: 'Day 3 · 春熙路商圈购物',
    spots: [
      { poiId: 'poi_005', order: 1, note: '全天逛街购物' }
    ]
  }
]

/**
 * 根据 poiId 查找对应的 POI 完整数据
 * 🔴 TODO: 后续可从后端接口获取 POI 详情
 */
export function findPoiById(poiId) {
  // 动态导入避免循环依赖
  import('./mockPois.js').then(({ mockPois }) => {
    return mockPois.find(p => p.id === poiId)
  })
}