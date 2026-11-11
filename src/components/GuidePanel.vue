<!--
  【第十阶段：右侧完整攻略面板】
  数据源：全部通过 api/guide.js 获取，USE_MOCK 开关控制
  功能：
  ✅ 行程概览卡片
  ✅ 大交通信息
  ✅ 预算明细（可编辑）
  ✅ 注意事项
  ✅ 必带物品清单（checkbox 可勾选）
  ✅ 导出攻略（本地生成 TXT/JSON 下载）
-->
<template>
  <div class="guide-panel" v-if="loaded">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h3 class="panel-title">📖 完整攻略</h3>
      <div class="header-actions">
        <button class="btn-export" @click="showExportMenu = !showExportMenu">⬇️ 导出</button>
        <div v-if="showExportMenu" class="export-dropdown">
          <button @click="handleExport('text')">导出 TXT 文本</button>
          <button @click="handleExport('json')">导出 JSON 数据</button>
        </div>
      </div>
    </div>

    <div class="guide-content">
      <!-- ===== Section 1: 行程概览 ===== -->
      <section class="guide-section">
        <h4 class="section-title">📋 行程概览</h4>
        <div class="summary-card">
          <div class="summary-title">{{ summary.title }}</div>
          <div class="summary-metrics">
            <div class="metric-box">
              <span class="metric-num">{{ summary.totalDays }}</span>
              <span class="metric-label">天数</span>
            </div>
            <div class="metric-box">
              <span class="metric-num">{{ summary.totalPois }}</span>
              <span class="metric-label">景点</span>
            </div>
            <div class="metric-box">
              <span class="metric-num">{{ (summary.totalDistance/1000).toFixed(1) }}</span>
              <span class="metric-label">km</span>
            </div>
            <div class="metric-box">
              <span class="metric-num">{{ summary.totalDuration }}</span>
              <span class="metric-label">min</span>
            </div>
          </div>
          <div class="summary-tags">
            <span class="tag" v-for="h in summary.highlights" :key="h">✨ {{ h }}</span>
            <span class="tag difficulty">{{ summary.difficulty }}</span>
            <span class="tag season">{{ summary.bestSeason }}</span>
          </div>
          <div class="summary-notes">{{ summary.notes }}</div>
        </div>
      </section>

      <!-- ===== Section 2: 大交通 ===== -->
      <section class="guide-section">
        <h4 class="section-title">🚆 大交通</h4>
        <div class="transport-grid">
          <div class="transport-card">
            <div class="t-label">到达成都</div>
            <div class="t-detail">
              <span class="t-type">{{ transport.arrival.type }}</span>
              <span class="t-station">{{ transport.arrival.station }}</span>
            </div>
            <div class="t-suggest">{{ transport.arrival.suggestTime }}</div>
            <div class="t-cost">预估 ¥{{ transport.arrival.estimatedCost }}</div>
          </div>
          <div class="transport-card">
            <div class="t-label">离开成都</div>
            <div class="t-detail">
              <span class="t-type">{{ transport.departure.type }}</span>
              <span class="t-station">{{ transport.departure.station }}</span>
            </div>
            <div class="t-suggest">{{ transport.departure.suggestTime }}</div>
            <div class="t-cost">预估 ¥{{ transport.departure.estimatedCost }}</div>
          </div>
        </div>
        <div class="transport-local">
          <span class="local-primary">🚇 市内交通：{{ transport.local.primary }}</span>
          <span class="local-note">{{ transport.local.coverage }}</span>
        </div>
      </section>

      <!-- ===== Section 3: 预算（可编辑） ===== -->
      <section class="guide-section">
        <h4 class="section-title">💰 预算明细</h4>
        <div class="budget-table">
          <div class="budget-row budget-header-row">
            <span class="b-col icon"></span>
            <span class="b-col category">类别</span>
            <span class="b-col amount">金额(¥)</span>
            <span class="b-col note">备注</span>
          </div>
          <div
            v-for="(item, idx) in budget"
            :key="item.category"
            class="budget-row"
          >
            <span class="b-col icon">{{ item.icon }}</span>
            <span class="b-col category">{{ item.category }}</span>
            <input
              v-model.number="item.amount"
              type="number"
              class="b-col amount editable"
              @change="emitBudgetUpdate"
            />
            <input
              v-model="item.note"
              type="text"
              class="b-col note editable"
              @change="emitBudgetUpdate"
            />
          </div>
          <div class="budget-row budget-total">
            <span class="b-col icon"></span>
            <span class="b-col category"><strong>合计</strong></span>
            <span class="b-col amount"><strong>¥{{ budgetTotal }}</strong></span>
            <span class="b-col note"></span>
          </div>
        </div>
      </section>

      <!-- ===== Section 4: 注意事项 ===== -->
      <section class="guide-section">
        <h4 class="section-title">⚠️ 注意事项</h4>
        <ul class="notes-list">
          <li v-for="(n, i) in notes" :key="i" class="note-item">
            <span class="note-type">{{ n.type }}</span>
            <span class="note-content">{{ n.content }}</span>
          </li>
        </ul>
      </section>

      <!-- ===== Section 5: 必带物品 ===== -->
      <section class="guide-section">
        <h4 class="section-title">🎒 必带物品清单</h4>
        <div class="packing-list">
          <div v-for="group in packing" :key="group.category" class="packing-group">
            <div class="packing-category">{{ group.category }}</div>
            <div class="packing-items">
              <label
                v-for="(item, i) in group.items"
                :key="i"
                class="packing-item"
                :class="{ required: item.required, checked: item.checked }"
              >
                <input
                  type="checkbox"
                  v-model="item.checked"
                  @change="emitPackingUpdate"
                />
                <span class="pi-name">{{ item.name }}</span>
                <span v-if="item.required" class="pi-required">★</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="DEBUG_MODE" class="debug-footer">
      <p>数据源: {{ USE_MOCK ? 'MOCK' : '真实后端' }}（config.USE_MOCK={{ USE_MOCK }}）</p>
      <p>🔴 TODO: 后续对接 /api/guide/* 真实接口</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { guideApi } from '@/api/guide'
import { DEBUG_MODE } from '@/constants/config'
import { USE_MOCK } from '@/constants/config'

const emit = defineEmits(['budget-change', 'packing-change'])

const loaded = ref(false)
const showExportMenu = ref(false)

// 数据容器（reactive 让数组元素可编辑）
const summary = reactive({ title: '', totalDays: 0, totalPois: 0, totalDistance: 0, totalDuration: 0, highlights: [], difficulty: '', bestSeason: '', notes: '' })
const transport = reactive({ arrival: {}, departure: {}, local: {} })
const budget = ref([])
const notes = ref([])
const packing = ref([])

onMounted(async () => {
  try {
    await Promise.all([
      guideApi.getSummary().then(d => Object.assign(summary, d)),
      guideApi.getTransport().then(d => Object.assign(transport, d)),
      guideApi.getBudget().then(d => budget.value = d),
      guideApi.getNotes().then(d => notes.value = d),
      guideApi.getPacking().then(d => packing.value = d)
    ])
    loaded.value = true
  } catch (err) {
    console.error('[GuidePanel] 加载失败:', err)
  }
})

const budgetTotal = computed(() => budget.value.reduce((s, b) => s + (b.amount || 0), 0))

function emitBudgetUpdate() { emit('budget-change', budget.value) }
function emitPackingUpdate() {
  guideApi.updatePacking(packing.value)
  emit('packing-change', packing.value)
}

function handleExport(format) {
  showExportMenu.value = false
  guideApi.exportGuide(format, {
    summary, transport, budget: budget.value, notes: notes.value, packing: packing.value
  })
}
</script>

<style scoped>
.guide-panel {
  position: absolute; top: 16px; right: 312px; width: 340px;
  max-height: calc(100vh - 32px);
  background: #fff; border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  z-index: 850;
  display: flex; flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid #eee; flex-shrink: 0;
}
.panel-title { margin: 0; font-size: 16px; font-weight: 600; color: #222; }

.header-actions { position: relative; }
.btn-export {
  padding: 5px 12px; font-size: 12px; border: 1px solid #3498db;
  background: #fff; color: #3498db; border-radius: 5px; cursor: pointer;
}
.btn-export:hover { background: #ebf5fb; }
.export-dropdown {
  position: absolute; top: 32px; right: 0; background: #fff;
  border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 10; overflow: hidden; min-width: 140px;
}
.export-dropdown button {
  display: block; width: 100%; padding: 8px 14px;
  border: none; background: #fff; font-size: 12px;
  text-align: left; cursor: pointer; color: #333;
}
.export-dropdown button:hover { background: #f0f7ff; }

.guide-content { overflow-y: auto; flex: 1; padding: 12px 16px; }
.guide-content::-webkit-scrollbar { width: 5px; }
.guide-content::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

.guide-section { margin-bottom: 18px; }
.section-title {
  margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #222;
  padding-bottom: 6px; border-bottom: 2px solid #3498db;
  display: inline-block;
}

/* 概览 */
.summary-card { padding: 10px; background: #f8f9fa; border-radius: 8px; }
.summary-title { font-size: 15px; font-weight: 600; color: #222; margin-bottom: 10px; text-align: center; }
.summary-metrics { display: flex; justify-content: space-between; margin-bottom: 10px; }
.metric-box { text-align: center; }
.metric-num { display: block; font-size: 18px; font-weight: 700; color: #3498db; }
.metric-label { font-size: 11px; color: #888; }
.summary-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.tag { font-size: 11px; padding: 2px 8px; background: #eaf2ff; color: #2980b9; border-radius: 10px; }
.tag.difficulty { background: #fef9e7; color: #b7950b; }
.tag.season { background: #eafaf1; color: #27ae60; }
.summary-notes { font-size: 11px; color: #666; font-style: italic; }

/* 大交通 */
.transport-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.transport-card { padding: 10px; border: 1px solid #e9ecef; border-radius: 6px; }
.t-label { font-size: 11px; color: #888; margin-bottom: 4px; }
.t-detail { display: flex; gap: 8px; align-items: center; margin-bottom: 3px; }
.t-type { font-size: 12px; font-weight: 600; color: #222; }
.t-station { font-size: 12px; color: #555; }
.t-suggest { font-size: 11px; color: #888; }
.t-cost { font-size: 11px; color: #e67e22; font-weight: 600; margin-top: 2px; }
.transport-local { font-size: 11px; padding: 8px; background: #f8f9fa; border-radius: 6px; }
.local-primary { font-weight: 600; color: #222; margin-right: 6px; }
.local-note { color: #666; }

/* 预算 */
.budget-table { border: 1px solid #e9ecef; border-radius: 6px; overflow: hidden; }
.budget-row { display: flex; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; align-items: center; }
.budget-row:last-child { border-bottom: none; }
.budget-header-row { background: #f8f9fa; color: #666; font-weight: 600; }
.budget-total { background: #fff8e1; }
.b-col { padding: 2px 4px; }
.b-col.icon { width: 20px; text-align: center; }
.b-col.category { flex: 1; min-width: 50px; color: #333; }
.b-col.amount { width: 70px; text-align: right; color: #555; }
.b-col.note { width: 100px; color: #888; font-size: 11px; }
.editable {
  border: 1px solid transparent; background: transparent; padding: 2px 4px;
  border-radius: 3px; font-size: inherit; text-align: inherit; width: auto;
}
.editable:hover { background: #f5f5f5; border-color: #e0e0e0; }
.editable:focus { outline: none; background: #fff; border-color: #3498db; }

/* 注意事项 */
.notes-list { list-style: none; padding: 0; margin: 0; }
.note-item { display: flex; gap: 8px; padding: 6px 0; font-size: 12px; border-bottom: 1px dashed #eee; }
.note-item:last-child { border-bottom: none; }
.note-type { flex-shrink: 0; padding: 1px 6px; background: #fef9e7; color: #b7950b; font-size: 10px; border-radius: 8px; font-weight: 600; height: fit-content; }
.note-content { color: #333; }

/* 必带物品 */
.packing-group { margin-bottom: 10px; }
.packing-category { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; padding-left: 4px; border-left: 3px solid #3498db; }
.packing-items { display: flex; flex-wrap: wrap; gap: 6px; }
.packing-item {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; background: #f8f9fa; border-radius: 14px;
  font-size: 11px; cursor: pointer; user-select: none;
  border: 1px solid transparent;
}
.packing-item:hover { border-color: #3498db; }
.packing-item.checked { background: #eafaf1; color: #27ae60; text-decoration: line-through; }
.packing-item input { margin: 0; cursor: pointer; }
.pi-required { color: #e74c3c; font-weight: 700; }

/* debug */
.debug-footer { padding: 10px; border-top: 1px dashed #ddd; font-size: 10px; color: #999; text-align: center; }
.debug-footer p { margin: 2px 0; }
</style>