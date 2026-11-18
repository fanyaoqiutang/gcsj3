// =======================================================
// 【Pinia 全局状态管理 · v2 扩展】
// 持久化开关（localStorage）：isDebugMode、isSelectPointMode
// 临时业务状态（刷新清空）：selectedStart/End、multiPoiList、blockedSegmentId、currentSchemeId
//
// 关键约束：
//   · 关闭选点模式 → 自动清空起终点
//   · 所有业务页面通过 store 同步状态，方案切换时地图/列表/预览自动联动
// =======================================================

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { mockBlockedSegments } from '@/data/mockDetour'

const LS_KEYS = {
  DEBUG:  'travelmap:isDebugMode',
  SELECT: 'travelmap:isSelectPointMode'
}
function loadLS(key, fb) { try { const v = localStorage.getItem(key); return v === null ? fb : JSON.parse(v) } catch { return fb } }

export const useGlobalStore = defineStore('global', () => {

  // ---------- 持久化开关 ----------
  const isDebugMode       = ref(loadLS(LS_KEYS.DEBUG, false))
  const isSelectPointMode = ref(loadLS(LS_KEYS.SELECT, false))

  // ---------- 起终点 ----------
  const selectedStart = ref(null)   // [lon, lat] | null
  const selectedEnd   = ref(null)

  // ---------- 多景点列表 ----------
  const multiPoiList = ref([])      // [{ id, name, lon, lat, stayMinutes }, ...]

  // ---------- 动态路网仿真 ----------
  const blockedSegmentId = ref(null) // 当前选中的封闭道路ID
  const blockedSegments  = ref(mockBlockedSegments) // 可选封闭路段字典

  // ---------- 方案切换 ----------
  const currentSchemeId = ref(null) // 当前高亮方案（用于地图图层/列表/预览同步）

  // ---------- 持久化 watch ----------
  watch(isDebugMode,       v => localStorage.setItem(LS_KEYS.DEBUG,  JSON.stringify(v)))
  watch(isSelectPointMode, v => localStorage.setItem(LS_KEYS.SELECT, JSON.stringify(v)))
  watch(isSelectPointMode, v => { if (!v) { selectedStart.value = null; selectedEnd.value = null } })

  // ---------- Actions：开关 ----------
  const toggleDebug       = () => isDebugMode.value = !isDebugMode.value
  const toggleSelectPoint = () => isSelectPointMode.value = !isSelectPointMode.value

  // ---------- Actions：起终点 ----------
  const setSelectedStart = c => selectedStart.value = c
  const setSelectedEnd   = c => selectedEnd.value   = c
  const clearEndpoints   = () => { selectedStart.value = null; selectedEnd.value = null }

  // ---------- Actions：多景点 ----------
  const addMultiPoi = p => { if (!multiPoiList.value.find(x => x.id === p.id)) multiPoiList.value.push({ stayMinutes: 30, ...p }) }
  const removeMultiPoi = id => { multiPoiList.value = multiPoiList.value.filter(p => p.id !== id) }
  const updateMultiPoiStay = (id, minutes) => {
    const p = multiPoiList.value.find(x => x.id === id); if (p) p.stayMinutes = minutes
  }
  const clearMultiPoi = () => { multiPoiList.value = [] }

  // ---------- Actions：封闭道路 ----------
  const setBlockedSegment = id => { blockedSegmentId.value = id }
  const clearBlockedSegment = () => { blockedSegmentId.value = null }

  // ---------- Actions：方案切换 ----------
  const setCurrentScheme = id => { currentSchemeId.value = id }
  const clearCurrentScheme = () => { currentSchemeId.value = null }

  // ---------- Helpers ----------
  const shouldPickEndpoint = () => isSelectPointMode.value
  const hasBothEndpoints   = () => !!(selectedStart.value && selectedEnd.value)
  const getBlockedSegment  = () => blockedSegments.value.find(s => s.segmentId === blockedSegmentId.value) || null
  const getMultiPoiCoords  = () => multiPoiList.value.map(p => [p.lon, p.lat])

  return {
    isDebugMode, isSelectPointMode,
    selectedStart, selectedEnd,
    multiPoiList,
    blockedSegmentId, blockedSegments,
    currentSchemeId,
    toggleDebug, toggleSelectPoint,
    setSelectedStart, setSelectedEnd, clearEndpoints,
    addMultiPoi, removeMultiPoi, updateMultiPoiStay, clearMultiPoi,
    setBlockedSegment, clearBlockedSegment, getBlockedSegment,
    setCurrentScheme, clearCurrentScheme,
    shouldPickEndpoint, hasBothEndpoints, getMultiPoiCoords
  }
})