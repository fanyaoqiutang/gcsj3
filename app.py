# ========================================================
# Flask 后端入口（根目录，直接 python app.py 启动）
# ========================================================

import logging
from flask import Flask
from flask_cors import CORS

from back.config import Config
from back.routes.route import route_bp
from back.routes.poi import poi_bp
from back.algorithms.graph_builder import GraphBuilder

# 日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s  %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger(__name__)

# ---------- Flask 实例 ----------
app = Flask(__name__)
app.config.from_object(Config)

# 跨域（兜底，Vite proxy 会挡掉大部分）
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------- 注册蓝图 ----------
app.register_blueprint(route_bp, url_prefix='/api/route')
app.register_blueprint(poi_bp,   url_prefix='/api/poi')

# ---------- 启动时预加载路网图 ----------
log.info('⏳ 正在加载路网图缓存...')
app.graph = GraphBuilder()
app.graph.load()
log.info('✅ 图缓存加载完成')

# ---------- 健康检查 ----------
@app.route('/api/health', methods=['GET'])
def health():
    return {
        'status': 'ok',
        'graph_nodes': app.graph.graph.number_of_nodes(),
        'graph_edges': app.graph.graph.number_of_edges(),
        'mode': 'postgis' if app.graph.use_postgis else 'test'
    }

# ---------- 启动 ----------
if __name__ == '__main__':
    g = app.graph.graph
    log.info('=' * 50)
    log.info(f'🚀 Flask 启动:  http://localhost:{Config.PORT}')
    log.info(f'📊 图缓存:      {g.number_of_nodes()} 节点, {g.number_of_edges()} 边')
    log.info(f'🗺️  模式:        {"PostGIS 真实路网" if app.graph.use_postgis else "内置测试小图"}')
    log.info('=' * 50)
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)