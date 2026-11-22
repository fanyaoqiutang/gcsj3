﻿﻿﻿﻿﻿﻿﻿﻿<!--
  【页面 3：多景点游览规划 · 严格对齐总体设计文档】
  非多日/Day分组业务，是 TSP 多点串联游览
  左侧：批量添加 POI / TSP自动/手动排序 / 游览时长约束 / 出行模式 / 封闭道路
  右侧：双Tab（可拖拽景点列表 / 手账预览），多方案切换
  🔴 普通页面不暴露 Dijkstra/A* 算法名词
-->
<template>
  <div class="page-multi-spot">

    <!-- ========== 左侧参数面板 ========== -->
    <aside class="plan-left">

      <!-- POI 搜索 + 批量添加 -->
      <div class="sticky-card">
        <h3 class="card-title">🎯 景点选择</h3>

        <!-- 🔍 搜索框 -->
        <div class="poi-search">
          <input
            v-model="poiKeyword"
            type="text"
            placeholder="搜索景点名称或关键词…"
            class="poi-search-input"
          />
          <span v-if="poiKeyword" class="poi-search-clear" @click="poiKeyword=''">✕</span>
        </div>

        <!-- 过滤后的勾选列表 -->
        <div v-if="filteredPois.length" class="poi-check-list">
          <label v-for="p in filteredPois" :key="p.id" class="poi-check-item">
            <input type="checkbox"
              :checked="store.multiPoiList.some(x => x.id === p.id)"
              @change="togglePoi(p)" />
            <span class="poi-name">{{ p.name }}</span>
            <span class="poi-crowd">👥{{ p.crowdIndex }}</span>
          </label>
        </div>

        <!-- 空态：搜不到 -->
        <div v-else class="poi-search-empty">
          {{ poiKeyword ? `没有找到包含「${poiKeyword}」的景点` : '暂无可用景点' }}
        </div>

        <!-- 已选数量提示 + 清空 -->
        <div v-if="store.multiPoiList.length" class="add-btn-row">
          <span class="add-count">已选 {{ store.multiPoiList.length }} 个</span>
          <button class="btn-secondary" style="flex:1;" @click="doClearAll">🗑️ 清空</button>
        </div>
      </div>

      <!-- 排序模式 -->
      <div class="sticky-card">
        <h3 class="card-title">🧭 游览规划方式</h3>
        <div class="mode-switch">
          <button class="mode-btn" :class="{active: sortMode==='tsp'}" @click="sortMode='tsp'">✨ 智能推荐最优路线</button>
          <button class="mode-btn" :class="{active: sortMode==='manual'}" @click="sortMode='manual'">✋ 自己选择游览顺序</button>
        </div>
        <div v-if="sortMode==='manual'" class="hint-row" style="margin-top:8px;">
          💡 规划完成后可在右侧调整景点顺序
        </div>
      </div>

      <!-- 时长约束（仅多景点页） -->
      <div class="sticky-card">
        <h3 class="card-title">⏱️ 游览时长约束</h3>
        <div class="input-row">
          <input type="number" v-model.number="timeLimit" min="30" step="10" />
          <span class="unit">分钟</span>
        </div>
        <div class="budget-presets">
          <button v-for="p in [120, 240, 360, 480]" :key="p" class="preset-btn" @click="timeLimit = p">{{ p }}min</button>
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

      <!-- 封闭道路 -->
      <div class="sticky-card">
        <h3 class="card-title">🚧 动态路网仿真</h3>
        <select v-model="blockedSel" class="full-select">
          <option value="">不封闭</option>
          <option v-for="seg in store.blockedSegments" :key="seg.segmentId" :value="seg.segmentId">
            {{ seg.name }} · {{ seg.hint }}
          </option>
        </select>
      </div>

      <button class="btn-primary plan-btn" :disabled="store.multiPoiList.length < 2 || loading" @click="handlePlan">
        {{ loading ? '规划中...' : `🎯 规划路线（${store.multiPoiList.length}个景点）` }}
      </button>
    </aside>

    <!-- ========== 中间地图（真实 OpenLayers） ========== -->
    <main class="plan-center">
      <MapContainer ref="mapRef" />
      <!-- 景点计数角标（浮在地图左下） -->
      <div v-if="store.multiPoiList.length" class="poi-count-badge sticky-card">
        🎯 已选 <strong>{{ store.multiPoiList.length }}</strong> 个景点
      </div>
    </main>

    <!-- ========== 右侧3Tab结果 ========== -->
    <aside class="plan-right">
      <div class="right-tabs">
        <button class="tab-btn" :class="{active: store.multiRightTab==='list'}" @click="store.setMultiRightTab('list')">📋 点位列表</button>
        <button class="tab-btn" :class="{active: store.multiRightTab==='timeline'}" @click="store.setMultiRightTab('timeline')">⏳ 行程时间轴</button>
        <button class="tab-btn" :class="{active: store.multiRightTab==='journal'}" @click="store.setMultiRightTab('journal')">📖 路线预览</button>
      </div>

      <!-- Tab1：可拖拽点位列表（原有逻辑不动） -->
      <div v-show="store.multiRightTab==='list'" class="right-content">
        <div v-if="!schemeList.length" class="empty-card sticky-card">
          💡 勾选 2+ 景点后规划
        </div>
        <div v-for="s in schemeList" :key="s.schemeId"
          class="scheme-card sticky-card"
          :class="{ active: store.currentSchemeId===s.schemeId }"
          @click="store.setCurrentScheme(s.schemeId)"
        >
          <div class="scheme-title">
            <span class="scheme-color" :style="{background: schemeColor(s.schemeId)}"></span>
            <strong>{{ s.schemeName }}</strong>
          </div>
          <div class="scheme-metrics">
            <span>📍 {{ s.totalDistance }}</span>
            <span>⏱️ {{ s.totalTravelTime }}</span>
            <span v-if="s.transferCount">🔄 换乘{{ s.transferCount }}次</span>
          </div>
          <!-- 🧭 手动模式：当前方案可拖拽排序 -->
          <draggable
            v-if="sortMode==='manual' && store.currentSchemeId===s.schemeId"
            v-model="s.spotList"
            item-key="spotId"
            class="spot-list draggable"
            ghost-class="drag-ghost"
            chosen-class="drag-chosen"
            animation="200"
            @end="(ev) => onSpotDragEnd(ev, s.schemeId)"
          >
            <template #item="{ element, index }">
              <li>
                <span class="spot-idx">{{ index+1 }}</span>
                <span class="spot-name">🖐️ {{ element.name }}</span>
                <span class="spot-stay">停留{{ element.stayMinutes }}min</span>
              </li>
            </template>
          </draggable>
          <!-- 非手动模式：只读列表 -->
          <ol v-else class="spot-list draggable">
            <li v-for="(sp, i) in s.spotList" :key="sp.spotId">
              <span class="spot-idx">{{ i+1 }}</span>
              <span class="spot-name">{{ sp.name }}</span>
              <span class="spot-stay">停留{{ sp.stayMinutes }}min</span>
            </li>
          </ol>
          <!-- 手动模式下，激活方案显示重算按钮 -->
          <button
            v-if="sortMode==='manual' && store.currentSchemeId===s.schemeId"
            class="btn-secondary regenerate-btn"
            :disabled="loading"
            @click="regenerateManual"
          >🔄 {{ loading ? '规划中...' : '按当前顺序重新规划' }}</button>
        </div>
      </div>

      <!-- Tab2：行程时间轴（新组件） -->
      <div v-show="store.multiRightTab==='timeline'" class="right-content timeline-wrap">
        <TripTimeline
          :scheme="currentScheme"
          :allSchemes="schemeList"
          :travelMode="travelMode"
          :mapRef="mapRef"
          :schemeColor="schemeColor"
        />
      </div>

      <!-- Tab3：手账预览（原内容不动） -->
      <div v-show="store.multiRightTab==='journal'" class="right-content">
        <div v-if="!schemeList.length" class="empty-card sticky-card">
          💡 规划后展示路线预览
        </div>
        <div v-for="(s, i) in schemeList" :key="s.schemeId"
          class="journal-card"
          :class="{ active: store.currentSchemeId===s.schemeId }"
          :style="{transform: `rotate(${(i-0.5)*1.2}deg)`}"
          @click="store.setCurrentScheme(s.schemeId)"
        >
          <h4>{{ s.schemeName }}</h4>
          <div class="journal-meta">
            📏 {{ s.totalDistance }} · ⏱️ {{ s.totalTravelTime }}
            <span v-if="s.transferCount>0"> · 🔄 换乘{{ s.transferCount }}次</span>
          </div>
          <div class="journal-tags">
            <span v-if="travelMode==='metro'" class="journal-tag">🚇 地铁+步行</span>
            <span v-if="blockedSel" class="journal-tag warn">⚠️ 封闭仿真</span>
            <span v-if="store.multiPoiList.length" class="journal-tag">🎯 {{ store.multiPoiList.length }} 个景点</span>
          </div>
          <ol class="journal-spots">
            <li v-for="(sp, k) in s.spotList" :key="sp.spotId">
              {{ k+1 }}. {{ sp.name }}
              <span v-if="sp.stayMinutes" class="journal-stay">建议停留{{ sp.stayMinutes }}min</span>
            </li>
          </ol>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import draggable from 'vuedraggable'
