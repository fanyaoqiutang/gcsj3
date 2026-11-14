// =======================================================
// 【第十阶段：攻略数据 API】
// 接口契约（前后端对齐，王茜负责实现）：
// ------------------------------------------------
// GET  /api/guide/summary        → 行程概览
// GET  /api/guide/transport      → 大交通信息
// GET  /api/guide/budget         → 预算明细
// GET  /api/guide/notes          → 注意事项
// GET  /api/guide/packing        → 必带物品清单
// POST /api/guide/export         → 服务端导出（暂不实现，前端本地导出）
// ------------------------------------------------
// 每个函数签名固定，mock/真实请求都遵循同一入参/返回结构
// =======================================================

import { USE_MOCK } from '@/constants/config'
import { http } from './index'

// ---------- Mock 数据（集中维护） ----------
const mockData = {
  summary: {
    title: '成都 3 日精华游',
    totalDays: 3,
    totalPois: 5,
    totalDistance: 11550,
    totalDuration: 140,
    avgDailyDistance: 3850,
    highlights: ['宽窄巷子', '大熊猫基地', '春熙路商圈'],
    difficulty: '轻松',     // 轻松 / 适中 / 挑战
    bestSeason: '3-6月 春/秋',
    createdAt: '2024-11-10',
    notes: '建议住在春熙路附近，交通便利，夜生活丰富'
  },

  transport: {
    // 大交通：到达/离开成都
    arrival: {
      type: '高铁',                // 飞机 / 高铁 / 汽车
      station: '成都东站',
      from: '出发地',
      suggestTime: '到达后建议地铁2号线进城',
      estimatedCost: 800
    },
    departure: {
      type: '高铁',
      station: '成都东站',
      suggestTime: '提前1.5小时到站',
      estimatedCost: 800
    },
    // 市内交通
    local: {
      primary: '地铁',
      coverage: '覆盖主要景点，建议购买天府通卡',
      costPerTrip: 3,
      note: '早晚高峰地铁拥挤，景点间步行更灵活'
    }
  },

  budget: [
    { category: '住宿', amount: 900, note: '锦江/成华区连锁酒店 3 晚', icon: '🏨' },
    { category: '餐饮', amount: 450, note: '日均 150，火锅/串串/小吃', icon: '🍜' },
    { category: '交通', amount: 50,  note: '地铁公交刷卡', icon: '🚇' },
    { category: '门票', amount: 180, note: '大熊猫基地/武侯祠', icon: '🎫' },
    { category: '购物', amount: 300, note: '伴手礼/特产', icon: '🛍️' },
    { category: '其他', amount: 100, note: '应急备用', icon: '💼' }
  ],

  notes: [
    { type: '交通', content: '成都地铁高峰 7:30-9:00、17:30-19:00，建议避开' },
    { type: '饮食', content: '火锅建议上午 11 点前或下午 5 点后用餐，避开排队' },
    { type: '天气', content: '成都多阴雨，随身携带雨伞' },
    { type: '文化', content: '宽窄巷子/锦里节假日限流，建议错峰上午 8 点前到达' },
    { type: '安全', content: '景区周边注意随身物品，警惕拉客' }
  ],

  packing: [
    { category: '证件', items: [
      { name: '身份证', required: true, checked: false },
      { name: '学生证/军官证（门票优惠）', required: false, checked: false }
    ]},
    { category: '电子设备', items: [
      { name: '手机 + 充电线', required: true, checked: false },
      { name: '充电宝（≤20000mAh）', required: true, checked: false },
      { name: '相机', required: false, checked: false }
    ]},
    { category: '衣物', items: [
      { name: '舒适运动鞋', required: true, checked: false },
      { name: '轻薄外套', required: true, checked: false },
      { name: '换洗衣物', required: true, checked: false }
    ]},
    { category: '生活用品', items: [
      { name: '雨伞', required: true, checked: false },
      { name: '防晒霜', required: false, checked: false },
      { name: '常用药品', required: true, checked: false }
    ]}
  ]
}

