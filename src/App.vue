<template>
  <AppLayout>
    <!-- ========== 左侧：规划面板 ========== -->
    <template #left-top>
      <RoutePlanner ref="routePlannerRef"
        :start-point="startPoint" :end-point="endPoint"
        @clear-points="handleClearPoints" @plan-route="handlePlanRoute"
        @apply-budget="handleApplyBudget" @undo-budget="handleUndoBudget" />
    </template>

    <template #left-bottom>
      <RouteOptionsPanel
        :options="routeOptions" :active-option-id="activeRouteOptionId"
        @select="handleOptionSelect" @visibility-change="handleVisibilityChange"
        @trigger-block="handleTriggerBlock" @clear-block="handleClearBlock" />
    </template>

    <!-- ========== 中间：地图 ========== -->
    <template #map>
      <MapContainer ref="mapContainerRef" @poi-click="handlePoiClick" @points-picked="handlePointsPicked" />

      <!-- PoiPopup 悬浮在地图上方（相对 map-area 定位） -->
      <PoiPopup :poi-data="currentPoi" :visible="popupVisible" :itinerary="itinerary"
        @close="closePopup" @add-to-itinerary="handleAddPoiToItinerary" />
    </template>

    <!-- ========== 右侧：日程 + 攻略 ========== -->
    <template #right>
      <ItineraryPanel :itinerary="itinerary"
        @poi-locate="handlePoiLocate" @itinerary-change="handleItineraryChange" @redraw-route="handleRedrawRoute" />

      <!-- 第十阶段已开发，保留在右侧栏 -->
      <GuidePanel @budget-change="() => {}" @packing-change="() => {}" />
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { DEBUG_MODE } from '@/constants/config'
import AppLayout from '@/layout/AppLayout.vue'
import MapContainer from '@/components/MapContainer.vue'
import RoutePlanner from '@/components/RoutePlanner.vue'
import PoiPopup from '@/components/PoiPopup.vue'
import ItineraryPanel from '@/components/ItineraryPanel.vue'
import RouteOptionsPanel from '@/components/RouteOptionsPanel.vue'
import GuidePanel from '@/components/GuidePanel.vue'

import { mockItinerary } from '@/data/mockItinerary'
import { mockPois } from '@/data/mockPois'
import { generateMockMultiPoiRoute } from '@/data/mockRoutes'
import { mockRouteOptions } from '@/data/mockRouteOptions'
import { mockBlockedSegments, getDetourRoute } from '@/data/mockDetour'
import { mockTimeBudgetFilter } from '@/data/mockTimeBudget'

const mapContainerRef = ref(null)
const routePlannerRef = ref(null)

// 状态
const itinerary = ref(JSON.parse(JSON.stringify(mockItinerary)))
const startPoint = ref(null); const endPoint = ref(null)
const popupVisible = ref(false); const currentPoi = ref(null)
const routeOptions = ref([]); const activeRouteOptionId = ref(null)

onMounted(() => {
  routeOptions.value = mockRouteOptions
  routeOptions.value.forEach(opt => mapContainerRef.value?.addRouteOption(opt))
  if (routeOptions.value.length > 0) handleOptionSelect(routeOptions.value[0])
  mapContainerRef.value?.fitAllRoutes()
  if (DEBUG_MODE) console.log('[App] 布局重构完成，所有组件挂载 OK')
})

// ===== POI 弹窗 =====
function handlePoiClick(poiData) {
  currentPoi.value = poiData
  popupVisible.value = true
  // 🔶 autoPan：让 OpenLayers Overlay 自动平移地图保证弹窗可见
  mapContainerRef.value?.panPopupIntoView(poiData.lon, poiData.lat)
}
function closePopup() { popupVisible.value = false; currentPoi.value = null }
function handleAddPoiToItinerary({ poiData, targetDay }) {
  let dayIdx
  if (targetDay === 'new') {
    itinerary.value.push({ day: itinerary.value.length + 1, dateLabel: `Day ${itinerary.value.length + 1} · 新行程`, spots: [{ poiId: poiData.id, order: 1, note: '待定' }] })
    dayIdx = itinerary.value.length - 1
  } else {
    dayIdx = itinerary.value.findIndex(d => d.day === Number(targetDay))
    if (dayIdx >= 0) itinerary.value[dayIdx].spots.push({ poiId: poiData.id, order: itinerary.value[dayIdx].spots.length + 1, note: '待定' })
  }
  closePopup(); redrawDayRoute(dayIdx)
}

