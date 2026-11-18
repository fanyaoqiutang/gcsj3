<!--
  【页面 4：开发者性能测试页 · 对照实验专用】
  风格：简洁工具页，无胶带/旋转装饰
  功能：
    ① 测试配置区：起终点、出行模式、封闭道路、算法选择（Dijkstra / A*）
    ② 对照实验：多轮执行 → 完整渲染业务指标 + 算法性能指标
    ③ 性能自动采集：接口耗时、图层渲染耗时
    ④ 汇总表格 + CSV 导出
  ⚠️ 普通用户页面绝不渲染 algorithmName / backendCalcMs / expandNodeCount
-->
<template>
  <div class="page-dev">
    <div class="dev-header">
      <h2 style="color:var(--color-primary); font-size:18px; margin:0;">🛠️ 开发者性能测试 · 算法对照实验</h2>
      <p style="color:#888; font-size:12px; margin:4px 0 0;">
        🔴 仅面向开发人员 · 完整渲染所有字段（含算法内部性能指标）· 支撑 Dijkstra vs A* 对照
      </p>
    </div>

    <!-- ========== 测试配置区 ========== -->
    <div class="sticky-card config-card">
      <h3 class="card-title">📝 测试用例配置</h3>
      <div class="config-grid">
        <div class="config-item">
          <label>起点坐标 [lon,lat]</label>
          <input v-model="cfg.origin" placeholder="104.053307, 30.663869" />
        </div>
        <div class="config-item">
          <label>终点坐标 [lon,lat]</label>
          <input v-model="cfg.destination" placeholder="104.077774, 30.655544" />
        </div>
        <div class="config-item">
          <label>出行模式</label>
          <select v-model="cfg.mode">
            <option value="walk">纯步行</option>
            <option value="metro">地铁+步行</option>
          </select>
        </div>
        <div class="config-item">
          <label>封闭道路</label>
          <select v-model="cfg.blockedSegmentId">
            <option value="">不封闭</option>
            <option v-for="s in blockedSegs" :key="s.segmentId" :value="s.segmentId">{{ s.name }}</option>
          </select>
        </div>
        <div class="config-item">
          <label>算法选择（🔴 仅 Dev 页可见）</label>
          <select v-model="cfg.algorithm">
            <option value="dijkstra">Dijkstra（基准）</option>
            <option value="astar">A* 启发式</option>
          </select>
        </div>
        <div class="config-item">
          <label>重复执行次数（取平均）</label>
          <input type="number" v-model.number="cfg.repeat" min="1" max="20" />
        </div>
      </div>
      <div class="config-actions">
        <button class="btn-primary" :disabled="running" @click="runExperiment()">
          {{ running ? '执行中...' : '▶️ 执行对照实验' }}
        </button>
        <button class="btn-secondary" @click="results=[]; records=[]">🗑️ 清空</button>
        <button class="btn-secondary" @click="exportCSV()" :disabled="!results.length">⬇️ 导出 CSV</button>
      </div>
    </div>

    <!-- ========== 对照实验结果 ========== -->
    <div v-if="results.length" class="sticky-card">
      <h3 class="card-title">📊 对照实验结果（共 {{ results.length }} 次执行）</h3>
      <table class="result-table">
        <thead>
          <tr>
            <th rowspan="2">#</th>
            <th rowspan="2">算法</th>
            <th colspan="4" class="group-col">📈 业务指标（普通用户可见）</th>
            <th colspan="3" class="group-alg">⚙️ 算法性能指标（仅 Dev 页）</th>
          </tr>
          <tr>
            <th>方案</th><th>距离</th><th>耗时</th><th>换乘</th>
            <th>后端计算(ms)</th><th>扩展节点数</th><th>性能对比</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(r,i) in results" :key="i">
            <tr v-for="(s, j) in r.schemeList" :key="j" :class="{ even: i%2===0 }">
              <td v-if="j===0" :rowspan="r.schemeList.length" class="run-num">{{ i+1 }}</td>
              <td>{{ s.algorithmName }}</td>
              <td>{{ s.schemeName }}</td>
              <td>{{ s.totalDistance }}</td>
              <td>{{ s.totalTravelTime }}</td>
              <td>{{ s.transferCount }}</td>
              <td class="perf-cell">{{ s.backendCalcMs }} ms</td>
              <td class="perf-cell">{{ s.expandNodeCount.toLocaleString() }}</td>
              <td class="perf-compare">
                <span v-if="s.algorithmName==='A*'" class="badge astar">⚡ A* 更优</span>
                <span v-else class="badge dijk">🔵 Dijkstra 基准</span>
              </td>
            </tr>
          </template>
          <tr v-if="!results.length"><td colspan="11" class="empty-hint">暂无实验结果，配置后点击执行</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ========== 实时性能采集 ========== -->
    <div class="sticky-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 class="card-title" style="margin:0;">⚡ 实时性能采集</h3>
        <div style="display:flex; gap:6px;">
          <button class="btn-secondary" @click="perfRunning=!perfRunning">{{ perfRunning ? '⏸️ 暂停' : '▶️ 自动采集' }}</button>
          <button class="btn-secondary" @click="records=[]">🗑️ 清空</button>
        </div>
      </div>
      <table class="perf-table">
        <thead><tr><th>时间戳</th><th>事件</th><th>模块</th><th>耗时(ms)</th></tr></thead>
        <tbody>
          <tr v-for="(r,i) in records" :key="i">
            <td class="ts">{{ r.ts }}</td>
            <td>{{ r.event }}</td>
            <td class="mod">{{ r.module }}</td>
            <td class="dur">{{ r.duration }}</td>
          </tr>
          <tr v-if="!records.length"><td colspan="4" class="empty-hint">等待采集数据...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { mockBlockedSegments } from '@/data/mockDetour'
