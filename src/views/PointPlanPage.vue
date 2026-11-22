﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="page-point-plan">

    <!-- ========== 左侧参数面板 ========== -->
    <aside class="plan-left">

      <!-- 起终点（搜索 + 地图拾取） -->
      <div class="sticky-card">
        <h3 class="card-title">📍 起终点</h3>

        <!-- 🔍 起点搜索 -->
        <div class="endpoint-search-block">
          <div class="endpoint-label-row">
            <span class="endpoint-dot start"></span><span>起点</span>
            <button v-if="store.selectedStart" class="ep-clear-btn" @click="clearEp('start')">✕</button>
          </div>
          <div class="ep-input-wrap" :class="{active: activeField==='start'}">
            <input
              v-model="kwStart"
              type="text"
              placeholder="输入景点名或坐标…"
              @focus="activeField='start'"
              @blur="onBlurField"
              @keydown.enter="onEnterSearch('start')"
            />
            <div v-if="kwStart && kwStart.trim().length >= 1 && matchedPois('start').length" class="ep-dropdown">
              <div
                v-for="p in matchedPois('start').slice(0,6)"
                :key="p.id"
                class="ep-dropdown-item"
                @mousedown.prevent="applyPoi('start', p)"
              >
                <span class="ep-d-name">{{ p.name }}</span>
                <span class="ep-d-sub">{{ p.category }} · 👥{{ p.crowdIndex }}</span>
              </div>
            </div>
          </div>
          <div class="ep-coord-hint">{{ store.selectedStart ? format(store.selectedStart) : '未设置' }}</div>
        </div>

        <!-- 🔍 终点搜索 -->
        <div class="endpoint-search-block">
          <div class="endpoint-label-row">
            <span class="endpoint-dot end"></span><span>终点</span>
            <button v-if="store.selectedEnd" class="ep-clear-btn" @click="clearEp('end')">✕</button>
          </div>
          <div class="ep-input-wrap" :class="{active: activeField==='end'}">
            <input
              v-model="kwEnd"
              type="text"
              placeholder="输入景点名或坐标…"
              @focus="activeField='end'"
              @blur="onBlurField"
              @keydown.enter="onEnterSearch('end')"
            />
            <div v-if="kwEnd && kwEnd.trim().length >= 1 && matchedPois('end').length" class="ep-dropdown">
              <div
                v-for="p in matchedPois('end').slice(0,6)"
                :key="p.id"
                class="ep-dropdown-item"
                @mousedown.prevent="applyPoi('end', p)"
              >
                <span class="ep-d-name">{{ p.name }}</span>
                <span class="ep-d-sub">{{ p.category }} · 👥{{ p.crowdIndex }}</span>
              </div>
            </div>
          </div>
          <div class="ep-coord-hint">{{ store.selectedEnd ? format(store.selectedEnd) : '未设置' }}</div>
        </div>

        <div class="hint-row">💡 也可点右上角「📍选点」在地图上点击拾取</div>

        <div class="btn-row">
          <button v-if="!store.isSelectPointMode" class="btn-secondary flex1" @click="store.toggleSelectPoint()">📍 开启选点</button>
          <button v-else class="btn-secondary flex1" @click="store.toggleSelectPoint()">退出选点</button>
          <button class="btn-secondary flex1" @click="doClearAll">🗑️ 清空</button>
        </div>
      </div>

      <!-- 出行模式 -->
      <div class="sticky-card">
        <h3 class="card-title">🚶 出行方式</h3>
        <div class="mode-switch">
          <button class="mode-btn" :class="{active: travelMode==='walk'}" @click="travelMode='walk'">🚶 纯步行</button>
          <button class="mode-btn" :class="{active: travelMode==='metro'}" @click="travelMode='metro'">🚇 地铁+步行</button>
        </div>
      </div>

      <!-- 动态路网仿真（封闭道路选择） -->
      <div class="sticky-card">
        <h3 class="card-title">🚧 动态路网仿真</h3>
        <div class="hint-row">模拟选择封闭路段，查看绕行规划效果</div>
        <select v-model="blockedSel" class="full-select">
          <option value="">不封闭（正常路网）</option>
          <option v-for="seg in store.blockedSegments" :key="seg.segmentId" :value="seg.segmentId">
            {{ seg.name }} · {{ seg.hint }}
          </option>
        </select>
      </div>

      <button class="btn-primary plan-btn" :disabled="!store.hasBothEndpoints() || loading" @click="handlePlan">
        {{ loading ? '规划中...' : '🎯 规划路线' }}
      </button>
    </aside>

    <!-- ========== 中间地图（真实 OpenLayers） ========== -->
    <main class="plan-center">
      <MapContainer
        ref="mapRef"
        @points-picked="onPointsPicked"
        @poi-click="onPoiClick"
      />
      <!-- 选点模式提示条（贴地图顶部） -->
      <div v-if="store.isSelectPointMode" class="pick-hint">
        📍 选点模式：在地图上点击「起点」位置 → 再点击「终点」位置
      </div>
    </main>

    <!-- ========== 右侧结果面板 ========== -->
    <aside class="plan-right">
      <div class="right-tabs">
        <button class="tab-btn" :class="{active: rightTab==='list'}" @click="rightTab='list'">📋 点位序列</button>
        <button class="tab-btn" :class="{active: rightTab==='journal'}" @click="rightTab='journal'">📖 路线预览</button>
      </div>

      <!-- Tab1：点位序列 -->
      <div v-if="rightTab==='list'" class="right-content">
        <div v-if="!schemeList.length" class="empty-card sticky-card">
          💡 拾取起终点后点击「规划路线」
        </div>
        <template v-for="s in schemeList" :key="s.schemeId">
          <div class="scheme-card sticky-card" :class="{ active: store.currentSchemeId===s.schemeId }" @click="store.setCurrentScheme(s.schemeId)">
            <div class="scheme-title">
              <span class="scheme-color" :style="{background: schemeColor(s.schemeId)}"></span>
              <strong>{{ s.schemeName }}</strong>
            </div>
            <div class="scheme-metrics">
              <span>📍 {{ s.totalDistance }}</span>
              <span>⏱️ {{ s.totalTravelTime }}</span>
              <span v-if="s.transferCount > 0">🔄 换乘{{ s.transferCount }}次</span>
            </div>
            <ul class="spot-list">
              <li v-for="(sp, i) in s.spotList" :key="sp.spotId">{{ i+1 }}. {{ sp.name }}</li>
            </ul>
          </div>
        </template>
      </div>

      <!-- Tab2：路线预览（手账卡片样式 + 路线摘要面板） -->
      <div v-else class="right-content">
        <div v-if="!schemeList.length" class="empty-card sticky-card">
          💡 规划后展示路线预览
        </div>
        <div v-for="(s, i) in schemeList" :key="s.schemeId"
          class="journal-card" :class="{ active: store.currentSchemeId===s.schemeId }"
          :style="{transform: `rotate(${(i-0.5)*1.2}deg)`}"
          @click="store.setCurrentScheme(s.schemeId)"
        >
          <h4 style="font-size:13px; color:var(--color-primary); font-weight:700;">{{ s.schemeName }}</h4>
          <div class="journal-meta">
            📏 {{ s.totalDistance }} · ⏱️ {{ s.totalTravelTime }}
            <span v-if="s.transferCount>0"> · 🔄 换乘{{ s.transferCount }}次</span>
          </div>
          <div v-if="travelMode==='metro'" class="journal-tag">🚇 地铁+步行</div>
          <div v-if="blockedSel" class="journal-tag warn">⚠️ 封闭道路仿真已启用</div>
          <ol class="journal-spots">
            <li v-for="sp in s.spotList" :key="sp.spotId">{{ sp.name }}</li>
          </ol>
        </div>

        <!-- 路线摘要面板（跟随当前激活方案） -->
        <div v-if="activeScheme" class="rs-wrapper">
          <RouteSummary
            :scheme="activeScheme"
            :mapRef="mapRef"
            :schemeColor="schemeColor(activeScheme.schemeId)"
            :travelMode="travelMode"
          />
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
import RouteSummary from '@/components/RouteSummary.vue'
import { useGlobalStore } from '@/store'
import { routeApi } from '@/api/route'
import { wgs84ToWebMerc } from '@/utils'
import { fetchScenicPois } from '@/api/scenicPois'

