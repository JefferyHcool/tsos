from flask import Blueprint

yt_bp = Blueprint('user', __name__)

from .views import *