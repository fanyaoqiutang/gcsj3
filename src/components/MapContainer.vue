﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div ref="mapContainerRef" class="map-container"></div>
</template>

<script setup>
import { useGlobalStore } from '@/store'
import { ref, onMounted, onUnmounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import ImageLayer from 'ol/layer/Image'
import ImageWMS from 'ol/source/ImageWMS'
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
import { wgs84ToWebMerc, webMercToWgs84 } from '@/utils'
import { fetchScenicPois } from '@/api/scenicPois'
import { GEOSERVER_CONFIG } from '@/config/geoserver'

const store = useGlobalStore()
const mapContainerRef = ref(null)
let mapInstance = null
const currentClickMode = ref('pick-endpoint')

let poiMarkerLayer = null    // 🎯 本地 POI hitTest 载体（透明！永不画 style）
let poiInteractionLayer = null // 🎨 顶层交互反馈层：hover 高亮/筛选淡化/剔除标记
let startMarkerLayer = null
let endMarkerLayer = null
let routeLayer = null
let blockedLayer = null
let detourLayer = null
let favMarkerLayer = null  // 🌟 收藏 POI 金色光晕层
let roamMarkerLayer = null // 🧭 路线漫游 marker
let roamMarkerFeature = null
let routeHighlightLayer = null // 📍 分段路线高亮（RouteSummary 点击节点联动）

const startPoint = ref(null)
const endPoint = ref(null)
let activeRouteIdRef = null

const emit = defineEmits(['poi-click', 'points-picked', 'poi-hover'])

onMounted(async () => {
  initMap()
  // 本地 poi-marker 图层也对齐 GeoServer WFS 数据（保持 hover/点击联动位置一致）
  const pois = await fetchScenicPois()
  renderPois(poiMarkerLayer, pois)
  // 🔴 resize 监听：窗口尺寸 / 侧边栏折叠展开时重算画布
  window.addEventListener('resize', _onWindowResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', _onWindowResize)
  if (mapInstance) { mapInstance.setTarget(null); mapInstance = null }
})
function _onWindowResize() {
  mapInstance?.updateSize()
  setTimeout(_clampViewToExtent, 100)
}

// GeoServer WMS 图层工厂
// 注意：不加 crossOrigin —— WMS 图片仅展示不需要 CORS，加了反而触发浏览器跨域检查
function createWmsLayer(layerId, layerName, label) {
  return new ImageLayer({
    source: new ImageWMS({
      url: GEOSERVER_CONFIG.WMS_URL,
      params: { LAYERS: layerName, FORMAT: 'image/png', transparent: true, VERSION: '1.3.0' },
      serverType: 'geoserver'
    }),
    visible: true,
    properties: { layerId, label }
  })
}

// 🔒 成都约束范围（全局，fit 钳制函数复用）
let _constrainedExtentMerc = null

function initMap() {
  // 视图约束范围 WGS84 → WebMerc（严格 [minLon,minLat,maxLon,maxLat]）
  const cWgs = GEOSERVER_CONFIG.EXTENT_WGS
  _constrainedExtentMerc = [
    ...wgs84ToWebMerc([cWgs[0], cWgs[1]]),
    ...wgs84ToWebMerc([cWgs[2], cWgs[3]])
  ]
  const centerMerc = wgs84ToWebMerc(GEOSERVER_CONFIG.CENTER_WGS)

  // ========== 🔴 GeoServer WMS 图层（从底到顶严格按要求顺序） ==========
  const wmsWalkRoad      = createWmsLayer('gs-walk-road',      GEOSERVER_CONFIG.LAYERS.WALK_ROAD.name,      GEOSERVER_CONFIG.LAYERS.WALK_ROAD.label)
  const wmsSubwayLine    = createWmsLayer('gs-subway-line',    GEOSERVER_CONFIG.LAYERS.SUBWAY_LINE.name,    GEOSERVER_CONFIG.LAYERS.SUBWAY_LINE.label)
  const wmsSubwayStation = createWmsLayer('gs-subway-station', GEOSERVER_CONFIG.LAYERS.SUBWAY_STATION.name, GEOSERVER_CONFIG.LAYERS.SUBWAY_STATION.label)
  const wmsScenicPoint   = createWmsLayer('gs-scenic-point',   GEOSERVER_CONFIG.LAYERS.SCENIC_POINT.name,   GEOSERVER_CONFIG.LAYERS.SCENIC_POINT.label)

  // ========== 本地交互层（样式透明，仅用于 hitTest / 收藏光晕 / hover 联动） ==========
  poiMarkerLayer = new VectorLayer({
    source: new VectorSource(), visible: true,
    properties: { layerId: 'poi-marker', label: 'POI交互点' },
    style: new Style({})   // 🔴 样式交给 GeoServer SLD，此处设为空（透明）
  })

  startMarkerLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'start-marker', label: '起点Marker' } })
  endMarkerLayer   = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'end-marker', label: '终点Marker' } })
  routeLayer       = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'route', label: '多方案路线' } })
  blockedLayer     = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'blocked', label: '封闭路段' } })
  detourLayer      = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'detour', label: '绕行路线' } })
  favMarkerLayer      = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'fav-marker', label: '收藏光晕' } })
  roamMarkerLayer     = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'roam-marker', label: '漫游标记' } })
  routeHighlightLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'route-highlight', label: '分段高亮' } })
  // 🔴 顶层 POI 交互反馈：hover 高亮/筛选淡化/剔除标记（所有视觉反馈都画这里，不再改 poi-marker Feature style）
  poiInteractionLayer = new VectorLayer({ source: new VectorSource(), visible: true, properties: { layerId: 'poi-interaction', label: 'POI交互反馈' } })

  mapInstance = new Map({
    target: mapContainerRef.value,
    view: new View({
      center: centerMerc,
      zoom: GEOSERVER_CONFIG.DEFAULT_ZOOM,
      minZoom: GEOSERVER_CONFIG.MIN_ZOOM,
      maxZoom: GEOSERVER_CONFIG.MAX_ZOOM,
      extent: _constrainedExtentMerc,   // 🔴 成都约束范围
      constrainExtent: true              // 🔴 强制限制用户拖拽/缩放不超出
    }),
    layers: [
      // 🔴 GeoServer WMS 底图层（底 → 顶）
      wmsWalkRoad, wmsSubwayLine, wmsSubwayStation, wmsScenicPoint,
      // 本地 hitTest 载体 + 业务层
      poiMarkerLayer, routeLayer, detourLayer, blockedLayer,
      routeHighlightLayer, roamMarkerLayer,
      // 🔴 顶层交互反馈 + 起终点（视觉上必须在最上面）
      poiInteractionLayer, favMarkerLayer, startMarkerLayer, endMarkerLayer
    ],
    controls: [new Zoom(), new ScaleLine({ units: 'metric' })]
  })

  registerMapClickHandlers(poiMarkerLayer)
  registerPoiHoverThrottle(poiMarkerLayer)
  if (store.isDebugMode) console.log('[MapContainer] GeoServer WMS 初始化完成')
}

