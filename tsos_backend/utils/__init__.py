import re


def sanitize_filename(filename):
    # 替换无效字符
    return re.sub(r'[<>:"/\\|?*]', '_', filename)