<!--
  【应用根组件】
  只做路由出口 + 顶部导航栏
  各页面独立维护自己的左侧参数面板 + 中间地图 + 右侧视图
-->
<template>
  <div class="app-pages-wrapper">

    <!-- ========== 顶部导航栏 ========== -->
    <nav class="top-nav">
      <div class="nav-brand">🗺️ 蓉城游踪</div>
      <div class="nav-links">
        <router-link to="/"                class="nav-link" active-class="active">🏠 首页 · 地图总览</router-link>
        <router-link to="/point-plan"      class="nav-link" active-class="active">📍 单点路径规划</router-link>
        <router-link to="/multi-spot-plan" class="nav-link" active-class="active">🎯 多景点游览</router-link>
        <router-link v-if="store.isDebugMode" to="/dev-performance" class="nav-link dev" active-class="active">🛠️ 开发者工具</router-link>
      </div>
      <div class="nav-toggles">
        <button class="nav-toggle-btn" :class="{ active: store.isSelectPointMode }"
          @click="store.toggleSelectPoint()"
          :title="store.isSelectPointMode ? '选点模式已开启 · 点地图拾取起终点' : '选点模式（单点规划页生效）'"
        >📍 选点</button>
        <button class="nav-toggle-btn" :class="{ active: store.isDebugMode }"
          @click="store.toggleDebug()"
          :title="store.isDebugMode ? '调试模式已开启 · 显示开发者入口' : '调试模式'"
        >🛠️ 调试</button>
      </div>
    </nav>

    <!-- ========== 选点模式激活提示条（全局） ========== -->
    <div v-if="store.isSelectPointMode" class="select-banner">
      <span>📍 选点模式：{{ store.selectedStart ? '✅ 起点已拾取 · 继续点击地图拾取终点' : '点地图拾取起点' }}</span>
      <button class="banner-close" @click="store.toggleSelectPoint()">✕ 退出</button>
    </div>

    <!-- ========== 路由出口 ========== -->
    <main class="page-container" :class="{ 'has-banner': store.isSelectPointMode }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/store/global'
const store = useGlobalStore()

// ESC 快捷退出选点模式
function onKey(e) { if (e.key === 'Escape' && store.isSelectPointMode) store.toggleSelectPoint() }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.top-nav {
  height: 52px; background: var(--color-card); border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; padding: 0 20px; gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06); flex-shrink: 0;
}
.nav-brand { font-size: 16px; font-weight: 700; color: var(--color-primary); letter-spacing: 1px; white-space: nowrap; }
.nav-links { display: flex; gap: 2px; flex: 1; flex-wrap: wrap; }
.nav-link {
  padding: 6px 12px; border-radius: var(--radius-btn); font-size: 12px;
  color: var(--color-text-sub); text-decoration: none; transition: all 0.15s;
}
.nav-link:hover { background: var(--color-btn-sec-bg); color: var(--color-text); }
.nav-link.active { background: var(--color-tab-bg); color: var(--color-primary); font-weight: 600; }
.nav-link.dev { border: 1px dashed var(--color-border); }

.nav-toggles { display: flex; gap: 6px; }
.nav-toggle-btn {
  padding: 5px 10px; font-size: 11px; border: 1px solid var(--color-border);
  background: #fff; border-radius: var(--radius-btn); cursor: pointer;
  transition: all 0.15s; color: var(--color-text-sub);
}
.nav-toggle-btn:hover { border-color: var(--color-primary); }
.nav-toggle-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

.select-banner {
  height: 30px; background: #fff5f5; border-bottom: 1px solid var(--color-primary);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; font-size: 12px; color: var(--color-primary); font-weight: 600;
}
.banner-close { border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--color-primary); opacity: 0.6; }
.banner-close:hover { opacity: 1; }

.page-container { flex: 1; overflow: hidden; position: relative; }
.page-container.has-banner { height: calc(100% - 82px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>