
# ========================================================

# /api/poi/* 蓝图 —— 从 PostGIS 查景点

# 若 PostGIS 还没数据，返回空数组（不阻塞前端）

# ========================================================
from flask import Blueprint, request, jsonify, current_app
from back.db.connection import get_connection

poi_bp = Blueprint('poi', __name__)

@poi_bp.route('/search', methods=['GET'])
def search():
    keyword = request.args.get('keyword', '').strip()
    kw = f"%{keyword}%" if keyword else "%"

    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT gid, name, category, intro, image_url,
                       stay_min, flow_index,
                       ST_X(geom) AS lon, ST_Y(geom) AS lat
                FROM poi
                WHERE name ILIKE %s
                LIMIT 50
            """, (kw,))
            rows = cur.fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        # 表还没数据就返回空，不报错
        return jsonify([]), 200
