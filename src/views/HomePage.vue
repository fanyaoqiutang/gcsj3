﻿﻿﻿﻿<!--
  【页面 1：首页 / 地图总览 · 严格对齐总体设计文档】
  图层（由底至上）：基础底图 → 成都地铁矢量线路 → POI 景点点位 → 动态路网仿真（红色封闭路段）
  交互：POI 点击 → 便利贴弹窗（名称/简介/图片URL/人流指数/停留时长）+ 加入规划
  控件：缩放、复位、图层开关（地铁/POI/封闭仿真 独立开关）
-->
<template>
  <div class="page-home">

    <!-- ========== 地图容器（所有悬浮控件都在里面） ========== -->
    <div class="home-map-area">

      <!-- ✅ 真实 OpenLayers 地图组件（高德瓦片底图 + POI markers） -->
      <MapContainer
        ref="mapRef"
        @poi-click="onPoiClick"
      />

      <!-- ========== 悬浮控件层（全部 absolute 脱离文档流） ========== -->

      <!-- ① 左上 Tab 容器：图层工具 / 景点库 / 宝藏路线 -->
      <div class="home-tab-panel sticky-card">
        <!-- Tab 头部 -->
        <div class="home-tab-header">
          <button
            v-for="t in homeTabs"
            :key="t.key"
            class="home-tab-btn"
            :class="{ active: store.currentHomeTab === t.key }"
            @click="store.setCurrentHomeTab(t.key)"
          >{{ t.label }}</button>
        </div>

        <!-- Tab1：图层工具（GeoServer WMS 全图层开关） -->
        <div v-show="store.currentHomeTab === 'layer'" class="home-tab-body">
          <div class="layer-switch-title">🗂️ 图层开关</div>
          <label class="layer-switch-item">
            <input type="checkbox" v-model="layers.walkRoad" @change="toggleLayer('gs-walk-road', layers.walkRoad)" />
            <span>🚶 步行路网</span>
          </label>
          <label class="layer-switch-item">
            <input type="checkbox" v-model="layers.metroLine" @change="toggleLayer('gs-subway-line', layers.metroLine)" />
            <span>🚇 地铁线路</span>
          </label>
          <label class="layer-switch-item">
            <input type="checkbox" v-model="layers.metroStation" @change="toggleLayer('gs-subway-station', layers.metroStation)" />
            <span>🚉 地铁站点</span>
          </label>
          <label class="layer-switch-item">
            <input type="checkbox" v-model="layers.scenicPoint" @change="toggleLayer('gs-scenic-point', layers.scenicPoint)" />
            <span>🏛️ 景点点位（含中文标注）</span>
          </label>
          <label class="layer-switch-item">
            <input type="checkbox" v-model="layers.poi" @change="toggleLayer('poi-marker', layers.poi)" />
            <span>📍 POI 交互层（hover/点击）</span>
          </label>
        </div>

        <!-- Tab2：景点库（占位空壳） -->
        <div v-show="store.currentHomeTab === 'poi'" class="home-tab-body">
        </div>

        <!-- Tab3：宝藏路线 -->
        <div v-show="store.currentHomeTab === 'route'" class="home-tab-body tr-body">
          <TreasureRoutes />
        </div>
      </div>

      <!-- ② 缩放/复位控件（右上，原生 OpenLayers Zoom 已存在于地图内部；这里只保留复位按钮） -->
      <div class="map-controls">
        <button class="ctrl-btn" title="复位到成都" @click="resetView">⟳</button>
      </div>

      <!-- ③ 欢迎便利贴（右上，在缩放控件左边） -->
      <div class="home-welcome sticky-card">
        <h2>🗺️ 蓉城游踪</h2>
        <p class="welcome-sub">专为 Dijkstra / A* 算法对照实验设计的可视化平台。</p>
        <div class="welcome-btns">
          <router-link to="/point-plan" class="btn-primary">📍 单点规划</router-link>
          <router-link to="/multi-spot-plan" class="btn-secondary">🎯 多景点</router-link>
        </div>
        <div class="welcome-tip">💡 开启右上角「🛠️调试」进入开发者页</div>
      </div>

      <!-- ④ POI 便利贴弹窗（右下，点击地图上的红色点位后弹出） -->
      <div v-if="showPoiPopup" class="poi-popup sticky-card">
        <button class="popup-close" @click="showPoiPopup=false">✕</button>
        <img v-if="currentPoi?.imageUrl" :src="currentPoi.imageUrl" class="poi-img" />
        <h3>{{ currentPoi?.name }}</h3>
        <p class="poi-desc">{{ currentPoi?.description }}</p>
        <div class="poi-meta">
          <span>👥 人流 {{ currentPoi?.crowdIndex }}/5</span>
          <span>⏱️ 停留 {{ currentPoi?.stayDuration }}min</span>
        </div>
        <button class="btn-primary popup-join" @click="handleJoinPlan()">📍 加入规划</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MapContainer from '@/components/MapContainer.vue'
