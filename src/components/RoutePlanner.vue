<template>
  <div class="route-planner-panel">
    <h3 class="panel-title">🗺️ 单点路径规划</h3>

    <!-- 起终点 -->
    <div class="endpoint-section">
      <div class="endpoint-item">
        <span class="endpoint-label start">起</span>
        <div class="endpoint-info">
          <span v-if="startPoint" class="endpoint-coord">{{ startPoint[0].toFixed(5) }}, {{ startPoint[1].toFixed(5) }}</span>
          <span v-else class="endpoint-empty">点击地图拾取起点</span>
        </div>
      </div>
      <div class="endpoint-item">
        <span class="endpoint-label end">终</span>
        <div class="endpoint-info">
          <span v-if="endPoint" class="endpoint-coord">{{ endPoint[0].toFixed(5) }}, {{ endPoint[1].toFixed(5) }}</span>
          <span v-else class="endpoint-empty">点击地图拾取终点</span>
        </div>
      </div>
      <button class="btn-clear" :disabled="!startPoint && !endPoint" @click="emit('clear-points')">清除</button>
    </div>

    <!-- 出行模式 -->
    <div class="mode-section">
      <span class="mode-label">出行模式：</span>
      <div class="mode-switch">
        <label :class="['mode-option', { active: travelMode === 'walk' }]" @click="travelMode = 'walk'">🚶 纯步行</label>
        <label :class="['mode-option', { active: travelMode === 'metro' }]" @click="travelMode = 'metro'">🚇 地铁+步行</label>
      </div>
    </div>

    <button class="btn-plan" :disabled="!startPoint || !endPoint || loading" @click="handlePlanRoute">
      <span v-if="loading">⏳ 规划中...</span>
      <span v-else>🎯 规划路径</span>
    </button>

    <!-- 路线指标 -->
    <div v-if="routeResult" class="route-result">
      <div class="result-title">📊 路线结果</div>
      <div class="result-item"><span class="result-label">出行模式</span><span class="result-value">{{ routeResult.mode === 'walk' ? '🚶 纯步行' : '🚇 地铁+步行' }}</span></div>
      <div class="result-item"><span class="result-label">总距离</span><span class="result-value">{{ formatDistance(routeResult.distance) }}</span></div>
      <div class="result-item"><span class="result-label">预估耗时</span><span class="result-value">{{ routeResult.duration }} 分钟</span></div>
      <div v-if="routeResult.transitCount > 0" class="result-item"><span class="result-label">换乘次数</span><span class="result-value">{{ routeResult.transitCount }} 次</span></div>
    </div>

    <!-- 🔶 第九阶段：时长约束 -->
    <div class="time-budget-section">
      <div class="section-title">⏱️ 时长约束</div>
      <div class="budget-input-row">
        <input v-model.number="timeBudget" type="number" min="30" max="1440" placeholder="例如 240" class="budget-input" />
        <span class="budget-unit">分钟</span>
        <button class="btn-apply-budget" :disabled="!timeBudget" @click="handleApplyBudget">✓ 筛选</button>
      </div>

      <div class="budget-presets">
        <span class="preset-label">快捷：</span>
        <button v-for="p in presetBudgets" :key="p" class="preset-btn" @click="timeBudget = p">{{ p }}min</button>
      </div>

      <div v-if="budgetResult" class="budget-result">
        <div class="budget-header"><span class="budget-icon">📋</span><span class="budget-title">筛选结果</span></div>
        <div class="budget-body">
          <div v-if="budgetResult.removedCount === 0" class="budget-note ok">✓ 所有景点均在时长预算内</div>
          <div v-else>
            <div class="budget-removed-title">🚫 已剔除 {{ budgetResult.removedCount }} 个景点（共省 {{ budgetResult.savedMinutes }}min）</div>
            <div class="budget-kept-title">✓ 保留 {{ budgetResult.keptCount }} 个景点</div>
          </div>
          <button v-if="budgetResult.removedCount > 0" class="btn-undo-budget" @click="handleUndoBudget">↩ 撤销筛选</button>
        </div>
      </div>
    </div>

    <div v-if="DEBUG_MODE" class="debug-info">
      <p>出行模式: {{ travelMode }}</p>
      <p>🔴 TODO: 后续对接后端贪心筛选接口</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DEBUG_MODE, USE_MOCK } from '@/constants/config'
import { routeApi } from '@/api'

const props = defineProps({
  startPoint: { type: Array, default: null },
  endPoint: { type: Array, default: null }
})

const emit = defineEmits(['clear-points', 'plan-route', 'apply-budget', 'undo-budget'])

// 原有状态
const travelMode = ref('walk')
const routeResult = ref(null)
const loading = ref(false)

// 🔶 第九阶段
const timeBudget = ref(null)
const budgetResult = ref(null)
const presetBudgets = [120, 180, 240, 360]

