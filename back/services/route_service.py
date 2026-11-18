# 路径规划业务层
# 编排流程：坐标匹配 → 选算法 → 求解 → 组装 GeoJSON
from back.algorithms.dijkstra import shortest_path_dijkstra
from back.algorithms.astar import shortest_path_astar
import networkx as nx       # 依赖 NetworkX 库

def plan_route(graph, origin_xy, dest_xy, mode='walk', algorithm='astar'):
    """
    参数:
      graph:  道路图对象
      origin_xy, dest_xy: [lon, lat]    # 起点终点坐标（经度，纬度）
      mode:    'walk' | 'metro'       #（步行/地铁）
      algorithm: 'dijkstra' | 'astar'    # 路径规划算法选择
    返回: { total_distance_m, total_time_sec, segments, geometry } 或 None
    """
    # 1. 坐标匹配 → 图中节点（nearest_node 找最近的路网节点）
    start = graph.nearest_node(origin_xy[0], origin_xy[1])
    end   = graph.nearest_node(dest_xy[0], dest_xy[1])
    if start is None or end is None:
        return None

    # 2. 选算法求解
    if algorithm == 'dijkstra':
        path, cost_sec, length_m = shortest_path_dijkstra(graph.graph, start, end)
    else:
        path, cost_sec, length_m = shortest_path_astar(graph.graph, start, end)
    # 检查是否有路径
    if path is None:
        return None

    # 3. 组装轨迹点（从 graph.nodes 属性里取 lon/lat，转换为 GeoJSON 格式，先经度后纬度）
    coords = [[graph.graph.nodes[n]['lon'], graph.graph.nodes[n]['lat']] for n in path]
    """
      等价于
      coords = []
      for n in path:
        lon = graph.graph.nodes[n]['lon']
        lat = graph.graph.nodes[n]['lat']
        coords.append([lon, lat])
    """

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
    """
      等价于transit_count = 0
      for s in segments:
        if s['mode'] == 'metro':
          transit_count += 1
    """
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
