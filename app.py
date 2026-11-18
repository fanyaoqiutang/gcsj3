import logging
from flask import Flask, jsonify
from flask_cors import CORS

from back.config import Config
from back.algorithms.graph_builder import GraphBuilder
from back.routes.route import route_bp
from back.routes.poi import poi_bp

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s %(name)s — %(message)s')
log = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config.from_object(Config)

    builder = GraphBuilder()
    builder.load()
    app.graph = builder.graph
    app.graph_builder = builder

    app.register_blueprint(route_bp, url_prefix='/api/route')
    app.register_blueprint(poi_bp,  url_prefix='/api/poi')

    @app.route('/api/health')
    def health():
        return jsonify({
            "status": "ok",
            "nodes": app.graph.number_of_nodes(),
            "edges": app.graph.number_of_edges(),
            "mode": "postgis" if Config.USE_POSTGIS else "test"
        })

    # 错误处理
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        log.exception("500 error: %s", e)
        return jsonify({"error": "internal server error"}), 500

    return app


app = create_app()

if __name__ == '__main__':
    log.info("启动后端服务 0.0.0.0:%s (debug=%s)", Config.PORT, Config.DEBUG)
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)