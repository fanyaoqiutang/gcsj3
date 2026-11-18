# /api/poi/* 蓝图 —— POI 查询接口，根据关键词查询景点
# 若 PostGIS 还没数据，返回空数组（不阻塞前端）
from flask import Blueprint, request, jsonify, current_app
from back.db.connection import get_connection

# 创建蓝图对象
poi_bp = Blueprint('poi', __name__)

# 定义路由：/search
@poi_bp.route('/search', methods=['GET'])
def search():
    # 获取关键词参数
    keyword = request.args.get('keyword', '').strip()
    kw = f"%{keyword}%" if keyword else "%"

    # 从 PostGIS 查景点
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
            # 从数据库查询结果转换为 JSON 格式
            rows = cur.fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        # 表还没数据就返回空，不报错
        return jsonify([]), 200