/** 渲染本地 POI marker（仅 hitTest 载体，样式由 GeoServer SLD 控制） */
function renderPois(layer, pois) {
  const features = pois.map(poi => {
    const coordMerc = wgs84ToWebMerc([poi.lon, poi.lat])
    const feature = new Feature({ geometry: new Point(coordMerc) })
    feature.setId(poi.id)
    feature.set('poiData', poi)
    return feature
  })
  layer.getSource().addFeatures(features)
}

function createPoiStyle(opacity = 1, radius = 9) {
  return new Style({
    image: new Circle({
      radius,
      fill: new Fill({ color: hexWithAlpha('#e74c3c', opacity) }),
      stroke: new Stroke({ color: hexWithAlpha('#fff', opacity), width: 2 })
    })
  })
}
function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// 🌟 节流 pointermove → emit poi-hover
let _lastHoverPoiId = null
let _hoverTimer = null
function registerPoiHoverThrottle(poiLayer) {
  mapInstance.on('pointermove', evt => {
    if (_hoverTimer) return  // 节流：100ms 内只触发一次
    _hoverTimer = setTimeout(() => {
      _hoverTimer = null
      const hit = mapInstance.forEachFeatureAtPixel(evt.pixel, f => f, { layerFilter: l => l === poiLayer })
      const id = hit ? hit.getId() : null
      if (id !== _lastHoverPoiId) {
        _lastHoverPoiId = id
        emit('poi-hover', id)
      }
    }, 80)
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
    const coordWgs = webMercToWgs84(evt.coordinate)

    // ① 本地交互层 hitTest（mock POI marker）
    const hitPoi = mapInstance.forEachFeatureAtPixel(evt.pixel, f => f, { layerFilter: l => l === poiLayer })
    if (hitPoi && currentClickMode.value === 'click-poi') {
      const poiData = hitPoi.get('poiData')
      if (poiData) emit('poi-click', poiData)
      return
    }

    // ② 拾取模式 → 直接拾取
    if (currentClickMode.value === 'pick-endpoint') {
      handleEndpointPick(coordWgs)
      return
    }

    // ③ click-poi 模式但本地没命中 → WFS GetFeature 查 GeoServer
    if (currentClickMode.value === 'click-poi') {
      queryWfsAtPoint(coordWgs).then(feat => {
        if (feat) emit('poi-click', feat)
      })
    }
  })
}

