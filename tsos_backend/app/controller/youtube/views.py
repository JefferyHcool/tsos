import json
import os
import time
from concurrent.futures import ThreadPoolExecutor

import srt
from dotenv import load_dotenv
from flask import request, jsonify, stream_with_context, Response, session

from tsos_backend.api.gpt import translation
from tsos_backend.api.youtube import YoutubeAPI
from . import yt_bp

video_url = ''
lang = ''
load_dotenv()
whisper_end = os.getenv('WHISPER_END')


@yt_bp.route('/get_srt', methods=['POST'])
def get_srt():
    data = request.get_json()
    if data.get('video_url', None) is None:
        return jsonify(msg='缺少参数', code=-1)
    global video_url
    video_url = data.get('video_url')
    global lang
    lang = data.get('lang', None)

    return jsonify(msg='Processing started', code=0)


@yt_bp.route('/get_srt_stream', methods=['GET'])
def get_srt_stream():
    #开始时间
    strat_time=time.time()
    youtube = YoutubeAPI(video_url=video_url)

    def parse_srt(srt):
        lines = srt.split('\n')
        entries = []
        entry = {}
        for line in lines:
            if line.isdigit():
                if entry:
                    entries.append(entry)
                entry = {'id': int(line)}
            elif '-->' in line:
                times = line.split(' --> ')
                entry['start'] = times[0].strip()
                entry['end'] = times[1].strip()
                entry['duration'] = calculate_duration(entry['start'], entry['end'])
            else:
                entry['text'] = entry.get('text', '') + line.strip() + ' '
        if entry:
            entries.append(entry)
        return entries

    def calculate_duration(start, end):
        start_seconds = parse_time(start)
        end_seconds = parse_time(end)
        return end_seconds - start_seconds

    def parse_time(time_str):
        h, m, s = time_str.split(':')
        s, ms = s.split(',')
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

    if whisper_end == 'LOCAL':
        subtitles = youtube.get_subtitles(lang=lang)

        def generate():
            start_time = time.time()  # 初始化开始时间

            with ThreadPoolExecutor(max_workers=10) as executor:
                extra_info = f'视频名称: {youtube.video_info["title"]}'
                futures = [executor.submit(translation, srt.compose(subtitle), extra_info) for subtitle in subtitles]

                try:
                    for future in futures:
                        subtitle_objects = future.result()  # 等待翻译完成
                        subtitle_objects = parse_srt(subtitle_objects)
                        end_time = time.time()
                        print('总返回时间：', end_time - start_time, '秒')

                        yield f"data: {json.dumps(subtitle_objects)}\n\n"
                except Exception as e:
                    print(f"Error processing translation: {e}")
                    # app.logger.error(f"Error processing translation: {e}")  # 错误日志
                    yield f"data: {{'error': '{str(e)}'}}\n\n"

            yield "event: end\n"  # Indicate the end of the stream
            yield "data: END\n\n"

            # for subtitle_chunk in subtitles:
            #         subtitle_text = srt.compose(subtitle_chunk)  # 将字幕片段组合成文本
            #     translation_start = time.time()
            #
            #     translated_subtitles = translation(subtitle_text, )
            #
            #     translation_end = time.time()
            #     print('字幕翻译用时：', translation_end - translation_start, '秒')
            #
            #     subtitle_objects = srt.parse(translated_subtitles)  # 解析翻译后的字幕
            #     subtitle_file = youtube.save_srt_to_file(translated_subtitles)  # 存储翻译后的字幕



            
        return Response(stream_with_context(generate()), mimetype='text/event-stream')

    else:

        subtitles = youtube.get_subtitles(lang=lang)
        subtitles_list = youtube.slice_subtitles(subtitles, max_length=1000)


        def generate():
            for subtitle_chunk in subtitles_list:
                translated_subtitles = translation(subtitle_chunk, extra_info=f'视频名称{youtube.video_info["title"]}')
                subtitle_objects = parse_srt(translated_subtitles)
                subtitle_file = youtube.save_srt_to_file(translated_subtitles)
                yield f"data: {json.dumps(subtitle_objects)}\n\n"
            yield "event: end\n"  # Indicate the end of the stream
            yield "data: END\n\n"

        return Response(stream_with_context(generate()), mimetype='text/event-stream')
