<!--
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

      <!-- POI 批量添加 -->
      <div class="sticky-card">
        <h3 class="card-title">🎯 景点选择</h3>
        <div class="hint-row">从预设景点中勾选（或后续对接搜索API）</div>
        <div class="poi-check-list">
          <label v-for="p in availablePois" :key="p.id" class="poi-check-item">
            <input type="checkbox"
              :checked="store.multiPoiList.some(x => x.id === p.id)"
              @change="togglePoi(p)" />
            <span class="poi-name">{{ p.name }}</span>
            <span class="poi-crowd">👥{{ p.crowdIndex }}</span>
          </label>
        </div>
        <div v-if="store.multiPoiList.length" class="add-btn-row">
          <button class="btn-secondary" style="flex:1;" @click="store.clearMultiPoi()">🗑️ 清空</button>
        </div>
      </div>

      <!-- 排序模式 -->
      <div class="sticky-card">
        <h3 class="card-title">🔢 游览顺序</h3>
        <div class="mode-switch">
          <button class="mode-btn" :class="{active: sortMode==='tsp'}" @click="sortMode='tsp'">🤖 TSP 自动优化</button>
          <button class="mode-btn" :class="{active: sortMode==='manual'}" @click="sortMode='manual'">✋ 手动拖拽排序</button>
        </div>
        <div v-if="sortMode==='manual'" class="hint-row" style="margin-top:8px;">
          💡 规划结果出来后，右侧 Tab1 可拖拽调整顺序
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

    <!-- ========== 右侧双Tab结果 ========== -->
    <aside class="plan-right">
      <div class="right-tabs">
        <button class="tab-btn" :class="{active: rightTab==='list'}" @click="rightTab='list'">📋 景点序列</button>
        <button class="tab-btn" :class="{active: rightTab==='journal'}" @click="rightTab='journal'">📖 路线预览</button>
      </div>

      <!-- Tab1：可拖拽景点列表 -->
      <div v-if="rightTab==='list'" class="right-content">
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
          <!-- 🔴 后续对接 vuedraggable 拖拽排序 -->
          <ol class="spot-list draggable">
            <li v-for="(sp, i) in s.spotList" :key="sp.spotId">
              <span class="spot-idx">{{ i+1 }}</span>
              <span class="spot-name">{{ sp.name }}</span>
              <span class="spot-stay">停留{{ sp.stayMinutes }}min</span>
            </li>
          </ol>
        </div>
      </div>

      <!-- Tab2：手账预览 -->
      <div v-else class="right-content">
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
import { ref, watch } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
import { useGlobalStore } from '@/store'
import { routeApi } from '@/api/route'
import { mockPois } from '@/data/mockPois'

const store = useGlobalStore()
const mapRef = ref(null)
const availablePois = ref(mockPois)

const sortMode = ref('tsp')
const travelMode = ref('walk')
const timeLimit = ref(240)
const blockedSel = ref('')
const rightTab = ref('list')
const loading = ref(false)
const schemeList = ref([])

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
  if (list.length && !store.currentSchemeId) store.setCurrentScheme(list[0].schemeId)
  if (!list.length) return
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
      mode: travelMode.value,
      blockedSegmentId: blockedSel.value || null
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

.poi-check-list { max-height:160px; overflow-y:auto; }
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
}
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