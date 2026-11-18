// =======================================================
// 【路由配置 · 4 个页面 · 严格对齐总体设计文档】
// 页面 1：/                 首页 · 地图总览
// 页面 2：/point-plan       单点路径规划（两点寻路）
// 页面 3：/multi-spot-plan  多景点游览规划（TSP 多点串联，无 Day 分组）
// 页面 4：/dev-performance   开发者性能测试（调试开关守卫）
// =======================================================

import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/',                name: 'home',         component: () => import('@/views/HomePage.vue'),             meta: { title: '首页 · 地图总览' } },
  { path: '/point-plan',      name: 'pointPlan',    component: () => import('@/views/PointPlanPage.vue'),       meta: { title: '单点路径规划' } },
  { path: '/multi-spot-plan', name: 'multiSpotPlan', component: () => import('@/views/MultiSpotPlanPage.vue'), meta: { title: '多景点游览规划' } },
  { path: '/dev-performance', name: 'devPerf',      component: () => import('@/views/DevPerformancePage.vue'),  meta: { title: '开发者性能测试', requiresDebug: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 🔴 调试开关守卫：非调试模式访问 /dev-performance → 重定向首页
router.beforeEach(async (to) => {
  if (to.meta.requiresDebug) {
    const { useGlobalStore } = await import('@/store/global')
    const store = useGlobalStore()
    if (!store.isDebugMode) {
      console.warn('[Router] 非调试模式，隐藏开发者页面入口')
      return { path: '/' }
    }
  }
})

export default router