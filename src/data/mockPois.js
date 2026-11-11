// =======================================================
// 【第三阶段：Mock POI 景点数据】
// 🔴 TODO: 后续替换为 GeoServer WFS 查询返回的真实要素
// 坐标：用户从高德获取的 GCJ-02 精确值（100%对齐高德瓦片底图）
//       后续 GeoServer WGS84 底图上线 → 改回 WGS84 坐标
// =======================================================

export const mockPois = [
  {
    id: 'poi_001',
    name: '宽窄巷子',
    description: '成都最具代表性的历史文化街区，由宽巷子、窄巷子和井巷子三条平行排列的老式街道及四合院落群组成，是成都生活方式的活化石。',
    imageUrl: 'https://img.zcool.cn/community/01c9aa5d4a1f7da8012193a3e8bf5f.jpg@1280w_1l_2o_100sh.jpg',
    stayDuration: 120,
    crowdIndex: 4,
    lon: 104.053307,   // ✅ 高德 GCJ-02 精确值
    lat: 30.663869
  },
  {
    id: 'poi_002',
    name: '锦里古街',
    description: '武侯祠大街旁的古商业街，以三国文化为底蕴，集川西民俗、美食小吃、休闲娱乐于一体，是成都旅游必打卡之地。',
    imageUrl: 'https://img2.baidu.com/it/u=2634432025,2856699283&fm=253&fmt=auto',
    stayDuration: 90,
    crowdIndex: 5,
    lon: 104.049828,   // ✅ 高德 GCJ-02 精确值
    lat: 30.645994
  },
  {
    id: 'poi_003',
    name: '武侯祠博物馆',
    description: '中国唯一的君臣合祀祠庙，纪念蜀汉丞相诸葛亮的名胜古迹，由武侯祠、汉昭烈庙及惠陵组成。',
    imageUrl: 'https://img2.baidu.com/it/u=3279343384,3127892440&fm=253&fmt=auto',
    stayDuration: 60,
    crowdIndex: 3,
    lon: 104.047992,   // ✅ 高德 GCJ-02 精确值
    lat: 30.646168
  },
  {
    id: 'poi_004',
    name: '大熊猫繁育研究基地',
    description: '中国最大的大熊猫科研繁育基地，位于成都市成华区，是全球游客近距离观赏大熊猫的首选之地。',
    imageUrl: 'https://img1.baidu.com/it/u=1801457029,2887739766&fm=253&fmt=auto',
    stayDuration: 180,
    crowdIndex: 5,
    lon: 104.138176,   // ✅ 高德 GCJ-02 精确值
    lat: 30.740573
  },
  {
    id: 'poi_005',
    name: '春熙路商圈',
    description: '成都最繁华的商业步行街，聚集了众多国内外品牌旗舰店、美食餐厅、电影院，是成都现代化都市的缩影。',
    imageUrl: 'https://img0.baidu.com/it/u=3603518344,2683314560&fm=253&fmt=auto',
    stayDuration: 150,
    crowdIndex: 5,
    lon: 104.077774,   // ✅ 高德 GCJ-02 精确值
    lat: 30.655544
  }
]