async function handlePlanRoute() {
  loading.value = true
  routeResult.value = null
  try {
    // 后端请求：支持 USE_MOCK 自动切换
    const res = await routeApi.planRoute({
      origin: props.startPoint,
      destination: props.endPoint,
      mode: travelMode.value,
      algorithm: 'astar'
    })
    routeResult.value = res.metrics
    emit('plan-route', {
      start: props.startPoint, end: props.endPoint,
      mode: travelMode.value,
      geoJson: res.geojson,
      metrics: res.metrics,
      segments: res.segments
    })
  } catch (err) {
    console.error('[RoutePlanner] 路径规划失败:', err)
    alert(USE_MOCK
      ? 'Mock 模式异常，请检查 registerMockHandler 是否注册' 
      : `后端请求失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 🔶 第九阶段
function handleApplyBudget() { emit('apply-budget', { timeBudget: timeBudget.value }) }
function handleUndoBudget() { budgetResult.value = null; emit('undo-budget') }

function formatDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(1) + 'km'
  return meters + 'm'
}

// 暴露给 App.vue 回传筛选结果
defineExpose({
  setBudgetResult(result) { budgetResult.value = result }
})
</script>

<style scoped>
.route-planner-panel {
  position: absolute; top: 16px; left: 16px; width: 280px;
  background: #fff; border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 16px; z-index: 900;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.panel-title { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #222; padding-bottom: 8px; border-bottom: 1px solid #eee; }

.endpoint-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.endpoint-item { display: flex; align-items: center; gap: 8px; }
.endpoint-label { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.endpoint-label.start { background: #27ae60; }
.endpoint-label.end { background: #e74c3c; }
.endpoint-info { flex: 1; font-size: 12px; }
.endpoint-coord { color: #333; font-family: monospace; }
.endpoint-empty { color: #999; font-style: italic; }
.btn-clear { margin-top: 4px; padding: 6px 12px; font-size: 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; }
.btn-clear:hover:not(:disabled) { background: #f5f5f5; }
.btn-clear:disabled { opacity: 0.5; cursor: not-allowed; }

.mode-section { margin-bottom: 12px; }
.mode-label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.mode-switch { display: flex; gap: 8px; }
.mode-option { flex: 1; text-align: center; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.15s; user-select: none; }
.mode-option.active { border-color: #3498db; background: #ebf5fb; color: #2980b9; font-weight: 600; }

.btn-plan { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #3498db; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-plan:hover:not(:disabled) { background: #2980b9; }
.btn-plan:disabled { background: #bdc3c7; cursor: not-allowed; }

.route-result { margin-top: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
.result-title { font-size: 13px; font-weight: 600; color: #222; margin-bottom: 8px; }
.result-item { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
.result-label { color: #666; }
.result-value { color: #222; font-weight: 500; }

/* 🔶 第九阶段 */
.time-budget-section { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #ddd; }
.section-title { font-size: 13px; font-weight: 600; color: #222; margin-bottom: 8px; }
.budget-input-row { display: flex; align-items: center; gap: 6px; }
.budget-input { flex: 1; padding: 6px 8px; font-size: 13px; border: 1px solid #ddd; border-radius: 5px; background: #fff; }
.budget-input:focus { outline: none; border-color: #3498db; }
.budget-unit { font-size: 12px; color: #666; }
.btn-apply-budget { padding: 6px 10px; font-size: 12px; font-weight: 600; background: #8e44ad; color: #fff; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap; }
.btn-apply-budget:hover:not(:disabled) { background: #7d3c98; }
.btn-apply-budget:disabled { background: #bdc3c7; cursor: not-allowed; }

.budget-presets { display: flex; gap: 4px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
.preset-label { font-size: 11px; color: #888; margin-right: 2px; }
.preset-btn { padding: 3px 8px; font-size: 11px; border: 1px solid #ddd; background: #fff; border-radius: 10px; cursor: pointer; color: #666; }
.preset-btn:hover { border-color: #8e44ad; color: #8e44ad; }

.budget-result { margin-top: 10px; padding: 10px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; }
.budget-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #222; margin-bottom: 6px; }
.budget-icon { font-size: 14px; }
.budget-body { font-size: 11px; color: #555; }
.budget-note.ok { color: #27ae60; font-weight: 500; }
.budget-removed-title { color: #e74c3c; font-weight: 600; margin-bottom: 4px; }
.budget-kept-title { color: #27ae60; font-weight: 600; }
.btn-undo-budget { margin-top: 8px; padding: 4px 10px; font-size: 11px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; color: #666; }
.btn-undo-budget:hover { border-color: #e67e22; color: #e67e22; }

.debug-info { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd; font-size: 11px; color: #999; }
.debug-info p { margin: 2px 0; }
</style>