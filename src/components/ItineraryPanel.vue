<!--
  【第五阶段 + 第六阶段：左侧日程拖拽列表 + 双向联动】
  🔶 第六阶段核心：itinerary 提升到 App.vue 作为 props
                 所有修改操作通过 emit 通知 App.vue 协调
                 App.vue 负责路线重绘
-->
<template>
  <div class="itinerary-panel">
    <div class="panel-header">
      <h3>📅 我的日程</h3>
      <div class="header-actions">
        <button class="btn-add-day" @click="handleAddDay">+ 新增日期</button>
      </div>
    </div>

    <div class="day-groups">
      <div
        v-for="(dayGroup, dayIdx) in itinerary"
        :key="dayGroup.day"
        class="day-group"
      >
        <div class="day-header" @click="toggleDayCollapse(dayIdx)">
          <span class="day-toggle" :class="{ collapsed: collapsedDays[dayIdx] }">▶</span>
          <span class="day-label">{{ dayGroup.dateLabel }}</span>
          <span class="day-count">({{ dayGroup.spots.length }} 个景点)</span>
          <!-- 第六阶段：重绘路线按钮 -->
          <button
            v-if="dayGroup.spots.length >= 2"
            class="btn-redraw"
            @click.stop="emit('redraw-route', dayIdx)"
            title="重绘该天路线"
          >🔄</button>
        </div>

        <div v-show="!collapsedDays[dayIdx]" class="spots-list-wrapper">
          <draggable
            :list="dayGroup.spots"
            class="spots-list"
            item-key="poiId"
            :group="'spots-' + dayGroup.day"
            :animation="200"
            :ghost-class="'spot-ghost'"
            :handle="'.spot-drag-handle'"
            @end="(evt) => handleDragEnd(dayIdx)"
          >
            <template #item="{ element: spot, index }">
              <div
                class="spot-item"
                :class="{ active: selectedPoiId === spot.poiId }"
                @click.stop="handleSpotClick(spot)"
              >
                <span class="spot-drag-handle" title="拖拽排序">⋮⋮</span>
                <span class="spot-order">{{ index + 1 }}</span>
                <div class="spot-info">
                  <div class="spot-name">{{ getPoiName(spot.poiId) }}</div>
                  <div class="spot-note">{{ spot.note }}</div>
                </div>
                <span class="spot-stay">{{ getPoiStay(spot.poiId) }}min</span>
                <button
                  class="spot-delete"
                  @click.stop="handleRemoveSpot(dayIdx, index)"
                  title="删除"
                >×</button>
              </div>
            </template>
          </draggable>

          <div v-if="dayGroup.spots.length === 0" class="spots-empty">
            暂无景点
          </div>

          <button class="btn-add-spot" @click="openAddSpotModal(dayIdx)">
            + 新增景点
          </button>
        </div>
      </div>

      <div v-if="itinerary.length === 0" class="itinerary-empty">
        还没有日程哦～点击「+ 新增日期」开始规划吧
      </div>
    </div>

    <!-- 新增景点弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-title">选择要添加的景点</div>
        <div class="poi-options">
          <div
            v-for="poi in availablePois"
            :key="poi.id"
            class="poi-option"
            @click="handleAddSpot(poi)"
          >
            <span class="poi-dot"></span>
            <span class="poi-option-name">{{ poi.name }}</span>
          </div>
        </div>
        <button class="modal-close" @click="showAddModal = false">取消</button>
      </div>
    </div>

    <div v-if="DEBUG_MODE" class="debug-info">
      <p>📍 点击景点 → 地图 flyTo</p>
      <p>⋮⋮ 拖动 → 排序 → 自动重绘路线</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import draggable from 'vuedraggable'
import { DEBUG_MODE } from '@/constants/config'
import { mockPois } from '@/data/mockPois'

// =======================================================
// 🔶 第六阶段：itinerary 改为 props（由 App.vue 持有）
// =======================================================
const props = defineProps({
  itinerary: {
    type: Array,
    required: true
  }
})

// =======================================================
// 🔶 第六阶段：emit 所有变更事件，由 App.vue 协调
// =======================================================
const emit = defineEmits([
  'poi-locate',       // 点击景点 → 地图 flyTo
  'itinerary-change'  // 日程变更（拖拽/增删/新增日期）→ App.vue 更新 + 重绘路线
])

// =======================================================
// 组件内部状态
// =======================================================
const collapsedDays = reactive({})
const selectedPoiId = ref(null)
const showAddModal = ref(false)
const targetDayIdx = ref(null)

const availablePois = computed(() => mockPois)

function getPoiName(poiId) {
  const poi = mockPois.find(p => p.id === poiId)
  return poi ? poi.name : '(未知景点)'
}
function getPoiStay(poiId) {
  const poi = mockPois.find(p => p.id === poiId)
  return poi ? poi.stayDuration : 0
}

// =======================================================
// 交互函数（全部 emit 给 App.vue）
// =======================================================

function handleSpotClick(spot) {
  selectedPoiId.value = spot.poiId
  const poi = mockPois.find(p => p.id === spot.poiId)
  if (poi) emit('poi-locate', { lon: poi.lon, lat: poi.lat })
}

