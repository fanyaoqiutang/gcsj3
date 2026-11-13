
# ========================================================

# 路网图构建器

# USE_POSTGIS = True  → 从 PostGIS 的 walk_edge 表加载

# USE_POSTGIS = False → 用内置测试小图（10节点+地铁）
#

# 输出：NetworkX.Graph（无向图，道路双向可通）

# 每个节点有 lon/lat 属性

# 每条边有 length_m（米）、weight（秒）、mode（walk/metro）

# ========================================================
import networkx as nx
import logging

log = logging.getLogger(__name__)

class GraphBuilder:
    def __init__(self):
        self.graph = nx.Graph()
        self.use_postgis = False
        # 反向索引：node_id → [lon, lat]（用于坐标匹配）
        self.node_coords = {}

    # ---------- 加载入口 ----------
    def load(self):
        from back.config import Config
        self.use_postgis = Config.USE_POSTGIS
        if self.use_postgis:
            self._load_from_postgis()
        else:
            self._load_test_graph()
        self._build_node_coords()
        log.info(f"✅ 图加载完成: {self.graph.number_of_nodes()} 节点, {self.graph.number_of_edges()} 边")

    # ---------- PostGIS 模式 ----------
    def _load_from_postgis(self):
        from back.db.connection import get_connection
        from back.config import Config

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # 读步行路网边
                cur.execute("""
                    SELECT node_from, node_to,
                           ST_Length(ST_Transform(geom, 4326)::geography) AS length_m,
                           ST_X(ST_StartPoint(geom)) AS x1, ST_Y(ST_StartPoint(geom)) AS y1,
                           ST_X(ST_EndPoint(geom))   AS x2, ST_Y(ST_EndPoint(geom))   AS y2
                    FROM walk_edge
                    WHERE blocked = FALSE;
                """)
                for row in cur.fetchall():
                    n1, n2 = str(row['node_from']), str(row['node_to'])
                    length = float(row['length_m'] or 0)
                    if length <= 0:
                        continue
                    # 秒代价 = 距离 / 步行速度
                    weight = length / Config.WALK_SPEED_MS
                    self.graph.add_node(n1, lon=row['x1'], lat=row['y1'])
                    self.graph.add_node(n2, lon=row['x2'], lat=row['y2'])
                    self.graph.add_edge(n1, n2, length_m=length, weight=weight, mode='walk')

                log.info("   walk_edge 加载完毕")

                # 读地铁站点 → 换乘到图里
                cur.execute("SELECT gid, name, transfer_min, ST_X(geom) AS x, ST_Y(geom) AS y FROM metro_station;")
                stations = cur.fetchall()
                station_ids = {}  # gid → node_id

                # 读地铁线路的 shape，拆成节点+边
                cur.execute("""
                    SELECT gid, line_ids, transfer_min,
                           ST_DumpPoints(ST_Transform(geom, 4326)) AS dump
                    FROM metro_line;
                """)
                # 地铁边暂时简化：站点之间连起来
                for s in stations:
                    node_id = f"metro_{s['gid']}"
                    self.graph.add_node(node_id, lon=float(s['x']), lat=float(s['y']))
                    station_ids[s['gid']] = node_id

                # 地铁线路：按 line_ids 排序站点 → 连边
                # 简化版：同一 line_ids 的所有站点两两相连
                from collections import defaultdict
                line_groups = defaultdict(list)
                for s in stations:
                    for lid in (s['line_ids'] or []):
                        line_groups[lid].append((s['gid'], float(s['x']), float(s['y'])))

                for lid, group in line_groups.items():
                    group.sort()  # 按 gid 排序近似线路走向
                    for i in range(len(group) - 1):
                        _, x1, y1 = group[i]
                        _, x2, y2 = group[i+1]
                        import math
                        dist = math.hypot((x2-x1)*85000, (y2-y1)*111000)
                        weight = dist / Config.METRO_SPEED_MS + Config.TRANSFER_TIME_SEC
                        self.graph.add_edge(station_ids[group[i][0]], station_ids[group[i+1][0]],
                                           length_m=dist, weight=weight, mode='metro')

        finally:
            conn.close()

    # ---------- 测试小图模式 ----------
    def _load_test_graph(self):
        """
        手写一个成都核心区的模拟路网（10节点 + 2条地铁）
        节点名用真实地名，坐标用真实位置近似值
        """
        import math as _m

        nodes = {
            '春熙路':      (104.0778, 30.6555),
            '太古里':      (104.0770, 30.6547),
            '天府广场':    (104.0668, 30.6573),
            '人民公园':    (104.0606, 30.6610),
            '宽窄巷子':    (104.0533, 30.6639),
            '杜甫草堂':    (104.0284, 30.6629),
            '武侯祠':      (104.0424, 30.6402),
            '锦里':        (104.0429, 30.6399),
            '望江楼':      (104.0969, 30.6363),
            '东客站':      (104.1545, 30.6080),
        }

        # 步行道路（两两可通，weight 按距离/速度算）
        walk_edges = [
            ('春熙路', '天府广场'),
            ('春熙路', '太古里'),
            ('天府广场', '人民公园'),
            ('人民公园', '宽窄巷子'),
            ('宽窄巷子', '杜甫草堂'),
            ('天府广场', '武侯祠'),
            ('武侯祠', '锦里'),
            ('春熙路', '望江楼'),
            ('望江楼', '东客站'),
            ('人民公园', '杜甫草堂'),
        ]

        # 地铁线路（地铁2号线：春熙路 → 天府广场 → 人民公园 → 宽窄巷子 一线）
        metro_edges = [
            ('春熙路', '天府广场'),
            ('天府广场', '人民公园'),
            ('人民公园', '宽窄巷子'),
        ]

        def dist_m(a, b):
            x1, y1 = nodes[a]
            x2, y2 = nodes[b]
            return _m.hypot((x2-x1)*85000, (y2-y1)*111000)

        for name, (lon, lat) in nodes.items():
            self.graph.add_node(name, lon=lon, lat=lat)

        for a, b in walk_edges:
            d = dist_m(a, b)
            self.graph.add_edge(a, b, length_m=d, weight=d / 1.2, mode='walk')

        for a, b in metro_edges:
            d = dist_m(a, b)
            self.graph.add_edge(a, b, length_m=d, weight=d / 22.22 + 300, mode='metro')

        log.info("   测试小图构建完成")

    # ---------- 坐标匹配：找最近节点 ----------
    def nearest_node(self, lon, lat):
        """给定经纬度，返回图中最近节点的 node_id"""
        import math as _m
        best, best_d = None, float('inf')
        for nid, (nx, ny) in self.node_coords.items():
            d = _m.hypot((nx-lon)*85000, (ny-lat)*111000)
            if d < best_d:
                best_d, best = d, nid
        return best

    def _build_node_coords(self):
        for nid, attrs in self.graph.nodes(data=True):
            self.node_coords[nid] = (attrs.get('lon', 0), attrs.get('lat', 0))