import TreasureRoutes from '@/components/TreasureRoutes.vue'
import { useGlobalStore } from '@/store'

const router = useRouter()

const store = useGlobalStore()
const mapRef = ref(null)

const layers = ref({ walkRoad: true, metroLine: true, metroStation: true, scenicPoint: true, poi: true })
const showPoiPopup = ref(false)
const currentPoi = ref(null)

const homeTabs = [
  { key: 'layer', label: '🗂️ 图层工具' },
  { key: 'poi',   label: '📖 景点库' },
  { key: 'route', label: '🧭 宝藏路线' }
]

// ========== 首页初始化 ==========
onMounted(() => {
  // 让 MapContainer 进入「只响应 POI 点击」模式
  // MapContainer 默认 clickMode 是 'pick-endpoint'（拾取起终点），
  // 首页不需要拾取，只需要点 POI 弹便利贴
  mapRef.value?.setClickMode?.('click-poi')
})

// ========== POI 点击事件 ==========
function onPoiClick(poiData) {
  currentPoi.value = poiData
  showPoiPopup.value = true
}

// ========== 图层显隐控制（MapContainer 已 defineExpose setLayerVisible） ==========
function toggleLayer(layerId, visible) {
  mapRef.value?.setLayerVisible(layerId, visible)
}

// ========== 复位视图 ==========
function resetView() {
  showPoiPopup.value = false
  mapRef.value?.resetView?.()
}

// ========== 加入规划（设为起点 + 跳转单点规划页） ==========
function handleJoinPlan() {
  if (!currentPoi.value) return
  store.setSelectedStart([currentPoi.value.lon, currentPoi.value.lat])
  showPoiPopup.value = false
  router.push({ path: '/point-plan' })
}
</script>

<style scoped>
/* ========== 页面容器：flex 只有 1 个直接子元素（地图） ========== */
.page-home {
  width:100%; height:100%;
  padding:16px;  /* 外边距，让地图有呼吸空间 */
}

/* ========== 地图容器：占满，position:relative 作为所有悬浮控件的定位基准 ========== */
.home-map-area {
  width:100%; height:100%;
  background:var(--color-card);
  border:1px solid var(--color-border);
  border-radius:var(--radius-card);
  position:relative;   /* ✅ 所有悬浮控件的定位参照 */
  overflow:hidden;
}

/* 占位内容（后续被 MapContainer 替换） */
.map-placeholder { width:100%; height:100%; }

/* =======================================================
   悬浮控件层（全部 position:absolute，脱离文档流）
   z-index 层级：图层开关(5) < 缩放控件(6) < 欢迎卡片(10) < POI弹窗(20)
   ======================================================= */

