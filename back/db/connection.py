# ========================================================

# psycopg2 连接工厂，每次请求新建连接（简单够用）

# 生产环境可换成连接池 psycopg2.pool.ThreadedConnectionPool

# ========================================================

import psycopg2
from psycopg2.extras import RealDictCursor
from back.config import Config

def get_connection():
    """返回一个新的 psycopg2 连接，使用 RealDictCursor 让查询结果能按字段名取值"""
    return psycopg2.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        dbname=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASS,
        cursor_factory=RealDictCursor
    )