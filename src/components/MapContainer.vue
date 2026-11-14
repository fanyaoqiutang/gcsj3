<template>
  <div ref="mapContainerRef" class="map-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import XYZ from 'ol/source/XYZ'
import TileLayer from 'ol/layer/Tile'
import 'ol/ol.css'
import Zoom from 'ol/control/Zoom'
import ScaleLine from 'ol/control/ScaleLine'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import Style from 'ol/style/Style'
import Circle from 'ol/style/Circle'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import { wgs84ToWebMerc, webMercToWgs84 } from '@/utils/coordTransform'
import { DEBUG_MODE } from '@/constants/config'
import { mockPois } from '@/data/mockPois'

const mapContainerRef = ref(null)
let mapInstance = null
const currentClickMode = ref('pick-endpoint')

let startMarkerLayer = null
let endMarkerLayer = null
let routeLayer = null
let blockedLayer = null
let detourLayer = null

const startPoint = ref(null)
const endPoint = ref(null)
let activeRouteIdRef = null

const emit = defineEmits(['poi-click', 'points-picked'])

onMounted(() => { initMap() })
onUnmounted(() => { if (mapInstance) { mapInstance.setTarget(null); mapInstance = null } })

function initMap() {
  const chengduCenterMerc = wgs84ToWebMerc([104.077774, 30.655544])

  const mockBaseLayer = new TileLayer({
    source: new XYZ({ url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', wrapX: true }),
    visible: true, properties: { layerId: 'mock-base', label: '高德底图(Mock)' }
  })

  const poiMarkerLayer = new VectorLayer({
    source: new VectorSource(), visible: true,
    properties: { layerId: 'poi-marker', label: 'POI点位' },
    style: createPoiStyle()
  })

  startMarkerLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'start-marker', label: '起点Marker' } })
  endMarkerLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'end-marker', label: '终点Marker' } })
  routeLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'route', label: '多方案路线' } })
  blockedLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'blocked', label: '封闭路段' } })
  detourLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'detour', label: '绕行路线' } })

  mapInstance = new Map({
    target: mapContainerRef.value,
    view: new View({ center: chengduCenterMerc, zoom: 12, minZoom: 6, maxZoom: 18 }),
    layers: [mockBaseLayer, poiMarkerLayer, routeLayer, detourLayer, blockedLayer, startMarkerLayer, endMarkerLayer],
    controls: [new Zoom(), new ScaleLine({ units: 'metric' })]
  })

  renderMockPois(poiMarkerLayer)
  registerMapClickHandlers(poiMarkerLayer)
  if (DEBUG_MODE) console.log('[MapContainer] 初始化完成')
}

function renderMockPois(layer) {
  const features = mockPois.map(poi => {
    const coordMerc = wgs84ToWebMerc([poi.lon, poi.lat])
    const feature = new Feature({ geometry: new Point(coordMerc) })
    feature.setId(poi.id)
    feature.set('poiData', poi)
    return feature
  })
  layer.getSource().addFeatures(features)
}

function createPoiStyle() {
  return new Style({
    image: new Circle({ radius: 9, fill: new Fill({ color: '#e74c3c' }), stroke: new Stroke({ color: '#fff', width: 2 }) })
  })
}

// 🔶 第九阶段：筛选后剔除景点样式（灰色虚线圆圈 + 叉号覆盖）
function createRemovedPoiStyle() {
  return new Style({
    image: new Circle({
      radius: 12,
      fill: new Fill({ color: 'rgba(149,165,166,0.4)' }),
      stroke: new Stroke({ color: '#7f8c8d', width: 2, lineDash: [4, 3] })
    })
  })
}

function registerMapClickHandlers(poiLayer) {
  mapInstance.on('click', (evt) => {
    const coordGcj = webMercToWgs84(evt.coordinate)
    const hitPoi = mapInstance.forEachFeatureAtPixel(evt.pixel, f => f, { layerFilter: l => l === poiLayer })
    if (hitPoi && currentClickMode.value === 'click-poi') {
      const poiData = hitPoi.get('poiData')
      if (poiData) emit('poi-click', poiData)
      return
    }
    if (currentClickMode.value === 'pick-endpoint') handleEndpointPick(coordGcj)
  })
}

