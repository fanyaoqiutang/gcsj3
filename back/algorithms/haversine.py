
# ========================================================

# Haversine 哈弗辛公式：计算地球表面两点之间的大圆距离

# 用途：A* 启发估价函数、路网边权赋值、路径总距离统计

# ========================================================
import math

# WGS-84 地球半径（米）
EARTH_RADIUS_M = 6371008.8

def haversine_km(lon1, lat1, lon2, lat2):
    """返回公里"""
    return haversine_m(lon1, lat1, lon2, lat2) / 1000.0

def haversine_m(lon1, lat1, lon2, lat2):
    """返回米"""
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat / 2) ** 2 + \
        math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_M * c

def haversine_node(n1, n2):
    """两个 node dict 各有 lon/lat 字段"""
    return haversine_m(n1['lon'], n1['lat'], n2['lon'], n2['lat'])