// ===== 日程 ↔ 路线 =====
function handleItineraryChange({ dayIdx }) { redrawDayRoute(dayIdx) }
function handleRedrawRoute(dayIdx) { redrawDayRoute(dayIdx) }
function redrawDayRoute(dayIdx) {
  const day = itinerary.value[dayIdx]
  if (!day || day.spots.length < 2) return
  const coords = day.spots.map(s => { const poi = mockPois.find(p => p.id === s.poiId); return [poi.lon, poi.lat] })
  const geoJson = generateMockMultiPoiRoute(coords, 'walk')
  if (geoJson) mapContainerRef.value?.renderRouteGeoJson(geoJson, 'walk')
}

// ===== 起终点 / 规划 =====
function handlePointsPicked({ start, end }) { startPoint.value = start; endPoint.value = end }
function handleClearPoints() { startPoint.value = null; endPoint.value = null; mapContainerRef.value?.clearAll() }
function handlePlanRoute({ geoJson, mode }) { mapContainerRef.value?.renderRouteGeoJson(geoJson, mode) }
function handlePoiLocate({ lon, lat }) { mapContainerRef.value?.flyToPoi(lon, lat) }

// ===== 多方案 =====
function handleOptionSelect(opt) { activeRouteOptionId.value = opt.optionId; mapContainerRef.value?.setActiveRoute(opt.optionId) }
function handleVisibilityChange({ optionId, visible }) {
  mapContainerRef.value?.setRouteVisibility(optionId, visible)
  if (!visible && activeRouteOptionId.value === optionId) {
    const next = routeOptions.value.find(o => o.optionId !== optionId)
    if (next) { activeRouteOptionId.value = next.optionId; mapContainerRef.value?.setActiveRoute(next.optionId) }
    else { activeRouteOptionId.value = null; mapContainerRef.value?.setActiveRoute(null) }
  }
}

// ===== 封闭仿真 =====
function handleTriggerBlock(segmentId) {
  const segment = mockBlockedSegments.find(s => s.segmentId === segmentId); if (!segment) return
  mapContainerRef.value?.renderBlockedSegment(segment)
  const detourGeoJson = getDetourRoute(segmentId)
  if (detourGeoJson) mapContainerRef.value?.renderDetourRoute(detourGeoJson)
}
function handleClearBlock() { mapContainerRef.value?.clearBlockedAndDetour() }

// ===== 时长约束 =====
function handleApplyBudget({ timeBudget }) {
  const allPoiIds = mockPois.map(p => p.id)
  const result = mockTimeBudgetFilter(allPoiIds, mockPois, timeBudget)
  mapContainerRef.value?.highlightRemovedPois(result.removed)
  itinerary.value.forEach(day => { day.spots.forEach(spot => { spot.isRemoved = result.removed.includes(spot.poiId) }) })
  routePlannerRef.value?.setBudgetResult({ ...result.summary, removedCount: result.removed.length, keptCount: result.kept.length, savedMinutes: result.summary.savedMinutes || 0 })
  if (DEBUG_MODE) console.log('[App] 时长约束筛选:', result)
}
function handleUndoBudget() { mapContainerRef.value?.clearRemovedPoiHighlights(); itinerary.value.forEach(day => { day.spots.forEach(spot => { spot.isRemoved = false }) }) }
</script>

<style>
/* 全局重置：防止 body/html 默认 margin 导致白边 */
html, body, #app-root {
  margin: 0; padding: 0;
  width: 100%; height: 100%;
  overflow: hidden;
}
</style>
