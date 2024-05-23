import redis
from flask import Flask
from dotenv import load_dotenv
import os

from flask_cors import CORS
from flask_session import Session

from tsos_backend.app.controller.youtube import yt_bp
from tsos_backend.app.settings.config import DevelopmentConfig, ProductionConfig


def set_config(app):
    load_dotenv()  # 加载.env文件
    env = os.getenv('FLASK_DEBUG', 'production')
    if env:
        print('开发环境')
        app.config.from_object(DevelopmentConfig)
    else:
        print('生产环境')
        app.config.from_object(ProductionConfig)
    app.config.from_object(DevelopmentConfig)


def register_all_blueprint(app):
    app.register_blueprint(yt_bp, url_prefix='/youtube')


def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    set_config(app)
    app.config['SESSION_REDIS'] = redis.Redis(
        host=app.config['REDIS_HOST'],
        port=app.config['REDIS_PORT'],
        password=app.config['REDIS_PASSWORD'],
        db=1
    )
    Session(app)
    register_all_blueprint(app)

    return app