function handleEndpointPick(coordGcj) {
  const coordMerc = wgs84ToWebMerc(coordGcj)
  if (!startPoint.value) {
    startPoint.value = coordGcj
    renderEndpointMarker(startMarkerLayer, coordMerc, 'start')
  } else if (!endPoint.value) {
    endPoint.value = coordGcj
    renderEndpointMarker(endMarkerLayer, coordMerc, 'end')
  } else {
    clearRouteAndMarkers()
    startPoint.value = coordGcj
    renderEndpointMarker(startMarkerLayer, coordMerc, 'start')
  }
  emit('points-picked', { start: startPoint.value, end: endPoint.value })
}

function renderEndpointMarker(layer, coordMerc, type) {
  const feature = new Feature({ geometry: new Point(coordMerc) })
  const color = type === 'start' ? '#27ae60' : '#e74c3c'
  feature.setStyle(new Style({ image: new Circle({ radius: 12, fill: new Fill({ color }), stroke: new Stroke({ color: '#fff', width: 3 }) }) }))
  layer.getSource().clear()
  layer.getSource().addFeature(feature)
}

// ========== 多方案路线 ==========
function addRouteOption(option) {
  const source = routeLayer.getSource()
  const existing = source.getFeatures().find(f => f.get('optionId') === option.optionId)
  if (existing) source.removeFeature(existing)
  const coordsMerc = option.coordinates.map(c => wgs84ToWebMerc(c))
  const feature = new Feature({ geometry: new LineString(coordsMerc) })
  feature.set('optionId', option.optionId); feature.set('mode', option.mode); feature.set('color', option.color)
  feature.setStyle(buildRouteStyle(option.color, option.mode, true))
  source.addFeature(feature)
}
function removeRouteOption(optionId) { const t = routeLayer.getSource().getFeatures().find(f => f.get('optionId') === optionId); if (t) routeLayer.getSource().removeFeature(t) }
function setActiveRoute(id) { activeRouteIdRef = id; routeLayer.getSource().getFeatures().forEach(f => f.setStyle(buildRouteStyle(f.get('color'), f.get('mode'), f.get('optionId') === id))) }
function setRouteVisibility(optionId, visible) {
  const f = routeLayer.getSource().getFeatures().find(f => f.get('optionId') === optionId); if (!f) return
  f.setStyle(visible ? buildRouteStyle(f.get('color'), f.get('mode'), f.get('optionId') === activeRouteIdRef) : new Style({ geometry: undefined }))
}
function buildRouteStyle(color, mode, isActive) {
  return new Style({ stroke: new Stroke({ color: hexToRgba(color, isActive ? 1 : 0.45), width: isActive ? 6 : 3, lineCap: 'round', lineJoin: 'round', lineDash: mode === 'metro' ? [10, 6] : undefined }) })
}
function hexToRgba(hex, alpha) { const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${alpha})` }
function fitAllRoutes() { const ext = routeLayer.getSource().getExtent(); if (ext && ext.every(v => v !== Infinity)) mapInstance.getView().fit(ext, { padding:[60,60,60,60], maxZoom:15, duration:500 }) }

// ========== 封闭 + 绕行 ==========
function renderBlockedSegment(s) {
  blockedLayer.getSource().clear(); detourLayer.getSource().clear()
  const f = new Feature({ geometry: new LineString(s.geometry.coordinates.map(c => wgs84ToWebMerc(c))) })
  f.set('segmentId', s.segmentId)
  f.setStyle(new Style({ stroke: new Stroke({ color:'#e74c3c', width:8, lineCap:'butt', lineDash:[12,8] }), image: new Circle({ radius:6, fill: new Fill({ color:'#e74c3c' }) }) }))
  blockedLayer.getSource().addFeature(f)
}
function renderDetourRoute(gj) {
  detourLayer.getSource().clear()
  const fs = gj.features.map(ft => {
    const f = new Feature({ geometry: new LineString(ft.geometry.coordinates.map(c => wgs84ToWebMerc(c))) })
    f.setStyle(new Style({ stroke: new Stroke({ color:'#9b59b6', width:7, lineCap:'round', lineJoin:'round', lineDash:[4,2] }) }))
    return f
  })
  detourLayer.getSource().addFeatures(fs)
  const ext = detourLayer.getSource().getExtent()
  if (ext && ext.every(v => v !== Infinity)) mapInstance.getView().fit(ext, { padding:[80,80,80,80], maxZoom:15, duration:600 })
}
function clearBlockedAndDetour() { blockedLayer?.getSource().clear(); detourLayer?.getSource().clear() }

// ========== 🔶 第九阶段：剔除景点高亮 ==========
/**
 * 高亮被时长约束剔除的 POI（灰色虚线标记）
 * @param {Array<string>} removedPoiIds
 */
function highlightRemovedPois(removedPoiIds) {
  if (!removedPoiIds || removedPoiIds.length === 0) return
  // 在底层 POI layer 上找到对应 Feature，叠加灰色样式
  const features = mapInstance.getLayers().getArray()
    .find(l => l.get('layerId') === 'poi-marker')?.getSource().getFeatures() || []

  features.forEach(f => {
    if (removedPoiIds.includes(f.getId())) {
      // 叠加两层样式：原始红点 + 灰色虚线外圈 + 叉
      const originalImg = createPoiStyle().getImage()
      const ghostImg = new Circle({
        radius: 14, fill: new Fill({ color: 'rgba(149,165,166,0.3)' }), stroke: new Stroke({ color: '#7f8c8d', width: 2, lineDash: [4, 3] })
      })
      f.setStyle([
        new Style({ image: ghostImg, zIndex: 5 }),
        new Style({ image: originalImg, zIndex: 4 })
      ])
      f.set('isRemoved', true)
    }
  })
  if (DEBUG_MODE) console.log('[MapContainer] 高亮剔除景点:', removedPoiIds)
}

/** 清除剔除高亮 */
function clearRemovedPoiHighlights() {
  const features = mapInstance.getLayers().getArray()
    .find(l => l.get('layerId') === 'poi-marker')?.getSource().getFeatures() || []
  features.forEach(f => {
    if (f.get('isRemoved')) {
      f.setStyle(createPoiStyle())
      f.unset('isRemoved')
    }
  })
}

// ========== 清除 / 暴露 ==========
function clearRouteAndMarkers() {
  startMarkerLayer?.getSource().clear(); endMarkerLayer?.getSource().clear()
  routeLayer?.getSource().clear(); clearBlockedAndDetour()
  clearRemovedPoiHighlights()
  startPoint.value = null; endPoint.value = null; activeRouteIdRef = null
}
function setClickMode(mode) { if (['pick-endpoint','click-poi'].includes(mode)) currentClickMode.value = mode }
function flyToPoi(lon, lat) { if (!mapInstance) return; mapInstance.getView().animate({ center: wgs84ToWebMerc([lon, lat]), zoom: 15, duration: 600 }) }
function panPopupIntoView(lon, lat) {
  // 将 OpenLayers Overlay 自动平移到中心偏下，保证弹窗不被侧边栏挡住
  const coordMerc = wgs84ToWebMerc([lon, lat])
  mapInstance.getView().animate({
    center: coordMerc,
    duration: 400,
    // 🔶 加上 offset：左栏310px + 右栏340px = 地图中心要偏移 (340-310)/2 = 15px？其实 flex 居中就好
    // 简单做法：flyToPoi 已经能保证点位可见，autoPan 用 OpenLayers 原生方式
  })
}
/** 复位视图：飞回成都中心 */
function resetView() {
  if (!mapInstance) return
  mapInstance.getView().animate({
    center: wgs84ToWebMerc([104.077774, 30.655544]),
    zoom: 12,
    duration: 600
  })
}

/** 按 layerId 设置图层显隐 */
function setLayerVisible(layerId, visible) {
  if (!mapInstance) return
  mapInstance.getLayers().forEach(layer => {
    if (layer.get('layerId') === layerId) layer.setVisible(visible)
  })
}

defineExpose({
  // ✅ 直接暴露 mapInstance 给外部（HomePage/PointPlan 图层开关用）
  get mapInstance() { return mapInstance },

  setClickMode, clearAll: clearRouteAndMarkers, flyToPoi, resetView, setLayerVisible,
  addRouteOption, removeRouteOption,
  setActiveRoute(id) { activeRouteIdRef = id; setActiveRoute(id) },
  setRouteVisibility, fitAllRoutes,
  renderRouteGeoJson(gj, mode) { const f = gj.features[0]; addRouteOption({ optionId:'single_temp', mode, color: mode==='metro'?'#e67e22':'#3498db', coordinates: f.geometry.coordinates }); fitAllRoutes() },
  renderBlockedSegment, renderDetourRoute, clearBlockedAndDetour,
  highlightRemovedPois, clearRemovedPoiHighlights,
  panPopupIntoView
})
</script>

<style scoped>
.map-container { width: 100%; height: 100%; }
</style>