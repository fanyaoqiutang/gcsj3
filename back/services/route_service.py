
# ========================================================

# 路径规划业务层

# 编排流程：坐标匹配 → 选算法 → 求解 → 组装 GeoJSON

# ========================================================
from back.algorithms.dijkstra import shortest_path_dijkstra
from back.algorithms.astar import shortest_path_astar
import networkx as nx

def plan_route(graph, origin_xy, dest_xy, mode='walk', algorithm='astar'):
    """
    参数:
      origin_xy, dest_xy: [lon, lat]
      mode:    'walk' | 'transit'（地铁+步行）
      algorithm: 'dijkstra' | 'astar'
    返回: { total_distance_m, total_time_sec, segments, geometry } 或 None
    """
    # 1. 坐标匹配 → 图中节点
    start = graph.nearest_node(origin_xy[0], origin_xy[1])
    end   = graph.nearest_node(dest_xy[0], dest_xy[1])
    if start is None or end is None:
        return None

    # 2. 选算法求解
    if algorithm == 'dijkstra':
        path, cost_sec, length_m = shortest_path_dijkstra(graph.graph, start, end)
    else:
        path, cost_sec, length_m = shortest_path_astar(graph.graph, start, end)

    if path is None:
        return None

    # 3. 组装轨迹点（从 graph.nodes 属性里取 lon/lat）
    coords = [[graph.graph.nodes[n]['lon'], graph.graph.nodes[n]['lat']] for n in path]

    # 4. 组装 segments（区分 walk/metro 段）
    segments = []
    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        edge = graph.graph[u][v]
        segments.append({
            "mode": edge.get('mode', 'walk'),
            "from": u, "to": v,
            "distance_m": round(edge.get('length_m', 0), 1),
            "time_sec":   round(edge.get('weight', 0), 1),
        })

    # 5. 区分 transit 模式：统计换乘次数
    transit_count = sum(1 for s in segments if s['mode'] == 'metro')

    return {
        "start_node": start,
        "end_node": end,
        "total_distance_m": round(length_m, 1),
        "total_time_sec":   round(cost_sec, 1),
        "total_time_min":   round(cost_sec / 60, 1),
        "transit_count":    transit_count,
        "segments": segments,
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        }
    }