// 🎯 GeoServer WFS 拉取的景点候选（失败自动降级 mockPois）
const allPois = ref([])
onMounted(async () => { allPois.value = await fetchScenicPois() })

// 🔍 起终点搜索状态
const kwStart = ref('')
const kwEnd = ref('')
const activeField = ref('')  // 'start' | 'end' | ''  — 当前聚焦哪个输入框

// POI 模糊匹配
function matchedPois(which) {
  const kw = (which === 'start' ? kwStart.value : kwEnd.value).trim().toLowerCase()
  if (!kw) return []
  return allPois.value.filter(p =>
    p.name.toLowerCase().includes(kw) ||
    (p.description && p.description.toLowerCase().includes(kw)) ||
    (p.category && p.category.toLowerCase().includes(kw))
  )
}

// 应用选中的 POI 到起终点
function applyPoi(which, poi) {
  if (which === 'start') {
    store.setSelectedStart({ name: poi.name, lon: poi.lon, lat: poi.lat })
    kwStart.value = poi.name
  } else {
    store.setSelectedEnd({ name: poi.name, lon: poi.lon, lat: poi.lat })
    kwEnd.value = poi.name
  }
  activeField.value = ''
  mapRef.value?.flyToPoi(poi.lon, poi.lat, 16)
}

