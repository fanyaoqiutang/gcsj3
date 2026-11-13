
# ========================================================

# /api/route/* 蓝图

# ========================================================
from flask import Blueprint, request, current_app, jsonify
from back.services.route_service import plan_route

route_bp = Blueprint('route', __name__)

@route_bp.route('/plan', methods=['POST'])
def plan():
    """
    请求 JSON:
    {
      "origin":      [104.0778, 30.6555],
      "destination": [104.0533, 30.6639],
      "mode":        "walk",        // walk | transit
      "algorithm":   "astar"       // dijkstra | astar
    }
    """
    data = request.get_json(silent=True) or {}
    origin = data.get('origin')
    dest   = data.get('destination')
    mode   = data.get('mode', 'walk')
    algo   = data.get('algorithm', 'astar')

    if not origin or not dest:
        return jsonify({"error": "origin 和 destination 必填"}), 400

    graph = current_app.graph  # Flask app 里预加载的图
    result = plan_route(graph, origin, dest, mode, algo)

    if result is None:
        return jsonify({"error": "无可达路径"}), 404

    # 包装成 GeoJSON FeatureCollection
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": result['geometry'],
            "properties": {
                "mode": mode,
                "distance":   result['total_distance_m'],
                "duration":   int(result['total_time_min']),
                "transitCount": result['transit_count'],
                "algorithm":  algo
            }
        }]
    }
    return jsonify({
        "geojson": geojson,
        "segments": result['segments'],
        "metrics": {
            "distance":      result['total_distance_m'],
            "duration":      int(result['total_time_min']),
            "transitCount":  result['transit_count']
        }
    })