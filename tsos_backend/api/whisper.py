import os
from datetime import timedelta, datetime
import srt
import openai
from openai import OpenAI
from pydub import AudioSegment
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(


    api_key=os.getenv('WHISPER_KEY'),
)


assets=os.getenv('ASSETS_FOLDER')
if not os.path.exists(assets):
    os.makedirs(assets)
def check_file_size(file):
    size = os.stat(file).st_size
    # 判断是否大于等于25m
    if size >= 25 * 1024 * 1024:
        return True


def split_audio(path):
    if not os.path.exists(assets + "/export"):
        os.makedirs(assets + "/export")
    export_path = assets + "/export" + f'/{os.path.basename(path).split(".mp3")[0]}'
    if not os.path.exists(export_path):
        os.makedirs(export_path)
    audio_file_data = AudioSegment.from_mp3(path)

    # PyDub handles time in milliseconds
    ten_minutes = 10 * 60 * 1000
    # 递归切割
    for i in range(0, len(audio_file_data), ten_minutes):
        start_time = i
        chunk = audio_file_data[i:i + ten_minutes]
        file_name = f"{export_path}/{i}.mp3"
        chunk.export(file_name, format="mp3")
        yield file_name, start_time

def transcribe_chunk(file_name, start_time):
    with open(file_name, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format='srt'
        )
    # 解析字幕并添加时间戳
    subtitles = []

    for i, subtitle in enumerate(srt.parse(transcription)):
        start = timedelta(seconds=subtitle.start.total_seconds() + start_time / 1000)
        end = timedelta(seconds=subtitle.end.total_seconds() + start_time / 1000)
        subtitles.append(srt.Subtitle(index=i, start=start, end=end, content=subtitle.content))

    return subtitles

def transcriptions(path):
    audio_file_list = []
    transcription_list = []

    if check_file_size(path):
        print("文件大小超过25M")
        for file_name, start_time in split_audio(path):
            audio_file_list.append((file_name, start_time))
    else:
        audio_file_list.append((path, 0))

    for file_name, start_time in audio_file_list:
        transcription_list.extend(transcribe_chunk(file_name, start_time))

    return transcription_list


if __name__ == '__main__':
    now=datetime.now()
    path_to_large_audio = "../S1Fplr8nVHQ.mp3"
    all_subtitles = transcriptions(path_to_large_audio)
    # 结束计时
    later = datetime.now()
    print('Final Time:', later - now)
    print(all_subtitles)