/* ① Tab 容器 —— 地图左上（替换原 .layer-switch-panel） */
.home-tab-panel {
  position:absolute; top:12px; left:12px;
  width:210px;
  font-size:12px;
  z-index:5;
  user-select:none;
  padding:0;
}
.home-tab-header {
  display:flex; border-bottom:1px solid var(--color-border); flex-shrink:0;
}
.home-tab-btn {
  flex:1; padding:8px 4px; border:none; background:transparent;
  font-size:11px; cursor:pointer; color:#888;
  border-bottom:2px solid transparent; transition:all 0.15s;
  white-space:nowrap;
}
.home-tab-btn:hover { color:var(--color-primary); }
.home-tab-btn.active {
  color:var(--color-primary); font-weight:600;
  border-bottom-color:var(--color-primary);
  background:var(--color-tab-bg);
}
.home-tab-body { padding:12px; }
.home-tab-body.tr-body { flex:1; overflow:hidden; display:flex; padding-top:10px; }
.home-tab-body.tr-body > :deep(.tr-container) { flex:1; min-height:0; }

/* Tab1 内部：图层开关（原样式保留，类名不变） */
.layer-switch-title {
  font-weight:600; color:var(--color-primary); font-size:12px;
  margin-bottom:8px; padding-bottom:4px;
  border-bottom:1px dashed var(--color-border);
}
.layer-switch-item {
  display:flex; align-items:center; gap:6px;
  padding:3px 0; cursor:pointer; color:#555;
}
.layer-switch-item input { accent-color: var(--color-primary); }
.layer-switch-item.disabled { color:#bbb; cursor:not-allowed; }
.layer-switch-item.disabled input { cursor:not-allowed; opacity:0.5; }

/* ② 缩放/复位 —— 地图最右上 */
.map-controls {
  position:absolute; top:12px; right:12px;
  display:flex; flex-direction:column; gap:2px;
  z-index:6;
}
.ctrl-btn {
  width:32px; height:32px;
  border:1px solid var(--color-border); background:#fff;
  cursor:pointer; font-size:16px; font-weight:700;
  border-radius:2px; color:var(--color-text);
}
.ctrl-btn:hover { background:var(--color-tab-bg); }

/* ③ 欢迎便利贴 —— 右上（在缩放控件左边） */
.home-welcome {
  position:absolute; top:12px; right:56px;
  width:230px; padding:14px 16px;
  z-index:10;
}
.home-welcome h2 {
  color:var(--color-primary); font-size:16px; font-weight:700;
  margin:0 0 6px;
}
.welcome-sub {
  color:var(--color-text-sub); font-size:12px; line-height:1.6;
  margin:0 0 12px;
}
.welcome-btns { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
.welcome-btns a { display:block; padding:8px; text-align:center; font-size:12px; text-decoration:none; border-radius:var(--radius-btn); }
.welcome-btns .btn-primary { background:var(--color-primary); color:#fff; }
.welcome-btns .btn-secondary { background:var(--color-btn-sec-bg); color:var(--color-text); border:1px solid var(--color-btn-sec-border); }
.welcome-tip {
  font-size:11px; color:#999; line-height:1.5;
  padding-top:8px; border-top:1px dashed var(--color-border);
  margin:0;
}

/* ④ POI 便利贴弹窗 —— 右下 */
.poi-popup {
  position:absolute; bottom:16px; right:16px;
  width:280px; z-index:20;
  padding:14px;
}
.popup-close {
  position:absolute; top:6px; right:8px;
  border:none; background:transparent;
  cursor:pointer; font-size:14px; color:#aaa;
}
.popup-close:hover { color:#e74c3c; }
.poi-img {
  width:100%; height:120px; object-fit:cover;
  border-radius:2px; margin-bottom:6px;
}
.poi-popup h3 {
  color:var(--color-primary); font-size:14px; font-weight:700;
  margin:4px 0 6px;
}
.poi-desc { font-size:12px; color:#555; line-height:1.6; margin:0 0 8px; }
.poi-meta { font-size:11px; color:#888; display:flex; gap:12px; margin-bottom:10px; }
.popup-join { width:100%; padding:8px; }
</style>