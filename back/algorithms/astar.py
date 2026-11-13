
# ========================================================

# A* 启发式搜索 —— 估价函数 = Haversine(当前, 终点) / 步速

# 让 NetworkX 自动调用我们的 heuristic

# ========================================================
import networkx as nx
from back.algorithms.haversine import haversine_m

def shortest_path_astar(graph, source, target, weight='weight', speed_ms=1.2):
    """
    调用 NetworkX.astar_path，heuristic 用 Haversine 球面距离 / 速度（秒）
    speed_ms: 步速 m/s，默认 1.2 = 步行
    """
    # 从 graph 的节点属性里取坐标
    def heuristic(u, v):
        ux, uy = graph.nodes[u].get('lon', 0), graph.nodes[u].get('lat', 0)
        vx, vy = graph.nodes[v].get('lon', 0), graph.nodes[v].get('lat', 0)
        return haversine_m(ux, uy, vx, vy) / speed_ms  # 预估最少多少秒

    try:
        path = nx.astar_path(graph, source, target, heuristic=heuristic, weight=weight)
        cost = nx.dijkstra_path_length(graph, source, target, weight=weight)
        length_m = sum(graph[path[i]][path[i+1]].get('length_m', 0) for i in range(len(path)-1))
        return path, cost, length_m
    except nx.NetworkXNoPath:
        return None, None, None
