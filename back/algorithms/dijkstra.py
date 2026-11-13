
# ========================================================

# Dijkstra 最短路径 —— 薄封装 NetworkX.dijkstra_path

# 边权：默认用 'weight' 字段（graph_builder 写入的秒数代价）

# ========================================================
import networkx as nx

def shortest_path_dijkstra(graph, source, target, weight='weight'):
    """
    返回 (path_list, total_weight, path_length_m)
    path_list: [node_id, node_id, ...]
    total_weight: 累计边权（秒）
    """
    try:
        path = nx.dijkstra_path(graph, source, target, weight=weight)
        cost = nx.dijkstra_path_length(graph, source, target, weight=weight)
        # 总距离（米）—— 累计 length_m 属性
        length_m = sum(graph[path[i]][path[i+1]].get('length_m', 0) for i in range(len(path)-1))
        return path, cost, length_m
    except nx.NetworkXNoPath:
        return None, None, None