// ========== 🛰️ WFS GetFeature 查询（GeoServer 实时属性） ==========
/**
 * 在指定经纬度查询 GeoServer 上的景点/地铁站点
 * @param {[number,number]} coordWgs [lon, lat]
 * @returns {Promise<Object|null>} 标准化后的 POI 对象，null 表示无结果
 */
async function queryWfsAtPoint(coordWgs) {
  const [lon, lat] = coordWgs
  // 查询半径（度，约 50m）
  const tol = 0.0005
  const bbox = `${lon - tol},${lat - tol},${lon + tol},${lat + tol}`
  // 合并查询景点 + 地铁站点
  const typeNames = `${GEOSERVER_CONFIG.LAYERS.SCENIC_POINT.name},${GEOSERVER_CONFIG.LAYERS.SUBWAY_STATION.name}`
  const url = `${GEOSERVER_CONFIG.WFS_URL}?service=WFS&version=1.1.0&request=GetFeature&typeName=${typeNames}&outputFormat=application/json&bbox=${bbox}`

  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) return null
    const gj = await res.json()
    if (!gj.features || gj.features.length === 0) return null

    const f = gj.features[0]
    const layerName = f.id?.split('.')[0] || ''
    const nameField = GEOSERVER_CONFIG.NAME_FIELD[layerName] || 'name'
    const props = f.properties || {}

    return {
      id: `wfs_${f.id}`,
      name: props[nameField] || props['名称'] || props['name'] || '未知',
      lon,
      lat,
      layer: layerName,
      description: props.description || props['描述'] || '',
      crowdIndex: props.crowdIndex || props['人流'] || null,
      stayDuration: props.stayMinutes || props['停留'] || null,
      imageUrl: props.imageUrl || props['图片'] || null
    }
  } catch (e) {
    if (store.isDebugMode) console.warn('[MapContainer] WFS 查询失败（CORS？GeoServer 未启动？）:', e)
    return null
  }
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
function setActiveRoute(id) { activeRouteIdRef = id; if (!routeLayer) return; routeLayer.getSource().getFeatures().forEach(f => f.setStyle(buildRouteStyle(f.get('color'), f.get('mode'), f.get('optionId') === id))) }
function setRouteVisibility(optionId, visible) {
  const f = routeLayer.getSource().getFeatures().find(f => f.get('optionId') === optionId); if (!f) return
  f.setStyle(visible ? buildRouteStyle(f.get('color'), f.get('mode'), f.get('optionId') === activeRouteIdRef) : new Style({ geometry: undefined }))
}
function buildRouteStyle(color, mode, isActive) {
  return new Style({ stroke: new Stroke({ color: hexToRgba(color, isActive ? 1 : 0.45), width: isActive ? 6 : 3, lineCap: 'round', lineJoin: 'round', lineDash: mode === 'metro' ? [10, 6] : undefined }) })
}
function hexToRgba(hex, alpha) { const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${alpha})` }
/** 把视图范围钳制在成都约束边界内 + resolution 夹在 minZoom~maxZoom */
function _clampViewToExtent() {
  if (!mapInstance || !_constrainedExtentMerc) return
  const view = mapInstance.getView()
  const size = mapInstance.getSize()
  const curCenter = view.getCenter()
  let curRes = view.getResolution()

  // 🔴 ① resolution 钳制：确保 fit 后缩放在 [MIN_ZOOM, MAX_ZOOM] 内
  //     OpenLayers resolution 越小 = 缩放越大
  const maxRes = view.getResolutionForZoom(GEOSERVER_CONFIG.MIN_ZOOM)
  const minRes = view.getResolutionForZoom(GEOSERVER_CONFIG.MAX_ZOOM)
  if (curRes > maxRes) curRes = maxRes   // 太往外了 → 拉近
  if (curRes < minRes) curRes = minRes   // 太往里了 → 拉远
  if (curRes !== view.getResolution()) view.setResolution(curRes)

  // 🔴 ② 中心钳制：保证视图 extent 四个边不超出约束范围
  const halfW = curRes * size[0] / 2
  const halfH = curRes * size[1] / 2
  const [xMin, yMin, xMax, yMax] = _constrainedExtentMerc
  const clampedCenter = [
    Math.max(xMin + halfW, Math.min(xMax - halfW, curCenter[0])),
    Math.max(yMin + halfH, Math.min(yMax - halfH, curCenter[1]))
  ]
  view.setCenter(clampedCenter)
}
function fitAllRoutes() {
  const ext = routeLayer.getSource().getExtent()
  if (!ext || !ext.every(v => v !== Infinity)) return
  // 🔴 不写死 maxZoom，让 View 构造时的 maxZoom 接管
  mapInstance.getView().fit(ext, { padding:[60,60,60,60], duration:500, constrainResolution: true })
  setTimeout(_clampViewToExtent, 550)
}

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
  if (ext && ext.every(v => v !== Infinity)) {
    // 🔴 不写死 maxZoom，让 View 构造时的 maxZoom 接管
    mapInstance.getView().fit(ext, { padding:[80,80,80,80], duration:600, constrainResolution: true })
    setTimeout(_clampViewToExtent, 650)
  }
}
function clearBlockedAndDetour() { blockedLayer?.getSource().clear(); detourLayer?.getSource().clear() }

// ========== 🌟 POI 高亮 / 淡化 / 收藏光晕（景点库双向联动） ==========
const ORIGINAL_POI_OPACITY = 1
const DIM_POI_OPACITY     = 0.25
const HIGHLIGHT_RADIUS    = 13
const DIM_RADIUS          = 7

function getPoiLayer() {
  return mapInstance.getLayers().getArray().find(l => l.get('layerId') === 'poi-marker')
}
/** 取 poi-marker 所有 Feature（顶层交互反馈需要它们的坐标） */
function _getAllPoiFeatures() {
  return getPoiLayer()?.getSource().getFeatures() || []
}
/** 在 poiInteractionLayer 画交互反馈 Feature */
function _addInteractionFeature(coordMerc, style, poiId) {
  if (!poiInteractionLayer) return
  const f = new Feature({ geometry: new Point(coordMerc) })
  f.setStyle(style)
  if (poiId) f.setId('interaction_' + poiId)
  poiInteractionLayer.getSource().addFeature(f)
}

/** 卡片 hover → 地图：指定 POI 放大高亮，其余淡化（全部画在顶层 poiInteractionLayer） */
function highlightPoiMarker(id) {
  if (!id || !poiInteractionLayer) return
  poiInteractionLayer.getSource().clear()
  _getAllPoiFeatures().forEach(f => {
    const coord = f.getGeometry().getCoordinates()
    if (f.getId() === id) {
      _addInteractionFeature(coord, createPoiStyle(ORIGINAL_POI_OPACITY, HIGHLIGHT_RADIUS), f.getId())
    } else {
      _addInteractionFeature(coord, createPoiStyle(DIM_POI_OPACITY, DIM_RADIUS), f.getId())
    }
  })
}
/** 筛选分层淡化：画 ids 内正常、外淡化到顶层 poiInteractionLayer */
function dimOtherPoiMarkers(ids) {
  if (!poiInteractionLayer) return
  poiInteractionLayer.getSource().clear()
  const set = new Set(ids)
  _getAllPoiFeatures().forEach(f => {
    const coord = f.getGeometry().getCoordinates()
    const isShown = set.has(f.getId())
    _addInteractionFeature(coord,
      isShown ? createPoiStyle(ORIGINAL_POI_OPACITY) : createPoiStyle(DIM_POI_OPACITY, DIM_RADIUS),
      f.getId())
  })
}
/** 还原所有 POI：清除顶层交互反馈，让 GeoServer SLD 完整呈现 */
function resetPoiMarkers() {
  poiInteractionLayer?.getSource().clear()
}
/** 收藏 POI 金色光晕标记（叠加在 fav-marker 层） */
function renderFavMarkers(favIds) {
  favMarkerLayer.getSource().clear()
  if (!favIds || favIds.length === 0) return
  const set = new Set(favIds)
  getPoiLayer()?.getSource().getFeatures().forEach(f => {
    if (!set.has(f.getId())) return
    const coord = f.getGeometry().getCoordinates()
    favMarkerLayer.getSource().addFeature(new Feature({
      geometry: new Point(coord),
      // 双层金色光晕：外圈扩散 + 内圈实心
      style: [
        new Style({ image: new Circle({ radius: 18, fill: new Fill({ color: 'rgba(241,196,15,0.3)' }), stroke: new Stroke({ color: '#f1c40f', width: 2, lineDash:[4,2] }) }), zIndex: 3 }),
        new Style({ image: new Circle({ radius: 13, fill: new Fill({ color: '#f1c40f' }), stroke: new Stroke({ color: '#fff', width: 2 }) }), zIndex: 4 })
      ]
    }))
  })
}

// ========== 🔶 第九阶段：剔除景点高亮 ==========
/**
 * 高亮被时长约束剔除的 POI（灰色虚线标记）
 * @param {Array<string>} removedPoiIds
 */
/** 高亮被时长约束剔除的 POI（灰色虚线标记，画在顶层 poiInteractionLayer） */
function highlightRemovedPois(removedPoiIds) {
  if (!removedPoiIds || !removedPoiIds.length || !poiInteractionLayer) return
  const set = new Set(removedPoiIds)
  // 先清除之前的剔除标记
  poiInteractionLayer.getSource().getFeatures().forEach(f => {
    if (f.get('isRemoved')) poiInteractionLayer.getSource().removeFeature(f)
  })
  _getAllPoiFeatures().forEach(f => {
    if (set.has(f.getId())) {
      const coord = f.getGeometry().getCoordinates()
      const ghostImg = new Circle({
        radius: 14, fill: new Fill({ color: 'rgba(149,165,166,0.3)' }), stroke: new Stroke({ color: '#7f8c8d', width: 2, lineDash: [4, 3] })
      })
      const feat = new Feature({ geometry: new Point(coord) })
      feat.setStyle(new Style({ image: ghostImg, zIndex: 5 }))
      feat.set('isRemoved', true)
      poiInteractionLayer.getSource().addFeature(feat)
    }
  })
  if (store.isDebugMode) console.log('[MapContainer] 高亮剔除景点:', removedPoiIds)
}

/** 清除剔除高亮 */
function clearRemovedPoiHighlights() {
  if (!poiInteractionLayer) return
  poiInteractionLayer.getSource().getFeatures().forEach(f => {
    if (f.get('isRemoved')) poiInteractionLayer.getSource().removeFeature(f)
  })
}

// ========== 清除 / 暴露 ==========
function clearRouteAndMarkers() {
  startMarkerLayer?.getSource().clear(); endMarkerLayer?.getSource().clear()
  routeLayer?.getSource().clear(); clearBlockedAndDetour()
  // 🔴 清除顶层交互反馈（hover/筛选淡化/剔除/收藏）
  poiInteractionLayer?.getSource().clear()
  favMarkerLayer?.getSource().clear()
  startPoint.value = null; endPoint.value = null; activeRouteIdRef = null
}
function setClickMode(mode) { if (['pick-endpoint','click-poi'].includes(mode)) currentClickMode.value = mode }
function flyToPoi(lon, lat, targetZoom = 15) {
  if (!mapInstance) return
  // 🔴 zoom 夹在配置的 minZoom/maxZoom 之间
  const zoom = Math.max(GEOSERVER_CONFIG.MIN_ZOOM, Math.min(GEOSERVER_CONFIG.MAX_ZOOM, targetZoom))
  mapInstance.getView().animate({ center: wgs84ToWebMerc([lon, lat]), zoom, duration: 600 })
  setTimeout(_clampViewToExtent, 650)
}
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
/** 复位视图：彻底重置到成都中心 + zoom，清除 fit 残留锁定 */
function resetView() {
  if (!mapInstance) return
  // 🔴 用 setView 彻底覆盖任何 fit 残留；center/zoom 全部走配置
  mapInstance.getView().setView({
    center: wgs84ToWebMerc(GEOSERVER_CONFIG.CENTER_WGS),
    zoom: GEOSERVER_CONFIG.DEFAULT_ZOOM,
    extent: _constrainedExtentMerc,
    constrainExtent: true
  })
  setTimeout(() => { mapInstance?.updateSize(); _clampViewToExtent() }, 50)
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
  setActiveRoute,
  setRouteVisibility, fitAllRoutes,
  renderRouteGeoJson(gj, mode) { const f = gj.features[0]; addRouteOption({ optionId:'single_temp', mode, color: mode==='metro'?'#e67e22':'#3498db', coordinates: f.geometry.coordinates }); fitAllRoutes() },
  renderBlockedSegment, renderDetourRoute, clearBlockedAndDetour,
  highlightRemovedPois, clearRemovedPoiHighlights,
  panPopupIntoView,
  // 🌟 景点库联动
  highlightPoiMarker, dimOtherPoiMarkers, resetPoiMarkers, renderFavMarkers,

  // 📍 外部设置起终点 marker（搜索框 / POI 点击 用）
  // type: 'start' | 'end'    coord: [lon, lat] WGS84
  setEndpointMarker(type, lon, lat) {
    const layer = type === 'start' ? startMarkerLayer : endMarkerLayer
    const coordMerc = wgs84ToWebMerc([lon, lat])
    renderEndpointMarker(layer, coordMerc, type)
  },
  clearEndpointMarker(type) {
    const layer = type === 'start' ? startMarkerLayer : endMarkerLayer
    layer?.getSource()?.clear()
  },

  // 📍 外部设置起终点 marker（搜索框 / POI 点击 用）
  // type: 'start' | 'end'    coord: [lon, lat] WGS84
  setEndpointMarker(type, lon, lat) {
    const layer = type === 'start' ? startMarkerLayer : endMarkerLayer
    const coordMerc = wgs84ToWebMerc([lon, lat])
    renderEndpointMarker(layer, coordMerc, type)
  },
  clearEndpointMarker(type) {
    const layer = type === 'start' ? startMarkerLayer : endMarkerLayer
    layer?.getSource()?.clear()
  },

  // 🧭 路线漫游
  createRoamMarker(lon, lat) {
    if (!roamMarkerLayer) return
    const coord = wgs84ToWebMerc([lon, lat])
    roamMarkerLayer.getSource().clear()
    roamMarkerFeature = new Feature({ geometry: new Point(coord) })
    // 双层样式：外圈脉冲 + 内圈实心（模拟小人）
    roamMarkerFeature.setStyle([
      new Style({
        image: new Circle({
          radius: 14,
          fill: new Fill({ color: 'rgba(156,56,56,0.25)' }),
          stroke: new Stroke({ color: '#9c3838', width: 1.5, lineDash: [3,2] })
        }),
        zIndex: 6
      }),
      new Style({
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: '#9c3838' }),
          stroke: new Stroke({ color: '#fff', width: 2 })
        }),
        zIndex: 7
      })
    ])
    roamMarkerLayer.getSource().addFeature(roamMarkerFeature)
  },
  updateRoamMarker(lon, lat) {
    if (!roamMarkerFeature) return
    roamMarkerFeature.setGeometry(new Point(wgs84ToWebMerc([lon, lat])))
  },
  clearRoamMarker() {
    roamMarkerLayer?.getSource().clear()
    roamMarkerFeature = null
  },

  // 📍 RouteSummary 分段高亮
  highlightRouteSegment(coords, color = '#f39c12') {
    if (!routeHighlightLayer || !coords || coords.length < 2) return
    const coordsMerc = coords.map(c => Array.isArray(c) ? wgs84ToWebMerc(c) : c)
    routeHighlightLayer.getSource().clear()
    const f = new Feature({ geometry: new LineString(coordsMerc) })
    f.setStyle(new Style({
      stroke: new Stroke({ color, width: 9, lineCap: 'round', lineJoin: 'round' })
    }))
    routeHighlightLayer.getSource().addFeature(f)
  },
  clearRouteSegmentHighlight() {
    routeHighlightLayer?.getSource().clear()
  }
})
</script>

<style scoped>
.map-container {
  width: 100%; height: 100%;
  position: relative;   /* ✅ OpenLayers 需要 relative 定位基准 */
  overflow: hidden;     /* ✅ 防止地图瓦片溢出挤压侧边 */
  /* ❌ 不要加 padding / border / margin —— 任何外层装饰由父容器承担 */
}
</style>