// 按回车：尝试解析坐标字符串；否则取第一个匹配 POI
function onEnterSearch(which) {
  const kw = (which === 'start' ? kwStart.value : kwEnd.value).trim()
  if (!kw) return
  // 坐标模式：104.053,30.663 或 104.053 30.663 或 [104.053,30.663]
  const coordMatch = kw.match(/^\s*\[?\s*(-?\d+\.\d+)\s*[,\s]\s*(-?\d+\.\d+)\s*\]?\s*$/)
  if (coordMatch) {
    const lon = parseFloat(coordMatch[1])
    const lat = parseFloat(coordMatch[2])
    if (lon > 73 && lon < 135 && lat > 18 && lat < 54) {  // 中国范围
      if (which === 'start') store.setSelectedStart({ name: '起点', lon, lat })
      else store.setSelectedEnd({ name: '终点', lon, lat })
      activeField.value = ''
      mapRef.value?.flyToPoi(lon, lat, 15)
      return
    }
  }
  // POI 模式：取第一个匹配
  const first = matchedPois(which)[0]
  if (first) applyPoi(which, first)
}

function clearEp(which) {
  if (which === 'start') { store.selectedStart = null; kwStart.value = ''; mapRef.value?.clearEndpointMarker('start') }
  else { store.selectedEnd = null; kwEnd.value = ''; mapRef.value?.clearEndpointMarker('end') }
  // 端点一改，路线也该作废
  schemeList.value = []
  store.setCurrentScheme('')
  mapRef.value?.clearAll?.()
}

// 🗑️ 完整清空：起终点 + 搜索框 + 路线 + 右侧结果 + 地图所有 marker
function doClearAll() {
  store.clearEndpoints()
  kwStart.value = ''
  kwEnd.value = ''
  activeField.value = ''
  schemeList.value = []
  store.setCurrentScheme('')
  blockedSel.value = ''
  mapRef.value?.clearAll?.()
}

function onBlurField() {
  setTimeout(() => activeField.value = '', 150)  // 让 mousedown.prevent 有机会执行
}

const store = useGlobalStore()
const mapRef = ref(null)
const travelMode = ref('walk')
const blockedSel = ref('')
const rightTab = ref('list')
const loading = ref(false)
const schemeList = ref([])

// ========== 页面初始化 ==========
onMounted(() => {
  // 单点规划页进入「拾取起终点」模式（由 store.isSelectPointMode 控制）
  // 但 MapContainer 默认是 'pick-endpoint'，所以不需要额外切换
  // 只需要让 MapContainer 不响应 POI 点击弹窗（首页的逻辑）
})

// ========== MapContainer → store 起终点联动 ==========
function onPointsPicked({ start, end }) {
  // MapContainer pick-endpoint 模式下会依次 emit 两次 points-picked
  // start/end 都是 [lon, lat] (WGS84)，这里包成完整 POI 对象（name 兜底用起点/终点）
  if (start) store.setSelectedStart({ name: '起点', lon: start[0], lat: start[1] })
  if (end)   store.setSelectedEnd({ name: '终点', lon: end[0], lat: end[1] })
}
function onPoiClick(poiData) {
  // 规划页点 POI 不需要弹窗，可选：自动设为起点/终点
  console.log('[PointPlan] POI 被点击:', poiData.name, '（可接入自动填充起终点）')
}

