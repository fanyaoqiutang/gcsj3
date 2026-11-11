<template>
  <div class="route-options-panel">
    <h3 class="panel-title">🎯 路径方案</h3>

    <div v-if="options.length === 0" class="empty-tip">暂无可选方案</div>

    <div class="options-list">
      <div
        v-for="opt in options"
        :key="opt.optionId"
        class="option-card"
        :class="{ active: activeOptionId === opt.optionId, hidden: !visibleMap[opt.optionId] }"
        @click="handleSelect(opt)"
      >
        <div class="option-header">
          <span class="color-bar" :style="{ background: opt.color }"></span>
          <div class="option-title-area">
            <span class="option-name">{{ opt.name }}</span>
            <span class="option-desc">{{ opt.description }}</span>
          </div>
          <button
            class="btn-visibility"
            :class="{ off: !visibleMap[opt.optionId] }"
            @click.stop="toggleVisibility(opt.optionId)"
            :title="visibleMap[opt.optionId] ? '隐藏路线' : '显示路线'"
          >{{ visibleMap[opt.optionId] ? '👁' : '🚫' }}</button>
        </div>

        <div class="option-metrics">
          <div class="metric-item"><span class="metric-icon">📏</span><span class="metric-value">{{ formatDist(opt.metrics.distance) }}</span></div>
          <div class="metric-item"><span class="metric-icon">⏱</span><span class="metric-value">{{ opt.metrics.duration }}min</span></div>
          <div class="metric-item"><span class="metric-icon">🔄</span><span class="metric-value">{{ opt.metrics.transitCount > 0 ? opt.metrics.transitCount + '次换乘' : '直达' }}</span></div>
        </div>

        <div v-if="activeOptionId === opt.optionId" class="active-badge">✓ 当前方案</div>
      </div>
    </div>

    <!-- DEBUG_MODE 对比表 -->
    <div v-if="DEBUG_MODE && options.length >= 2" class="compare-table">
      <div class="compare-title">📊 方案对比</div>
      <table>
        <thead><tr><th>方案</th><th>距离</th><th>耗时</th><th>换乘</th></tr></thead>
        <tbody>
          <tr v-for="opt in options" :key="opt.optionId">
            <td><span class="color-dot" :style="{ background: opt.color }"></span>{{ opt.name.replace('方案', '') }}</td>
            <td>{{ formatDist(opt.metrics.distance) }}</td>
            <td>{{ opt.metrics.duration }}min</td>
            <td>{{ opt.metrics.transitCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 🔶 第八阶段：道路封闭仿真控件 -->
    <div class="simulate-block-section">
      <div class="section-title">⚠️ 道路封闭仿真</div>
      <div class="block-control-row">
        <select v-model="selectedBlockId" class="block-select">
          <option value="" disabled>选择封闭路段</option>
          <option v-for="seg in blockedSegments" :key="seg.segmentId" :value="seg.segmentId">
            {{ seg.name }}
          </option>
        </select>
        <button
          class="btn-trigger-block"
          :disabled="!selectedBlockId || blockedActive"
          @click="handleTriggerBlock"
        >🔒 触发封闭</button>
      </div>

      <div v-if="blockedActive" class="block-alert">
        <div class="alert-icon">🚧</div>
        <div class="alert-content">
          <div class="alert-title">道路封闭中</div>
          <div class="alert-desc">{{ blockedSegmentInfo?.name }}</div>
          <div class="alert-hint">{{ blockedSegmentInfo?.hint }}</div>
        </div>
        <button class="btn-clear-block" @click="handleClearBlock">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { DEBUG_MODE } from '@/constants/config'
import { mockBlockedSegments } from '@/data/mockDetour'

const props = defineProps({
  options: { type: Array, required: true },
  activeOptionId: { type: String, default: null }
})

const emit = defineEmits(['select', 'visibility-change', 'trigger-block', 'clear-block'])

const visibleMap = reactive({})

watch(() => props.options, (opts) => {
  opts.forEach(o => {
    if (visibleMap[o.optionId] === undefined) visibleMap[o.optionId] = true
  })
}, { immediate: true, deep: true })

function handleSelect(opt) {
  if (!visibleMap[opt.optionId]) return
  emit('select', opt)
}

function toggleVisibility(optionId) {
  visibleMap[optionId] = !visibleMap[optionId]
  emit('visibility-change', { optionId, visible: visibleMap[optionId] })
}

function formatDist(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(1) + 'km'
  return meters + 'm'
}

// 🔶 第八阶段：封闭仿真状态
const selectedBlockId = ref('')
const blockedActive = ref(false)
const blockedSegmentInfo = computed(() =>
  blockedActive.value ? mockBlockedSegments.find(s => s.segmentId === selectedBlockId.value) : null
)

function handleTriggerBlock() {
  blockedActive.value = true
  emit('trigger-block', selectedBlockId.value)
}
function handleClearBlock() {
  blockedActive.value = false
  emit('clear-block')
}
</script>

<style scoped>
.route-options-panel {
  position: absolute; bottom: 16px; left: 16px; width: 300px;
  max-height: 50vh; background: #fff; border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 14px; z-index: 800;
  overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.route-options-panel::-webkit-scrollbar { width: 5px; }
.route-options-panel::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
.panel-title { margin: 0 0 12px 0; font-size: 15px; color: #222; font-weight: 600; }
.empty-tip { text-align: center; color: #bbb; font-size: 12px; padding: 20px 0; }
.options-list { display: flex; flex-direction: column; gap: 10px; }

.option-card {
  position: relative; border: 2px solid #e9ecef; border-radius: 8px;
  padding: 10px; cursor: pointer; transition: all 0.2s; overflow: hidden;
}
.option-card:hover { border-color: #95a5a6; }
.option-card.active { border-color: #3498db; background: #f0f7ff; }
.option-card.hidden { opacity: 0.4; }

.option-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.color-bar { width: 4px; height: 28px; border-radius: 2px; flex-shrink: 0; }
.option-title-area { flex: 1; min-width: 0; }
.option-name { font-size: 13px; font-weight: 600; color: #222; display: block; }
.option-desc { font-size: 11px; color: #888; display: block; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-visibility { border: none; background: transparent; cursor: pointer; font-size: 16px; padding: 2px 4px; opacity: 0.8; }
.btn-visibility:hover { opacity: 1; }
.btn-visibility.off { opacity: 0.4; }

.option-metrics { display: flex; gap: 10px; font-size: 11px; }
.metric-item { display: flex; align-items: center; gap: 3px; color: #555; }
.metric-icon { font-size: 12px; }
.metric-value { font-weight: 500; color: #222; }
.active-badge { position: absolute; top: 6px; right: 6px; background: #3498db; color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 8px; }

.compare-table { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #ddd; }
.compare-title { font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600; }
.compare-table table { width: 100%; font-size: 11px; border-collapse: collapse; }
.compare-table th, .compare-table td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #f0f0f0; }
.compare-table th { color: #888; font-weight: 500; }
.compare-table td { color: #333; }
.color-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

/* 🔶 第八阶段 */
.simulate-block-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e9ecef; }
.section-title { font-size: 13px; font-weight: 600; color: #c0392b; margin-bottom: 8px; }
.block-control-row { display: flex; gap: 6px; }
.block-select { flex: 1; padding: 6px 8px; font-size: 12px; border: 1px solid #ddd; border-radius: 5px; background: #fff; }
.btn-trigger-block { padding: 6px 10px; font-size: 12px; font-weight: 600; background: #e74c3c; color: #fff; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap; }
.btn-trigger-block:hover:not(:disabled) { background: #c0392b; }
.btn-trigger-block:disabled { background: #bdc3c7; cursor: not-allowed; }

.block-alert { margin-top: 10px; padding: 10px; background: #fdf2f2; border: 1px solid #f5c6cb; border-radius: 6px; display: flex; gap: 8px; align-items: flex-start; position: relative; }
.alert-icon { font-size: 20px; }
.alert-content { flex: 1; min-width: 0; }
.alert-title { font-size: 12px; font-weight: 700; color: #c0392b; }
.alert-desc { font-size: 12px; color: #333; margin-top: 2px; }
.alert-hint { font-size: 11px; color: #888; margin-top: 2px; font-style: italic; }
.btn-clear-block { border: none; background: transparent; color: #c0392b; cursor: pointer; font-size: 14px; padding: 2px 4px; }
.btn-clear-block:hover { color: #922b21; }
</style>
