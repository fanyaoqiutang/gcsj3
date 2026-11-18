# psycopg2 连接，每次请求新建连接
# 生产环境可换成连接池 psycopg2.pool.ThreadedConnectionPool
import psycopg2
from psycopg2.extras import RealDictCursor      # 用于返回字典格式的查询结果
from back.config import Config

def get_connection():   # 创建数据库连接
    # 返回一个新的 psycopg2 连接
    return psycopg2.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        dbname=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASS,
        cursor_factory=RealDictCursor       # 用于返回字典格式的查询结果（按字段名取值）
    )