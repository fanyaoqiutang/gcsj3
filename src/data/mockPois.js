// =======================================================
// 【第三阶段：Mock POI 景点数据】
// 🔴 TODO: 后续替换为 GeoServer WFS 查询返回的真实要素
// 坐标：用户从高德获取的 GCJ-02 精确值（100%对齐高德瓦片底图）
//       后续 GeoServer WGS84 底图上线 → 改回 WGS84 坐标
// =======================================================

export const POI_CATEGORIES = [
  { key: 'all',   label: '🏮 全部' },
  { key: 'culture', label: '🏯 人文古迹' },
  { key: 'food',   label: '🍜 美食街区' },
  { key: 'nature', label: '🐼 自然风光' },
  { key: 'halfday',label: '⏳ 半日打卡' }
]

export const mockPois = [
  { id:'poi_001', name:'宽窄巷子', category:'culture', stayDuration:120, crowdIndex:4, lon:104.053307, lat:30.663869, imageUrl:'https://img.zcool.cn/community/01c9aa5d4a1f7da8012193a3e8bf5f.jpg@1280w_1l_2o_100sh.jpg', description:'成都最具代表性的历史文化街区，三条老式街道及四合院落群组成。' },
  { id:'poi_002', name:'锦里古街', category:'food',    stayDuration:90,  crowdIndex:5, lon:104.049828, lat:30.645994, imageUrl:'https://img2.baidu.com/it/u=2634432025,2856699283&fm=253&fmt=auto', description:'武侯祠旁三国文化商业街，集川西民俗与小吃于一体。' },
  { id:'poi_003', name:'武侯祠博物馆', category:'culture', stayDuration:60,  crowdIndex:3, lon:104.047992, lat:30.646168, imageUrl:'https://img2.baidu.com/it/u=3279343384,3127892440&fm=253&fmt=auto', description:'中国唯一君臣合祀祠庙，纪念蜀汉丞相诸葛亮。' },
  { id:'poi_004', name:'大熊猫繁育研究基地', category:'nature', stayDuration:180, crowdIndex:5, lon:104.138176, lat:30.740573, imageUrl:'https://img1.baidu.com/it/u=1801457029,2887739766&fm=253&fmt=auto', description:'全球最大的大熊猫科研繁育基地，近距离观赏首选。' },
  { id:'poi_005', name:'春熙路商圈', category:'food',   stayDuration:150, crowdIndex:5, lon:104.077774, lat:30.655544, imageUrl:'https://img0.baidu.com/it/u=3603518344,2683314560&fm=253&fmt=auto', description:'成都最繁华的商业步行街，品牌旗舰店聚集。' },
  { id:'poi_006', name:'杜甫草堂博物馆', category:'culture', stayDuration:90, crowdIndex:3, lon:104.041285, lat:30.665565, imageUrl:'https://img3.baidu.com/it/u=2008027544,652387103&fm=253&fmt=auto', description:'诗圣杜甫流寓成都时的故居，文化圣地。' },
  { id:'poi_007', name:'合江亭', category:'nature',    stayDuration:40,  crowdIndex:2, lon:104.088919, lat:30.644692, imageUrl:'https://img2.baidu.com/it/u=2647031588,3686491036&fm=253&fmt=auto', description:'两江交汇处的标志性建筑，夜景绝佳。' },
  { id:'poi_008', name:'太古里方所', category:'halfday', stayDuration:120, crowdIndex:4, lon:104.082182, lat:30.656851, imageUrl:'https://img1.baidu.com/it/u=1752502653,758016575&fm=253&fmt=auto', description:'文艺书店 + 时尚商圈，半日闲逛首选。' }
]