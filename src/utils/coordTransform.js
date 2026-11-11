// =======================================================
// 【第一阶段核心：坐标系转换工具】
// 约束：WGS84(EPSG:4326) ↔ Web墨卡托(EPSG:3857)双向转换，适配OpenLayers
// 依赖：OpenLayers 原生 ol/proj 模块（已在package.json: "ol": "^9.2.0"）
// 说明：OpenLayers默认支持这两种投影，无需额外安装proj4
// =======================================================

import { transform } from 'ol/proj';

// -------------------------------------------------------
// 常量定义（避免硬编码字符串）
// -------------------------------------------------------
const WGS84 = 'EPSG:4326';    // 全球经纬度坐标（GeoServer/后端常用）
const WEB_MERC = 'EPSG:3857'; // Web墨卡托（OpenLayers地图实例默认坐标系）

// -------------------------------------------------------
// 【核心函数1】WGS84 → Web墨卡托（经纬度→地图像素坐标）
// -------------------------------------------------------
/**
 * 将WGS84坐标（经纬度）转换为Web墨卡托坐标
 * @param {[number, number]} coord 输入坐标 [lon, lat]（经度在前，纬度在后）
 * @returns {[number, number]} 输出坐标 [x, y]（Web墨卡托）
 * @throws {Error} 输入坐标格式错误时抛出
 *
 * 【后续扩展位置】
 * - 渲染GeoServer返回的WGS84 GeoJSON到OpenLayers地图前：必须先转换
 * - 后端返回的POI经纬度、路径经纬度：必须先转换
 */
export function wgs84ToWebMerc(coord) {
  // 输入校验（防止后续渲染异常）
  if (!Array.isArray(coord) || coord.length !== 2 ||
      typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
    throw new Error('wgs84ToWebMerc: 输入必须是[lon, lat]格式的数字数组');
  }
  return transform(coord, WGS84, WEB_MERC);
}

// -------------------------------------------------------
// 【核心函数2】Web墨卡托 → WGS84（地图像素坐标→经纬度）
// -------------------------------------------------------
/**
 * 将Web墨卡托坐标转换为WGS84坐标（经纬度）
 * @param {[number, number]} coord 输入坐标 [x, y]（OpenLayers地图点击事件返回值）
 * @returns {[number, number]} 输出坐标 [lon, lat]（经度在前，纬度在后）
 * @throws {Error} 输入坐标格式错误时抛出
 *
 * 【后续扩展位置】
 * - 地图拾取起终点后：需转换为WGS84发给后端接口
 * - POI点击事件返回的Web墨卡托坐标：转换为经纬度传给WFS查询
 */
export function webMercToWgs84(coord) {
  if (!Array.isArray(coord) || coord.length !== 2 ||
      typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
    throw new Error('webMercToWgs84: 输入必须是[x, y]格式的数字数组');
  }
  return transform(coord, WEB_MERC, WGS84);
}

// -------------------------------------------------------
// 【批量转换工具】（后续GeoJSON批量处理用）
// -------------------------------------------------------
/**
 * 批量转换坐标数组（比如GeoJSON的coordinates数组）
 * @param {Array<[number, number]>} coords 多个坐标组成的数组
 * @param {'wgs84→merc' | 'merc→wgs84'} direction 转换方向
 * @returns {Array<[number, number]>} 转换后的坐标数组
 *
 * 【后续扩展位置】
 * - 后端返回的整条路径GeoJSON：批量转换所有坐标点
 * - GeoServer WFS返回的多个POI：批量转换
 */
export function batchTransform(coords, direction = 'wgs84→merc') {
  if (!Array.isArray(coords)) throw new Error('batchTransform: 输入必须是坐标数组');

  const transformFn = direction === 'wgs84→merc' ? wgs84ToWebMerc : webMercToWgs84;
  return coords.map(coord => transformFn(coord));
}
// GCJ-02 加密算法核心参数（国测局公开的数学常数）
const PI = Math.PI;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function outOfChina(lon, lat) {
  return !(lon > 73.66 && lon < 135.05 && lat > 3.86 && lat < 53.55);
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLon(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

/**
 * WGS84 → GCJ-02（火星坐标）
 * 仅中国大陆有效，海外直接返回原值
 * @param {[number, number]} coord [lon, lat]
 * @returns {[number, number]} GCJ-02坐标
 */
export function wgs84ToGcj02(coord) {
  if (!Array.isArray(coord) || coord.length !== 2) {
    throw new Error('wgs84ToGcj02: 输入必须是[lon, lat]格式数组');
  }
  const [lon, lat] = coord;
  if (outOfChina(lon, lat)) return [lon, lat];

  let dLat = transformLat(lon - 105.0, lat - 35.0);
  let dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  return [lon + dLon, lat + dLat];
}
// -------------------------------------------------------
// 【控制台测试示例】（第一阶段验证用，后续可删除）
// -------------------------------------------------------
// 打开浏览器F12控制台，执行：
// import { wgs84ToWebMerc, webMercToWgs84 } from '@/utils/coordTransform';
// const chengduWgs = [104.0668, 30.5728]; // 成都春熙路经纬度（WGS84）
// const chengduMerc = wgs84ToWebMerc(chengduWgs);
// console.log('转换后Web墨卡托:', chengduMerc); // 应输出[x, y]
// console.log('反转换回WGS84:', webMercToWgs84(chengduMerc)); // 应输出接近[104.0668, 30.5728]