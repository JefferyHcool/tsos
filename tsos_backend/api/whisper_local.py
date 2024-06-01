import os
import time
from datetime import timedelta
import srt
from pydub import AudioSegment
from dotenv import load_dotenv
from faster_whisper import WhisperModel
import torch
model_size = "base"
os.environ["KMP_DUPLICATE_LIB_OK"]="TRUE"
if torch.cuda.is_available():
    device = torch.cuda.current_device()
    print(f"Using GPU: {torch.cuda.get_device_name(device)}")
else:
    print("Using CPU")
model = WhisperModel(model_size, device="cuda", compute_type="float16")
load_dotenv()

assets = os.getenv('ASSETS_FOLDER')
if not os.path.exists(assets):
    os.makedirs(assets)


def transcriptions_local(file_name):
    start_time = time.time()
    segments, info = model.transcribe(file_name, beam_size=5)

    subtitles = []
    max_len=12
    temp_list=[]
    # subtitles = list(segments)  # 转录将在此处实际运行。
    for i, segment in enumerate(segments):
        start = timedelta(seconds=segment.start)
        end = timedelta(seconds=segment.end)
        temp_list.append(srt.Subtitle(index=i+1, start=start, end=end, content=segment.text))
        if(len(temp_list)>=max_len):
            c=temp_list.copy()
            temp_list=[]
            yield c
        if(len(temp_list)>0):

            yield temp_list

        subtitles.append(srt.Subtitle(index=i+1, start=start, end=end, content=segment.text))

    end_time = time.time()
    elapsed_time = end_time - start_time
    # 打印结果
    print("Transcription took %.2f seconds" % elapsed_time)
    return subtitles


if __name__ == '__main__':

    start_time = time.time()
    path_to_large_audio = "G:\\02_个人项目\\21_字幕救星_The Savior of Subtitles\\tsos_backend\\assets\\audios\\_Ticket Wars_ DEADPOOL AND WOLVERINE Premiere or a Wild Weekend in VEGAS__ First Day Sales TODAY!.mp3"
    # 初始化Whisper模型
    all_subtitles = transcriptions_local(path_to_large_audio)
    # 结束计时

    print(all_subtitles)