// ========== 封闭道路 → MapContainer 渲染红色高亮 ==========
watch(blockedSel, v => {
  v ? store.setBlockedSegment(v) : store.clearBlockedSegment()
  if (v) {
    const seg = store.blockedSegments.find(s => s.segmentId === v)
    if (seg) mapRef.value?.renderBlockedSegment(seg)
  } else {
    mapRef.value?.clearBlockedAndDetour?.()
  }
})

// ========== 方案切换 → MapContainer 路线高亮联动 ==========
watch(() => store.currentSchemeId, id => {
  if (!id) return
  schemeList.value.forEach(s => {
    // schemeList 渲染时已调用 addRouteOption，这里只切换 active
    mapRef.value?.setActiveRoute?.(id)
  })
})

// ========== 规划完成 → MapContainer 分色渲染多方案路线 ==========
watch(schemeList, list => {
  // 空数组：清干净所有路线 + 方案
  if (!list.length || list.length === 0) {
    mapRef.value?.clearAll?.()
    store.setCurrentScheme('')
    return
  }
  // 正常：先清空旧路线，再逐条渲染
  if (!store.currentSchemeId) store.setCurrentScheme(list[0].schemeId)
  mapRef.value?.clearAll?.()
  list.forEach(scheme => {
    const gj = scheme.routeGeoJson
    if (!gj) return
    const coords = gj.features[0].geometry.coordinates
    mapRef.value?.addRouteOption({
      optionId: scheme.schemeId,
      mode: travelMode.value,
      color: schemeColor(scheme.schemeId),
      coordinates: coords
    })
  })
  setTimeout(() => mapRef.value?.fitAllRoutes?.(), 100)
})

const activeScheme = computed(() => schemeList.value.find(s => s.schemeId === store.currentSchemeId) || null)

function format(poi) {
  if (!poi) return '—'
  // 兼容两种来源：POI 对象 {lon, lat} 或兜底坐标数组 [lon, lat]
  const lon = poi.lon ?? poi[0]; const lat = poi.lat ?? poi[1]
  const name = poi.name
  return name ? `${name} (${lon.toFixed(3)}, ${lat.toFixed(3)})` : `${lon.toFixed(3)}, ${lat.toFixed(3)}`
}
function schemeColor(id) {
  const map = { 'scheme-A': '#e74c3c', 'scheme-B': '#27ae60', 'scheme-C': '#3498db' }
  return map[id] || '#888'
}

async function handlePlan() {
  if (!store.hasBothEndpoints()) return
  loading.value = true
  try {
    const res = await routeApi.planRoute({
      startPoi: store.selectedStart,   // 完整 POI 对象 {name, lon, lat}
      endPoi:   store.selectedEnd,
      mode: travelMode.value,
      blockedSegmentId: blockedSel.value || null
    })
    schemeList.value = res.schemeList
    store.setCurrentScheme(res.schemeList[0].schemeId)
  } finally { loading.value = false }
}
</script>

<style scoped>
.page-point-plan { width:100%; height:100%; display:flex; padding:16px; gap:16px; }
.plan-left { width:280px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; flex-shrink:0; }
.plan-center { flex:1; background:var(--color-card); border:1px solid var(--color-border); border-radius:var(--radius-card); overflow:hidden; }
.plan-right { width:320px; display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; }