// ---------- 导出业务 API 对象 ----------
// 函数签名固定，USE_MOCK 切换不影响调用方式

export const guideApi = {
  /**
   * 获取行程概览
   * @returns {Promise<GuideSummary>}
   */
  getSummary() {
    if (USE_MOCK) {
      // mock：直接返回（有 300ms 延迟模拟）
      return new Promise(resolve => setTimeout(() => ({ ...mockData.summary }), 300))
    }
    // 🔴 TODO: 联调时改为真实请求
    // return http.get('/api/guide/summary').then(res => res.data)
  },

  /**
   * 获取大交通信息
   */
  getTransport() {
    if (USE_MOCK) return Promise.resolve({ ...mockData.transport })
    // 🔴 TODO: return http.get('/api/guide/transport')
  },

  /**
   * 获取预算明细
   */
  getBudget() {
    if (USE_MOCK) return Promise.resolve([...mockData.budget])
    // 🔴 TODO: return http.get('/api/guide/budget')
  },

  /**
   * 获取注意事项
   */
  getNotes() {
    if (USE_MOCK) return Promise.resolve([...mockData.notes])
    // 🔴 TODO: return http.get('/api/guide/notes')
  },

  /**
   * 获取必带物品清单
   */
  getPacking() {
    if (USE_MOCK) return Promise.resolve(JSON.parse(JSON.stringify(mockData.packing)))
    // 🔴 TODO: return http.get('/api/guide/packing')
  },

  /**
   * 更新必带物品清单（前端本地维护）
   * 🔴 TODO: 后续可对接后端保存用户自定义清单
   */
  updatePacking(packingData) {
    if (USE_MOCK) {
      // mock：直接更新本地引用，触发响应式
      Object.assign(mockData.packing, packingData)
      return Promise.resolve({ success: true })
    }
    // 🔴 TODO: return http.post('/api/guide/packing', packingData)
  },

  /**
   * 导出攻略（前端本地生成文件下载）
   * 🔴 TODO: 后续可对接服务端导出 PDF/Word
   */
  exportGuide(format = 'text', payload) {
    return new Promise(resolve => {
      const content = format === 'json'
        ? JSON.stringify(payload, null, 2)
        : buildTextReport(payload)

      // 触发浏览器下载
      downloadFile(content, `成都三日游攻略.${format === 'json' ? 'json' : 'txt'}`, format === 'json' ? 'application/json' : 'text/plain')
      resolve({ success: true, format })
    })
  }
}

// ---------- 工具函数 ----------

function buildTextReport(data) {
  let txt = `═══════════════════════════════════\n`
  txt += `     ${data.summary.title}\n`
  txt += `═══════════════════════════════════\n\n`

  txt += `【行程概览】\n`
  txt += `  天数：${data.summary.totalDays} 天\n`
  txt += `  景点数：${data.summary.totalPois} 个\n`
  txt += `  总距离：${(data.summary.totalDistance / 1000).toFixed(1)} km\n`
  txt += `  耗时：${data.summary.totalDuration} 分钟\n`
  txt += `  亮点：${data.summary.highlights.join('、')}\n\n`

  txt += `【大交通】\n`
  txt += `  到达：${data.transport.arrival.type} - ${data.transport.arrival.station}\n`
  txt += `  市内交通：${data.transport.local.primary}\n\n`

  txt += `【预算明细】\n`
  let total = 0
  data.budget.forEach(b => {
    txt += `  ${b.icon} ${b.category}：¥${b.amount}\n`
    total += b.amount
  })
  txt += `  ──────────────\n`
  txt += `  合计：¥${total}\n\n`

  txt += `【注意事项】\n`
  data.notes.forEach(n => txt += `  · ${n.type}：${n.content}\n`)
  txt += `\n【必带物品】\n`
  data.packing.forEach(group => {
    txt += `\n  [${group.category}]\n`
    group.items.forEach(it => txt += `    ${it.required ? '★' : ' '} ${it.name}\n`)
  })
  return txt
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}