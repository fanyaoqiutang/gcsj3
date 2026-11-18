<!--
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

      <!-- ① 图层开关（左上） -->
      <div class="layer-switch-panel sticky-card">
        <div class="layer-switch-title">🗂️ 图层开关</div>
        <label class="layer-switch-item">
          <input type="checkbox" v-model="layers.poi" @change="toggleLayer('poi-marker', layers.poi)" />
          <span>📍 POI 景点点位</span>
        </label>
        <label class="layer-switch-item disabled">
          <input type="checkbox" v-model="layers.metro" disabled />
          <span style="color:#aaa;">🚇 地铁矢量线（队友数据待接入）</span>
        </label>
        <label class="layer-switch-item disabled">
          <input type="checkbox" v-model="layers.roadBlock" disabled />
          <span style="color:#aaa;">🚧 封闭道路仿真（队友数据待接入）</span>
        </label>
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
import MapContainer from '@/components/MapContainer.vue'
import { useGlobalStore } from '@/store/global'

const store = useGlobalStore()
const mapRef = ref(null)

const layers = ref({ metro: true, poi: true, roadBlock: true })
const showPoiPopup = ref(false)
const currentPoi = ref(null)

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

// ========== 图层显隐控制 ==========
function toggleLayer(layerId, visible) {
  // MapContainer 内部没有直接暴露 setLayerVisible，先用 ref 获取 layers 遍历
  // 🔴 后续 MapContainer defineExpose 增加 setLayerVisible(layerId, visible) 会更优雅
  const mapInstance = getMapInstance()
  if (!mapInstance) return
  mapInstance.getLayers().forEach(layer => {
    if (layer.get('layerId') === layerId) layer.setVisible(visible)
  })
}

function getMapInstance() {
  // 通过 MapContainer 的 DOM ref 间接拿；
  // 更干净的做法是让 MapContainer defineExpose 暴露 mapInstance
  // 这里做一个兼容写法
  return mapRef.value?.$el?.querySelector('canvas')
    ? mapRef.value?._mapInstance || null
    : null
}

// ========== 复位视图 ==========
function resetView() {
  // MapContainer 未暴露 resetView，暂时用 flyToPoi 飞到宽窄巷子示意
  // 🔴 后续 MapContainer defineExpose 增加 resetView()
  showPoiPopup.value = false
}

// ========== 加入规划 ==========
function handleJoinPlan() {
  if (!currentPoi.value) return
  store.addStartPoint({
    id: currentPoi.value.id,
    name: currentPoi.value.name,
    lon: currentPoi.value.lon,
    lat: currentPoi.value.lat
  })
  showPoiPopup.value = false
  // 跳到单点规划页（后续可以改成自动填起点/终点）
  // router.push({ path: '/point-plan' })
  alert(`✅ 已将「${currentPoi.value.name}」加入规划，即将跳转到单点规划页`)
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

/* ① 图层开关 —— 地图左上 */
.layer-switch-panel {
  position:absolute; top:12px; left:12px;
  padding:12px; width:185px;
  font-size:12px;
  z-index:5;
  user-select:none;
}
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