# 全局配置：数据库连接、端口、模式切换
class Config:
    # Flask
    PORT = 5000         # 后端端口
    DEBUG = True        # 开发模式，开启后会自动重启服务器

    # ---------- PostGIS 连接 ----------
    DB_HOST = "localhost"       # 数据库主机地址
    DB_PORT = 5432              # 数据库端口
    DB_NAME = "chengdu_gis"     # 数据库名称
    DB_USER = "postgres"        # 数据库用户名
    DB_PASS = "654321"

    # ---------- 图构建模式 ----------
    # True  = 从 PostGIS 读真实路网
    # False = 用内置测试
    USE_POSTGIS = False

    # ---------- 路径规划参数 ----------
    WALK_SPEED_MS = 1.2       # 步行速度 m/s
    METRO_SPEED_MS = 22.22    # 地铁速度 m/s（80km/h）
    TRANSFER_TIME_SEC = 300   # 换乘固定代价 5分钟 = 300秒