.card-title { font-size:13px; font-weight:600; color:var(--color-primary); margin:0 0 10px; padding-bottom:6px; border-bottom:1px dashed var(--color-border); }
.hint-row { font-size:11px; color:#999; margin-bottom:8px; line-height:1.5; }
.endpoint-row { display:flex; align-items:center; gap:6px; font-size:12px; padding:3px 0; }
.endpoint-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.endpoint-dot.start { background:#27ae60; }
.endpoint-dot.end { background:#e74c3c; }
.endpoint-label { width:32px; color:#666; }
/* 📍 起终点搜索区块 */
.endpoint-search-block { margin-bottom:12px; }
.endpoint-label-row { display:flex; align-items:center; gap:6px; font-size:12px; color:#555; margin-bottom:4px; }
.ep-clear-btn { margin-left:auto; border:none; background:none; color:#aaa; font-size:12px; cursor:pointer; padding:0 4px; }
.ep-clear-btn:hover { color:#e74c3c; }

.ep-input-wrap { position:relative; }
.ep-input-wrap input {
  width:100%; padding:7px 10px; font-size:12px; box-sizing:border-box;
  border:1px solid var(--color-border); border-radius:var(--radius-btn);
  background:#fff; outline:none; transition:border-color 0.15s;
}
.ep-input-wrap.active input,
.ep-input-wrap input:focus { border-color:var(--color-primary); box-shadow:0 0 0 2px rgba(156,56,56,0.1); }

.ep-dropdown {
  position:absolute; left:0; right:0; top:calc(100% + 2px); z-index:100;
  max-height:220px; overflow-y:auto;
  background:#fff; border:1px solid var(--color-border); border-radius:var(--radius-btn);
  box-shadow:0 4px 12px rgba(0,0,0,0.12);
}
.ep-dropdown-item {
  padding:6px 10px; font-size:12px; cursor:pointer;
  border-bottom:1px solid #f5f5f5; display:flex; justify-content:space-between; align-items:center;
}
.ep-dropdown-item:last-child { border-bottom:none; }
.ep-dropdown-item:hover { background:rgba(156,56,56,0.08); }
.ep-d-name { color:#333; font-weight:500; }
.ep-d-sub { color:#999; font-size:10px; }

.ep-coord-hint { font-size:10px; color:#aaa; margin-top:3px; }

.endpoint-val { flex:1; color:#333; font-family:monospace; font-size:11px; }
.btn-row { display:flex; gap:6px; margin-top:8px; }
.flex1 { flex:1; }
.mode-switch { display:flex; gap:6px; }
.mode-btn { flex:1; padding:8px; border:1px solid var(--color-border); background:#fff; border-radius:var(--radius-btn); font-size:12px; cursor:pointer; }
.mode-btn.active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); }
.full-select { width:100%; padding:7px; border:1px solid var(--color-border); border-radius:var(--radius-btn); font-size:12px; background:#fff; }
.plan-btn { margin-top:auto; padding:12px; font-size:14px; }

.right-tabs { display:flex; border-bottom:1px solid var(--color-border); flex-shrink:0; }
.tab-btn { flex:1; padding:8px; border:none; background:transparent; font-size:12px; cursor:pointer; color:#666; border-bottom:2px solid transparent; }
.tab-btn.active { background:var(--color-tab-bg); color:var(--color-primary); font-weight:600; border-bottom-color:var(--color-primary); }
.right-content { flex:1; overflow-y:auto; padding-top:8px; }

.empty-card { text-align:center; color:#888; font-size:12px; }
.rs-wrapper {
  margin-top:12px; padding:10px;
  background:#fff;
  border:1px solid var(--color-border);
  border-radius: var(--radius-card);
}
.scheme-card { margin-top:8px; cursor:pointer; transition:all 0.15s; }
.scheme-card.active { border-color:var(--color-primary); box-shadow:0 0 0 1px var(--color-primary); }
.scheme-title { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text); margin-bottom:4px; }
.scheme-color { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
.scheme-metrics { font-size:11px; color:#666; margin:4px 0; display:flex; gap:10px; flex-wrap:wrap; }
.spot-list { list-style:none; padding:0; margin:6px 0 0; font-size:12px; color:#555; }
.spot-list li { padding:2px 0; }

.journal-card { margin-top:12px; cursor:pointer; transition:transform 0.15s; }
.journal-card.active { box-shadow:0 0 0 2px var(--color-primary); }
.journal-card:hover { transform:rotate(0deg) translateY(-2px) !important; }
.journal-meta { font-size:11px; color:#888; margin:4px 0 8px; }
.journal-tag { display:inline-block; font-size:10px; padding:1px 6px; border-radius:2px; background:var(--color-tab-bg); color:#666; margin-right:4px; margin-bottom:4px; }
.journal-tag.warn { background:#fdecea; color:#e74c3c; }
.journal-spots { list-style:none; padding:0; margin:6px 0 0; font-size:12px; color:#555; }
.journal-spots li { padding:3px 0; border-bottom:1px dotted var(--color-border); }
.journal-spots li:last-child { border-bottom:none; }

/* 选点模式提示条 */
.pick-hint {
  position:absolute; top:10px; left:50%; transform:translateX(-50%);
  background:rgba(156,56,56,0.92); color:#fff;
  padding:6px 18px; border-radius:2px;
  font-size:12px; font-weight:600;
  box-shadow:0 2px 8px rgba(156,56,56,0.3);
  z-index:10;
}
/* plan-center 需要 position:relative 让 pick-hint 绝对定位 */
.plan-center { position:relative; }
</style>