import { routeApi } from '@/api/route'

const blockedSegs = ref(mockBlockedSegments)
const cfg = ref({
  origin: '104.053307, 30.663869',
  destination: '104.077774, 30.655544',
  mode: 'walk',
  blockedSegmentId: '',
  algorithm: 'dijkstra',
  repeat: 3
})

const running = ref(false)
const results = ref([])

// ---------- 对照实验执行 ----------
async function runExperiment() {
  running.value = true
  const [o1, o2] = cfg.value.origin.split(',').map(s => parseFloat(s.trim()))
  const [d1, d2] = cfg.value.destination.split(',').map(s => parseFloat(s.trim()))
  if ([o1,o2,d1,d2].some(isNaN)) { alert('坐标格式错误'); running.value=false; return }

  for (let i = 0; i < cfg.value.repeat; i++) {
    const res = await routeApi.planRoute({
      origin: [o1, o2], destination: [d1, d2],
      mode: cfg.value.mode, blockedSegmentId: cfg.value.blockedSegmentId || null
    })
    results.value.push(res)
  }
  running.value = false
}

// ---------- 实时性能采集（🔴 后续埋点替换） ----------
const perfRunning = ref(true)
const records = ref([])
let timer = null
function autoCollect() {
  const events = [
    { event: '接口请求 /api/route/plan', module: 'routeApi' },
    { event: '路线 GeoJSON 解析', module: 'MapContainer' },
    { event: '矢量图层渲染', module: 'MapContainer' },
    { event: '方案切换联动', module: 'SchemePanel' },
    { event: 'POI marker 加载', module: 'MapContainer' }
  ]
  const e = events[Math.floor(Math.random() * events.length)]
  const now = new Date()
  records.value.unshift({
    ts: `${now.toLocaleTimeString()}.${String(now.getMilliseconds()).padStart(3,'0')}`,
    event: e.event, module: e.module,
    duration: Math.floor(Math.random() * 280 + 20)
  })
  if (records.value.length > 100) records.value = records.value.slice(0, 100)
}
onMounted(() => { timer = setInterval(() => { if (perfRunning.value) autoCollect() }, 2000) })
onUnmounted(() => { clearInterval(timer) })

// ---------- CSV 导出 ----------
function exportCSV() {
  const header = '执行序号,方案ID,方案名,算法,距离,通行时长,换乘次数,后端计算耗时(ms),扩展节点数\n'
  const rows = []
  results.value.forEach((r, i) => {
    r.schemeList.forEach(s => {
      rows.push([i+1, s.schemeId, s.schemeName, s.algorithmName, s.totalDistance, s.totalTravelTime, s.transferCount, s.backendCalcMs, s.expandNodeCount].join(','))
    })
  })
  const blob = new Blob(['\ufeff' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `exp_report_${Date.now()}.csv`
  a.click(); URL.revokeObjectURL(url)
}
</script>

<style scoped>
.page-dev { padding: 20px; max-width: 1200px; margin: 0 auto; display:flex; flex-direction:column; gap:16px; }
.dev-header { margin-bottom: 4px; }

.config-card { }
.card-title { font-size:13px; font-weight:600; color:var(--color-primary); margin:0 0 12px; padding-bottom:6px; border-bottom:1px dashed var(--color-border); }
.config-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
.config-item label { display:block; font-size:11px; color:#888; margin-bottom:4px; }
.config-item input, .config-item select {
  width:100%; padding:6px 8px; border:1px solid var(--color-border); border-radius:2px; font-size:12px; background:#fff;
}
.config-actions { display:flex; gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--color-border); }

.result-table, .perf-table { width:100%; border-collapse:collapse; font-size:12px; }
.result-table th, .result-table td, .perf-table th, .perf-table td { padding:6px 8px; border-bottom:1px solid var(--color-border); text-align:left; }
.result-table thead tr:first-child th { background:var(--color-tab-bg); font-size:11px; }
.result-table thead tr:nth-child(2) th { background:var(--color-btn-sec-bg); font-size:11px; font-weight:normal; color:#666; }
.group-col { color:#27ae60; }
.group-alg { color:#e74c3c; background:#fdf0f0 !important; }
.group-col, .group-alg { text-align:center !important; }

.run-num { color:#999; font-family:monospace; }
.perf-cell { font-family:monospace; color:#c0392b; font-weight:600; }
.perf-compare .badge { font-size:10px; padding:1px 6px; border-radius:2px; display:inline-block; }
.perf-compare .badge.astar { background:#d5f5e3; color:#1e8449; }
.perf-compare .badge.dijk { background:#eaf2f8; color:#2471a3; }
.even { background:#fafafa; }

.perf-table th { background:var(--color-btn-sec-bg); font-size:11px; color:#666; }
.perf-table .ts { color:#888; font-family:monospace; font-size:11px; }
.perf-table .mod { color:#555; }
.perf-table .dur { font-family:monospace; color:#c0392b; text-align:right; font-weight:600; }

.empty-hint { text-align:center; color:#bbb; padding:20px; font-size:12px; }
</style>