import MapContainer from '@/components/MapContainer.vue'
import TripTimeline from '@/components/TripTimeline.vue'
import { useGlobalStore } from '@/store'
import { routeApi } from '@/api/route'
import { fetchScenicPois } from '@/api/scenicPois'

const store = useGlobalStore()
const mapRef = ref(null)
const availablePois = ref([])
const poiListLoading = ref(false)

// 页面初始化拉取 GeoServer WFS POI（失败降级 mock）
onMounted(async () => {
  poiListLoading.value = true
  availablePois.value = await fetchScenicPois()
  poiListLoading.value = false
})

const sortMode = ref('tsp')
const travelMode = ref('walk')
const timeLimit = ref(240)
const blockedSel = ref('')
const loading = ref(false)
const schemeList = ref([])

// 🔍 POI 搜索
const poiKeyword = ref('')
const filteredPois = computed(() => {
  const kw = poiKeyword.value.trim().toLowerCase()
  if (!kw) return availablePois.value
  return availablePois.value.filter(p =>
    p.name.toLowerCase().includes(kw) ||
    (p.description && p.description.toLowerCase().includes(kw)) ||
    (p.category && p.category.toLowerCase().includes(kw))
  )
})

// 当前选中的方案（给时间轴组件用）
const currentScheme = computed(() =>
  schemeList.value.find(s => s.schemeId === store.currentSchemeId) || schemeList.value[0] || null
)

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
  mapRef.value?.setActiveRoute?.(id)
})

