
# ========================================================

# 全局配置：数据库连接、端口、模式切换

# ========================================================

class Config:
    # Flask
    PORT = 5000
    DEBUG = True

    # ---------- PostGIS 连接 ----------
    DB_HOST = "localhost"
    DB_PORT = 5432
    DB_NAME = "chengdu_gis"
    DB_USER = "postgres"
    DB_PASS = "654321"  # ← 改成你自己 PostgreSQL 的密码

    # ---------- 图构建模式 ----------
    # True  = 从 PostGIS 读真实路网
    # False = 用内置测试小图（节点少，方便调试算法先跑通）
    USE_POSTGIS = False   # 🔴 数据导入后改成 True 切换真实路网

    # ---------- 路径规划参数 ----------
    WALK_SPEED_MS = 1.2       # 步行速度 m/s
    METRO_SPEED_MS = 22.22    # 地铁速度 80km/h → m/s
    TRANSFER_TIME_SEC = 300   # 换乘固定代价 5分钟 = 300秒