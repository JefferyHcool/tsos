import subprocess
import os
from dotenv import load_dotenv
load_dotenv()
base_path=os.getenv('ASSETS_FOLDER')


def embed_subtitles(video_file, subtitle_file):
    video_name = os.path.basename(video_file)
    print(video_name)

    # 确保 save_path 目录存在
    save_path = os.path.join(base_path, 'subtitled_video')
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    # 设置输出文件路径
    output_file = os.path.join(save_path, f'{os.path.splitext(video_name)[0]}_subtitled.mp4')

    # 构建 FFmpeg 命令
    command = [
        'ffmpeg',
        '-i', video_file,
        '-vf', f"subtitles={subtitle_file}",
        '-c:a', 'copy',
        output_file
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Subtitles embedded successfully into {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"Error embedding subtitles: {e}")