function handleDragEnd(dayIdx) {
  // 重排序号
  props.itinerary[dayIdx].spots.forEach((s, i) => { s.order = i + 1 })
  // 通知 App.vue：日程变了，请重绘这天路线
  emit('itinerary-change', { dayIdx, itinerary: props.itinerary })
}

function handleRemoveSpot(dayIdx, spotIdx) {
  props.itinerary[dayIdx].spots.splice(spotIdx, 1)
  props.itinerary[dayIdx].spots.forEach((s, i) => { s.order = i + 1 })
  emit('itinerary-change', { dayIdx, itinerary: props.itinerary })
}

function openAddSpotModal(dayIdx) {
  targetDayIdx.value = dayIdx
  showAddModal.value = true
}

function handleAddSpot(poi) {
  const day = props.itinerary[targetDayIdx.value]
  day.spots.push({
    poiId: poi.id,
    order: day.spots.length + 1,
    note: '待定'
  })
  showAddModal.value = false
  emit('itinerary-change', { dayIdx: targetDayIdx.value, itinerary: props.itinerary })
}

function handleAddDay() {
  const newDayNum = props.itinerary.length + 1
  props.itinerary.push({
    day: newDayNum,
    dateLabel: `Day ${newDayNum} · 新行程`,
    spots: []
  })
  emit('itinerary-change', { dayIdx: props.itinerary.length - 1, itinerary: props.itinerary })
}

function toggleDayCollapse(dayIdx) {
  collapsedDays[dayIdx] = !collapsedDays[dayIdx]
}
</script>

<style scoped>
/* ============ 样式保持不变，只新增 btn-redraw ============ */
.itinerary-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 280px;
  max-height: calc(100vh - 32px);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 900;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.itinerary-panel::-webkit-scrollbar { width: 6px; }
.itinerary-panel::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.panel-header h3 { margin: 0; font-size: 16px; color: #222; }
.btn-add-day {
  padding: 5px 10px; font-size: 12px; border: 1px solid #3498db;
  background: #fff; color: #3498db; border-radius: 5px; cursor: pointer;
}
.btn-add-day:hover { background: #ebf5fb; }

.day-group { margin-bottom: 14px; }
.day-header {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; background: #f8f9fa; border-radius: 6px;
  cursor: pointer; user-select: none; font-weight: 600; font-size: 13px; color: #333;
}
.day-toggle { font-size: 10px; transition: transform 0.15s; }
.day-toggle.collapsed { transform: rotate(-90deg); }
.day-count { color: #999; font-weight: 400; font-size: 12px; margin-left: auto; }
.btn-redraw {
  border: none; background: transparent; cursor: pointer; font-size: 14px;
  padding: 0 2px; opacity: 0.5; margin-left: 4px;
}
.btn-redraw:hover { opacity: 1; }

.spots-list-wrapper { padding: 6px 0 6px 4px; }
.spots-list { list-style: none; padding: 0; margin: 0; }

.spot-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; margin-bottom: 4px;
  background: #fff; border: 1px solid #e9ecef; border-radius: 6px;
  cursor: pointer; transition: all 0.15s; font-size: 12px;
}
.spot-item:hover { border-color: #3498db; background: #f0f7ff; }
.spot-item.active { border-color: #27ae60; background: #eafaf1; }

.spot-drag-handle { color: #ccc; cursor: grab; font-size: 14px; padding: 2px; }
.spot-drag-handle:active { cursor: grabbing; }

.spot-order {
  width: 20px; height: 20px; background: #3498db; color: #fff; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}

.spot-info { flex: 1; min-width: 0; }
.spot-name { font-weight: 600; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spot-note { color: #888; font-size: 11px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.spot-stay {
  background: #f1f3f5; color: #666; font-size: 10px; padding: 2px 6px;
  border-radius: 10px; flex-shrink: 0;
}
.spot-delete {
  border: none; background: transparent; color: #e74c3c; font-size: 16px;
  cursor: pointer; padding: 0 4px; line-height: 1; flex-shrink: 0;
}
.spot-delete:hover { color: #c0392b; }

.spot-ghost { opacity: 0.5; background: #3498db !important; border-color: #2980b9 !important; }
.spots-empty { text-align: center; color: #bbb; font-size: 11px; padding: 10px; font-style: italic; }

.btn-add-spot {
  width: 100%; padding: 7px; border: 1px dashed #3498db; background: transparent;
  color: #3498db; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 4px;
}
.btn-add-spot:hover { background: #ebf5fb; }

.itinerary-empty { text-align: center; color: #bbb; font-size: 12px; padding: 20px 0; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-content { background: #fff; border-radius: 10px; padding: 20px; width: 280px; max-height: 400px; overflow-y: auto; }
.modal-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #222; }
.poi-option { display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.poi-option:hover { background: #f0f7ff; }
.poi-dot { width: 8px; height: 8px; border-radius: 50%; background: #e74c3c; flex-shrink: 0; }
.modal-close { width: 100%; margin-top: 12px; padding: 8px; border: none; background: #f1f3f5; border-radius: 6px; cursor: pointer; font-size: 13px; color: #666; }
.modal-close:hover { background: #e9ecef; }

.debug-info { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #ddd; font-size: 11px; color: #999; }
.debug-info p { margin: 2px 0; }
</style>