// ========== 规划完成 → MapContainer 多方案分色渲染 ==========
watch(schemeList, list => {
  // 空数组：清干净所有路线 + 漫游状态
  if (!list.length || list.length === 0) {
    mapRef.value?.clearAll?.()
    store.clearCurrentScheme()
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

function togglePoi(p) {
  const exists = store.multiPoiList.find(x => x.id === p.id)
  if (exists) store.removeMultiPoi(p.id)
  else store.addMultiPoi({ id: p.id, name: p.name, lon: p.lon, lat: p.lat, stayMinutes: p.stayDuration || 30 })
}

function schemeColor(id) {
  const map = { 'scheme-A': '#e74c3c', 'scheme-B': '#27ae60', 'scheme-C': '#3498db' }
  return map[id] || '#888'
}

async function handlePlan() {
  if (store.multiPoiList.length < 2) return
  loading.value = true
  try {
    const res = await routeApi.planMultiPoiRoute({
      poiCoords: store.getMultiPoiCoords(),
      poiFullList: store.multiPoiList,   // 🔴 完整 POI 列表（含 name），让 mock 能填真实景点名
      mode: travelMode.value,
      blockedSegmentId: blockedSel.value || null,
      preservedOrder: sortMode.value === 'manual'
    })
    schemeList.value = res.schemeList
    store.setCurrentScheme(res.schemeList[0].schemeId)
  } finally { loading.value = false }
}

// ========== 手动拖拽排序：拖拽结束只调 spotList，不立即重算路线 ==========
function onSpotDragEnd(ev, schemeId) {
  const scheme = schemeList.value.find(s => s.schemeId === schemeId)
  if (!scheme) return
  // 更新 spotList 顺序（vuedraggable 已直接修改了数组，但我们要确保 routeGeoJson 后续同步）
  schemeList.value = [...schemeList.value]
}

// ========== 手动模式：按用户拖完的新顺序重新规划 ==========
// 🗑️ 完整清空：景点列表 + 方案 + 路线 + 地图 marker
function doClearAll() {
  store.clearMultiPoi()
  store.clearCurrentScheme()
  blockedSel.value = ''
  poiKeyword.value = ''
  schemeList.value = []
  mapRef.value?.clearAll?.()
}

async function regenerateManual() {
  if (!currentScheme.value) return
  loading.value = true
  try {
    const coords = currentScheme.value.spotList.map(s => [s.lon, s.lat])
    const res = await routeApi.planMultiPoiRoute({
      poiCoords: coords,
      poiFullList: currentScheme.value.spotList,   // 🔴 直接用当前方案的 spotList（已带 name）
      mode: travelMode.value,
      blockedSegmentId: blockedSel.value || null,
      preservedOrder: true
    })
    schemeList.value = res.schemeList
    store.setCurrentScheme(res.schemeList[0].schemeId)
  } finally { loading.value = false }
}
</script>

<style scoped>
.page-multi-spot { width:100%; height:100%; display:flex; padding:16px; gap:16px; }
.plan-left { width:280px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; flex-shrink:0; }
.plan-center { flex:1; background:var(--color-card); border:1px solid var(--color-border); border-radius:var(--radius-card); overflow:hidden; }
.plan-right { width:320px; display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; }

.card-title { font-size:13px; font-weight:600; color:var(--color-primary); margin:0 0 10px; padding-bottom:6px; border-bottom:1px dashed var(--color-border); }
.hint-row { font-size:11px; color:#999; margin-bottom:8px; line-height:1.5; }

/* 🔍 搜索框 */
.poi-search { position:relative; margin-bottom:8px; }
.poi-search-input {
  width:100%; padding:6px 26px 6px 10px;
  border:1px solid var(--color-border);
  border-radius:var(--radius-btn);
  font-size:12px;
  background:#fff;
  box-sizing:border-box;
  outline:none;
  transition:border-color 0.15s;
}
.poi-search-input:focus { border-color:var(--color-primary); }
.poi-search-clear {
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  color:#aaa; font-size:11px; cursor:pointer;
}
.poi-search-clear:hover { color:#e74c3c; }

.poi-check-list { max-height:140px; overflow-y:auto; }
.poi-search-empty {
  font-size:11px; color:#aaa; text-align:center;
  padding:14px 0;
}

.add-count {
  font-size:11px; color:var(--color-primary); margin-right:6px;
  align-self:center;
}
.poi-check-item { display:flex; align-items:center; gap:6px; font-size:12px; padding:3px 0; cursor:pointer; }
.poi-check-item input { accent-color: var(--color-primary); }
.poi-check-item .poi-name { flex:1; color:#333; }
.poi-check-item .poi-crowd { color:#888; font-size:11px; }
.add-btn-row { margin-top:8px; }

.mode-switch { display:flex; gap:6px; }
.mode-btn { flex:1; padding:8px; border:1px solid var(--color-border); background:#fff; border-radius:var(--radius-btn); font-size:11px; cursor:pointer; }
.mode-btn.active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); }

.input-row { display:flex; align-items:center; gap:6px; }
.input-row input { flex:1; padding:6px 8px; border:1px solid var(--color-border); border-radius:var(--radius-btn); font-size:13px; }
.input-row .unit { font-size:12px; color:#666; }
.budget-presets { display:flex; gap:4px; flex-wrap:wrap; margin-top:8px; }
.preset-btn { padding:2px 8px; border:1px solid var(--color-border); background:#fff; border-radius:10px; font-size:11px; cursor:pointer; color:#666; }
.preset-btn:hover { border-color:var(--color-primary); color:var(--color-primary); }

.full-select { width:100%; padding:7px; border:1px solid var(--color-border); border-radius:var(--radius-btn); font-size:12px; background:#fff; }

.plan-btn { margin-top:auto; padding:12px; font-size:14px; }

.right-tabs { display:flex; border-bottom:1px solid var(--color-border); flex-shrink:0; }
.tab-btn { flex:1; padding:8px; border:none; background:transparent; font-size:12px; cursor:pointer; color:#666; border-bottom:2px solid transparent; }
.tab-btn.active { background:var(--color-tab-bg); color:var(--color-primary); font-weight:600; border-bottom-color:var(--color-primary); }
.right-content { flex:1; overflow-y:auto; padding-top:8px; }
.right-content.timeline-wrap { padding-top:0; overflow:hidden; display:flex; flex-direction:column; }
.right-content.timeline-wrap > :deep(*) { flex:1; min-height:0; overflow-y:auto; }

.empty-card { text-align:center; color:#888; font-size:12px; }
.scheme-card { margin-top:8px; cursor:pointer; transition:all 0.15s; }
.scheme-card.active { border-color:var(--color-primary); box-shadow:0 0 0 1px var(--color-primary); }
.scheme-title { display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; }
.scheme-title strong { color:var(--color-text); }
.scheme-color { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
.scheme-metrics { font-size:11px; color:#666; margin:4px 0; display:flex; gap:10px; flex-wrap:wrap; }

.spot-list.draggable { list-style:none; padding:0; margin:6px 0 0; font-size:12px; }
.spot-list.draggable li {
  display:flex; align-items:center; gap:6px; padding:4px 6px; margin-bottom:2px;
  border:1px solid var(--color-border); border-radius:2px; background:#fff;
  cursor: grab; transition: transform 0.15s, box-shadow 0.15s;
}
.spot-list.draggable li:active { cursor: grabbing; }
.drag-ghost { background: rgba(156,56,56,0.15) !important; border: 1px dashed var(--color-primary) !important; opacity: 0.5; }
.drag-chosen { box-shadow: 0 4px 12px rgba(156,56,56,0.3); transform: scale(1.02); z-index: 10; position: relative; }
.regenerate-btn { margin-top: 8px; width: 100%; padding: 7px; font-size: 12px; }
.spot-idx { width:18px; height:18px; border-radius:50%; background:var(--color-primary); color:#fff; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.spot-name { flex:1; color:#333; }
.spot-stay { color:#888; font-size:11px; }

.journal-card { margin-top:12px; cursor:pointer; transition:transform 0.15s; }
.journal-card.active { box-shadow:0 0 0 2px var(--color-primary); }
.journal-card:hover { transform:rotate(0deg) translateY(-2px) !important; }
.journal-card h4 { font-size:13px; color:var(--color-primary); font-weight:700; margin:0; }
.journal-meta { font-size:11px; color:#888; margin:4px 0 6px; }
.journal-tags { margin-bottom:6px; }
.journal-tag { display:inline-block; font-size:10px; padding:1px 6px; border-radius:2px; background:var(--color-tab-bg); color:#666; margin-right:4px; margin-bottom:4px; }
.journal-tag.warn { background:#fdecea; color:#e74c3c; }
.journal-spots { list-style:none; padding:0; margin:0; font-size:12px; color:#555; }
.journal-spots li { padding:3px 0; border-bottom:1px dotted var(--color-border); }
.journal-spots li:last-child { border-bottom:none; }
.journal-stay { color:#888; font-size:11px; margin-left:4px; }

/* 景点计数角标 */
.poi-count-badge {
  position:absolute; bottom:16px; left:16px;
  padding:8px 14px;
  font-size:12px; color:#666;
  z-index:10;
}
.poi-count-badge strong { color:var(--color-primary); font-size:14px; }
/* plan-center 需要 position:relative */
.plan-center { position:relative; }
</style>