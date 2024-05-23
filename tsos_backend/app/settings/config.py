# config.py



class Config:
    SECRET_KEY = 'default_secret_key'
    DATABASE_URI = 'sqlite:///:memory:'


class DevelopmentConfig(Config):
    DEBUG=True
    SESSION_TYPE='redis'
    REDIS_HOST = 'localhost'
    REDIS_PORT = 6379
    SECRET_KEY='HJWYLTWJHLTY'
    SESSION_KEY_PREFIX='session'
    SESSION_USE_SIGNER=True
    REDIS_PASSWORD = None  # 如果你的 Redis 服务器没有密码，保持为 None
    PERMANENT_SESSION_LIFETIME = 3600  # 设置会话的有效期（例如 1 小时）



class ProductionConfig(Config):
    DEBUG = False
    DATABASE_URI = 'sqlite:///prod.db'
