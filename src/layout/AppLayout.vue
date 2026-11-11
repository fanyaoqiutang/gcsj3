<!--
  【第十阶段：布局重构】
  布局结构：
  ┌────────┬──────────────────┬────────────┐
  │ Left   │                  │ Right      │
  │ Sidebar│   Map Area       │ Sidebar    │
  │        │                  │            │
  │ Route  │   MapContainer   │ Itinerary  │
  │ Planner│   + PoiPopup     │ + Guide    │
  │ Route  │                  │            │
  │ Opt    │                  │            │
  └────────┴──────────────────┴────────────┘

  折叠时左侧 → 仅显示折叠按钮(40px)，右侧同理
  中间地图自动 flex:1 填满剩余空间

  设计亮点：
  ① 用 :deep() 穿透覆盖子组件原本的 position:absolute
  ② 子组件文件 0 修改（除了 MapContainer 加 autoPan）
  ③ 折叠有 0.3s 过渡动画
-->
<template>
  <div class="app-layout">

    <!-- ========== 左侧侧边栏 ========== -->
    <aside class="sidebar left-sidebar" :class="{ collapsed: leftCollapsed }">
      <!-- 折叠按钮 -->
      <div class="collapse-bar">
        <button class="collapse-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开左侧面板' : '收起左侧面板'">
          <span class="collapse-icon">{{ leftCollapsed ? '»' : '«' }}</span>
        </button>
        <span v-if="!leftCollapsed" class="collapse-label">规划面板</span>
      </div>

      <!-- 左侧 slot 内容 -->
      <div v-show="!leftCollapsed" class="sidebar-content">
        <slot name="left-top" />      <!-- RoutePlanner -->
        <slot name="left-bottom" />   <!-- RouteOptionsPanel -->
      </div>
    </aside>

    <!-- ========== 中间地图区 ========== -->
    <main class="map-area">
      <slot name="map" />            <!-- MapContainer + PoiPopup -->
    </main>

    <!-- ========== 右侧侧边栏 ========== -->
    <aside class="sidebar right-sidebar" :class="{ collapsed: rightCollapsed }">
      <div class="collapse-bar">
        <button class="collapse-btn" @click="rightCollapsed = !rightCollapsed" :title="rightCollapsed ? '展开右侧面板' : '收起右侧面板'">
          <span class="collapse-icon">{{ rightCollapsed ? '«' : '»' }}</span>
        </button>
        <span v-if="!rightCollapsed" class="collapse-label">我的日程</span>
      </div>

      <div v-show="!rightCollapsed" class="sidebar-content">
        <slot name="right" />         <!-- ItineraryPanel + GuidePanel -->
      </div>
    </aside>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DEBUG_MODE } from '@/constants/config'

// 默认展开；调试时方便
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
</script>

<style scoped>
/* ===== 根布局：三栏 flex ===== */
.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f4f6f8;
}

/* ===== 通用侧边栏 ===== */
.sidebar {
  background: #fafbfc;
  border-right: 1px solid #e4e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, border-width 0.3s ease;
  flex-shrink: 0;
}

/* 左栏 */
.left-sidebar {
  width: 310px;
  border-right: 1px solid #e4e7eb;
}
.left-sidebar.collapsed { width: 40px; border-right-width: 1px; }

/* 右栏 */
.right-sidebar {
  width: 340px;
  border-left: 1px solid #e4e7eb;
  border-right: none;
}
.right-sidebar.collapsed { width: 40px; border-left-width: 1px; }

/* 折叠按钮条 */
.collapse-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
  background: #f0f2f5;
  flex-shrink: 0;
  min-height: 40px;
}
.collapse-btn {
  width: 28px; height: 28px;
  border: 1px solid #d0d4da;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.collapse-btn:hover { background: #3498db; border-color: #3498db; }
.collapse-btn:hover .collapse-icon { color: #fff; }
.collapse-icon { font-size: 14px; font-weight: 700; color: #555; }
.collapse-label { font-size: 13px; font-weight: 600; color: #333; white-space: nowrap; }

/* 侧边栏可滚动内容区 */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar-content::-webkit-scrollbar { width: 5px; }
.sidebar-content::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }

/* ===== 中间地图区 ===== */
.map-area {
  flex: 1;
  min-width: 0;                    /* 防止 flex 子项溢出 */
  position: relative;              /* 子组件的 overlay 相对此定位 */
  overflow: hidden;
  background: #eef2f5;
}

/* ===== :deep() 魔法：覆盖子组件的悬浮定位 ===== */
/* 让子组件从 position:absolute 变成静态流内元素，填满侧边栏 */

/* RoutePlanner.vue */
:deep(.route-planner-panel) {
  position: static !important;     /* 干掉 absolute */
  top: auto !important; left: auto !important;
  width: 100% !important;          /* 填满侧边栏 */
  margin: 0 !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;  /* 减弱阴影 */
}

/* RouteOptionsPanel（假设有类似类名，兜底） */
:deep(.route-options-panel),
:deep(.options-panel) {
  position: static !important;
  top: auto !important; right: auto !important;
  width: 100% !important;
  margin: 0 !important;
}

/* ItineraryPanel */
:deep(.itinerary-panel) {
  position: static !important;
  top: auto !important; right: auto !important;
  width: 100% !important;
  margin: 0 !important;
}

/* GuidePanel */
:deep(.guide-panel) {
  position: static !important;
  top: auto !important; right: auto !important;
  width: 100% !important;
  max-height: none !important;     /* 允许完整显示 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
}

/* PoiPopup：地图 overlay，保持绝对定位但相对 map-area */
:deep(.poi-popup-overlay) {
  position: absolute !important;
  /* 这个要根据 MapContainer 里的 Overlay 坐标动态定位 */
}
</style>
