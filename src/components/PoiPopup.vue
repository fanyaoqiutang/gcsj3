<!--
  【第三阶段 + 第六阶段：POI详情弹窗】
  原有：景点名称、简介、图片、预估停留时长、人流指数、关闭
  第六阶段新增：【加入行程】按钮 → 选日期 → emit 给 App.vue 处理
-->
<template>
  <div v-if="visible" class="poi-popup-mask" @click.self="closePopup">
    <div class="poi-popup-card">
      <button class="popup-close-btn" @click="closePopup" title="关闭">✕</button>

      <div class="popup-image">
        <img :src="poiData.imageUrl" :alt="poiData.name" @error="handleImageError" />
        <span class="popup-crowd-tag" :class="crowdLevel">{{ crowdText }}</span>
      </div>

      <div class="popup-content">
        <h3 class="popup-title">{{ poiData.name }}</h3>
        <p class="popup-description">{{ poiData.description }}</p>

        <div class="popup-meta">
          <span class="meta-item">
            <span class="meta-icon">⏱️</span>
            预估停留 {{ formatDuration(poiData.stayDuration) }}
          </span>
          <span class="meta-item">
            <span class="meta-icon">👥</span>
            人流 {{ poiData.crowdIndex }}/5
          </span>
        </div>

        <!-- 第六阶段：加入行程 -->
        <div class="popup-action-row">
          <span class="action-label">加入日程：</span>
          <select v-model="selectedDayForAdd" class="day-select">
            <option value="" disabled>选择日期</option>
            <option v-for="day in itinerary" :key="day.day" :value="day.day">
              {{ day.dateLabel }}
            </option>
            <option value="new">+ 新建日期</option>
          </select>
          <button
            class="btn-add-itinerary"
            :disabled="!selectedDayForAdd"
            @click="handleAddToItinerary"
          >✓ 加入</button>
        </div>

        <p class="popup-coord" v-if="DEBUG_MODE">
          📍 坐标(开发调试): {{ poiData.lon.toFixed(4) }}, {{ poiData.lat.toFixed(4) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DEBUG_MODE } from '@/constants/config'

const props = defineProps({
  poiData: { type: Object, required: true },
  visible: { type: Boolean, default: false },
  itinerary: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'add-to-itinerary'])

// 第六阶段：加入行程选择
const selectedDayForAdd = ref('')

function closePopup() {
  selectedDayForAdd.value = ''
  emit('close')
}

function handleImageError(e) {
  e.target.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="160"><rect fill="#ddd" width="280" height="160"/><text x="50%" y="50%" fill="#999" font-family="sans-serif" font-size="16" text-anchor="middle" dy=".3em">暂无图片</text></svg>'
  )
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

function handleAddToItinerary() {
  if (!selectedDayForAdd.value) return
  emit('add-to-itinerary', {
    poiData: props.poiData,
    targetDay: selectedDayForAdd.value
  })
  selectedDayForAdd.value = ''
}

const crowdLevel = computed(() => {
  const idx = props.poiData.crowdIndex
  if (idx >= 4) return 'crowd-high'
  if (idx >= 2) return 'crowd-mid'
  return 'crowd-low'
})

const crowdText = computed(() => {
  const idx = props.poiData.crowdIndex
  if (idx >= 4) return '人流密集'
  if (idx >= 2) return '人流适中'
  return '人流稀少'
})
</script>

<style scoped>
.poi-popup-mask {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9999;
  display: flex; justify-content: center; align-items: center;
}

.poi-popup-card {
  position: relative;
  width: 360px; max-width: 90vw; max-height: 85vh;
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  animation: popupIn 0.2s ease-out;
}

@keyframes popupIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.popup-close-btn {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px;
  border: none; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); color: #fff;
  font-size: 14px; cursor: pointer; z-index: 10;
  display: flex; align-items: center; justify-content: center;
}
.popup-close-btn:hover { background: rgba(0, 0, 0, 0.7); }

.popup-image { position: relative; width: 100%; height: 180px; overflow: hidden; }
.popup-image img { width: 100%; height: 100%; object-fit: cover; display: block; }

.popup-crowd-tag {
  position: absolute; top: 10px; left: 10px;
  padding: 4px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 500; color: #fff;
}
.crowd-high { background: #e74c3c; }
.crowd-mid  { background: #f39c12; }
.crowd-low  { background: #27ae60; }

.popup-content { padding: 16px; }
.popup-title { margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #222; }
.popup-description {
  margin: 0 0 12px 0; font-size: 13px; color: #555; line-height: 1.6;
  max-height: 80px; overflow-y: auto;
}

.popup-meta { display: flex; gap: 16px; font-size: 13px; color: #666; }
.meta-item { display: flex; align-items: center; gap: 4px; }
.meta-icon { font-size: 14px; }

/* 第六阶段：加入行程 */
.popup-action-row {
  display: flex; align-items: center; gap: 6px;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px dashed #e9ecef;
}
.action-label { font-size: 12px; color: #666; }
.day-select {
  flex: 1; padding: 5px 8px; font-size: 12px;
  border: 1px solid #ddd; border-radius: 5px; background: #fff;
}
.btn-add-itinerary {
  padding: 5px 12px; font-size: 12px; font-weight: 600;
  background: #27ae60; color: #fff; border: none; border-radius: 5px; cursor: pointer;
}
.btn-add-itinerary:hover:not(:disabled) { background: #219a52; }
.btn-add-itinerary:disabled { background: #bdc3c7; cursor: not-allowed; }

.popup-coord { margin-top: 10px; font-size: 11px; color: #999; font-family: monospace; }
</style>