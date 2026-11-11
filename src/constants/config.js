// =======================================================
// 【第一阶段常量】全局开关（无登录，前端本地控制）
// =======================================================

/**
 * 调试模式：true=显示调试工具面板，false=隐藏
 * 后续联调时设为 false 即可隐藏所有 debug UI
 */
export const DEBUG_MODE = true   // 🔴 发布前设为 false

/**
 * Mock 开关：true=前端 mock 数据，false=调用真实后端接口
 * 所有 API 请求统一走 src/api/index.js，只改这个文件即可切换
 * 后续联调时改为 false，同时 api/guide.js 里换成真实 axios 请求
 *
 * 设计原则：页面组件只调用 api 函数，不关心数据来源
 */
export const USE_MOCK = true     // 🔴 对接后端时设为 false

// 可选：挂载到Vue全局属性/浏览器window，方便后续组件/控制台调用
// （第一阶段临时调试用，后续可按需调整）
if (typeof window !== 'undefined') {
  window.$DEBUG_MODE = DEBUG_MODE; // 控制台直接访问验证
}