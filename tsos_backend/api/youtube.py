import json
import srt
import yt_dlp
from dotenv import load_dotenv
import os

from tsos_backend.api.ffmpeg import embed_subtitles
from tsos_backend.api.gpt import translation
from tsos_backend.api.whisper import transcriptions
from tsos_backend.api.whisper_local import transcriptions_local
from tsos_backend.utils import sanitize_filename, split_srt

load_dotenv()


class YoutubeAPI:
    def __init__(self, video_url):
        self.video_quality = None
        self.proxy = os.getenv("PROXY", None)
        self.video_id = str(video_url).split('watch?v=')[1]
        if '&' in self.video_id:
            self.video_id = self.video_id.split('&')[0]
        self.base_path = os.getenv('ASSETS_FOLDER')
        self.ydl = yt_dlp.YoutubeDL({
            'writesubtitles': True,
            'subtitlesformat': 'srt',
            'proxy': self.proxy,
            'skip_download': True,
            'outtmpl': '-',
            'nooverwrites': True,
            'postprocessors': [{
                'key': 'FFmpegSubtitlesConvertor',
                'format': 'srt'
            }]
        })
        self.video_info = self.get_video_info()

    def check_str_exist(self, video_id=None, lang='en'):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        with self.ydl as ydl:
            try:
                result = ydl.extract_info(url, download=False)
                if 'subtitles' in result:
                    subtitles = result['subtitles']
                    if lang in subtitles:
                        return True
                if 'automatic_captions' in result:
                    automatic_captions = result['automatic_captions']
                    if lang in automatic_captions:
                        return True
                return False
            except yt_dlp.utils.DownloadError as e:
                print(f"Error: {e}")
                return False

    def list_available_subtitles(self, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        ydl_opts = {
            'listsubtitles': True,
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            subtitles = info.get('subtitles', {})
            return subtitles

    def get_available_subtitles(self, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        with self.ydl as ydl:
            try:
                result = ydl.extract_info(url, download=False)
                available_subtitles = {}
                if 'subtitles' in result:
                    available_subtitles.update(result['subtitles'])
                if 'automatic_captions' in result:
                    available_subtitles.update(result['automatic_captions'])

                return list(available_subtitles.keys())
            except yt_dlp.utils.DownloadError as e:
                print(f"Error: {e}")
                return []

    def get_video_info(self, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        with self.ydl as ydl:
            try:
                result = ydl.extract_info(url, download=False)
                return result
            except yt_dlp.utils.DownloadError as e:
                print(f"Error: {e}")
                return None

    def get_subtitle_type(self, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        ydl_opts = {
            'skip_download': True,
            'list_subs': True
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info_dict = ydl.extract_info(url, download=False)
                subtitles = info_dict.get('subtitles', {})

                subtitle_types = set()
                for lang, subs in subtitles.items():
                    for sub in subs:
                        ext = sub.get('ext')
                        if ext:
                            subtitle_types.add(ext)

                return subtitle_types

            except Exception as e:
                print(f"An error occurred: {e}")
                return None

    def get_subtitles(self, lang=None, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"

        with self.ydl as ydl:
            try:
                result = ydl.extract_info(url, download=False)

                if lang is None:
                    print('语言识别')
                    # if 'subtitles' in result and lang in result['subtitles']:
                    #     subtitle_url = result['subtitles'][lang][0]['url']
                    #     subtitle_content = ydl.urlopen(subtitle_url).read().decode('utf-8')
                    #     subtitle_content = self.convert_json_to_srt(subtitle_content)

                    audio_file = self.get_audio_from_video()
                    subtitle_content = transcriptions_local(audio_file)
                    subtitle_content = srt.compose(subtitle_content)
                    print(subtitle_content)
                    split_srt(subtitle_content)
                    return subtitle_content


                subtitle_content = None
                if lang not in self.get_available_subtitles(video_id):
                    if 'automatic_captions' in result and lang in result['automatic_captions']:
                        print("获取自动生成的字幕")
                        auto_caption_url = result['automatic_captions'][lang][0]['url']
                        subtitle_content = ydl.urlopen(auto_caption_url).read().decode('utf-8')
                        subtitle_content = self.convert_json_to_srt(subtitle_content)
                    else:
                        self.get_audio_from_video()
                        return None
                else:
                    if 'subtitles' in result and lang in result['subtitles']:
                        subtitle_url = result['subtitles'][lang][0]['url']
                        subtitle_content = ydl.urlopen(subtitle_url).read().decode('utf-8')
                        subtitle_content = self.convert_json_to_srt(subtitle_content)
                    else:
                        subtitle_content = None

                return subtitle_content
            except yt_dlp.utils.DownloadError as e:
                print(f"Error: {e}")
                return None

    def format_time(self, seconds):
        ms = int((seconds % 1) * 1000)
        seconds = int(seconds)
        hrs = seconds // 3600
        mins = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hrs:02}:{mins:02}:{secs:02},{ms:03}"

    def download_video(self, _format, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        export_path = self.base_path + '/videos/'
        export_path = export_path + sanitize_filename(f"{self.video_info['title']}.mp4")
        ydl_opts = {
            'proxy': self.proxy,
            'format': _format,
            'outtmpl': export_path,
            'nooverwrites': True,
            'merge_output_format': 'mp4'
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                result = ydl.extract_info(url, download=True)
                video_file = ydl.prepare_filename(result)
                return export_path
            except yt_dlp.utils.DownloadError as e:
                print(f"Error: {e}")
                return None

    def get_audio_from_video(self, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        export_path = self.base_path + '/audios/'
        if not os.path.exists(export_path):
            os.makedirs(os.path.dirname(export_path))

        export_path = export_path + sanitize_filename(f"{self.video_info['title']}")
        ydl_opts = {
            'proxy': self.proxy,
            'format': 'bestaudio/best',
            'outtmpl': export_path,
            'nooverwrites': True,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                result = ydl.extract_info(url, download=True)
                audio_file = ydl.prepare_filename(result).replace('.webm', '.mp3').replace('.m4a', '.mp3')
                print(audio_file)
                return audio_file + '.mp3'
            except yt_dlp.utils.DownloadError as e:
                print(f"Error: {e}")
                return None

    def format_time_json(self, td):
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = td.microseconds // 1000
        return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

    def to_srt(self, subtitle_data):
        subtitle_list = []
        for i in subtitle_data:
            start_time = i['start']
            end_time = i['end']
            content = i['content']
            index = i['index']
            subtitle_list.append(index)
            subtitle_list.append(f"{self.format_time_json(start_time)} --> {self.format_time_json(end_time)}")
            subtitle_list.append(content)
            subtitle_list.append("")
        return "\n".join(subtitle_list)

    def convert_json_to_srt(self, json_subtitles):
        subtitles_data = json.loads(json_subtitles)
        srt_output = []
        for index, event in enumerate(subtitles_data['events']):
            t_start = event['tStartMs'] / 1000
            d_duration_ms = event.get('dDurationMs', 2000)
            t_end = (event['tStartMs'] + d_duration_ms) / 1000
            if 'segs' in event:
                segments = [seg['utf8'] for seg in event['segs'] if 'utf8' in seg]
                subtitle_text = ' '.join(segments)
            else:
                subtitle_text = ''

            srt_output.append(f"{index + 1}")
            srt_output.append(f"{self.format_time(t_start)} --> {self.format_time(t_end)}")
            srt_output.append(subtitle_text)
            srt_output.append("")

        return "\n".join(srt_output)

    def show_video_quality(self, video_id=None):
        url = f"https://www.youtube.com/watch?v={video_id or self.video_id}"
        ydl_opts = {
            'listformats': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            video_quality = ydl.download([self.video_id])
        return video_quality

    def slice_subtitles(self, subtitle_content, max_length=1000):
        subtitles = subtitle_content.split('\n\n')
        sliced_subtitles = []
        current_slice = []

        for subtitle in subtitles:
            if len('\n\n'.join(current_slice) + '\n\n' + subtitle) <= max_length:
                current_slice.append(subtitle)
            else:
                sliced_subtitles.append('\n\n'.join(current_slice))
                current_slice = [subtitle]

        if current_slice:
            sliced_subtitles.append('\n\n'.join(current_slice))

        return sliced_subtitles

    def save_srt_to_file(self, subtitle_content):
        file_path = self.base_path + '/subtitles/'
        file_name = self.video_info['title'] + '.srt'
        if not os.path.exists(os.path.dirname(file_path)):
            os.makedirs(os.path.dirname(file_path))
        output_path = file_path + sanitize_filename(file_name)
        print(output_path)

        with open(output_path, 'a', encoding='utf-8') as file:
            for i in subtitle_content:
                file.write(i)
        return output_path


if __name__ == '__main__':
    youtube = YoutubeAPI('https://www.youtube.com/watch?v=cRsEpHTvXKg')
    subtitles = youtube.get_subtitles()
    subtitles_list = youtube.slice_subtitles(subtitles, max_length=1000)
    for i in subtitles_list:
        translated_subtitles = translation(i, extra_info=f'视频名称{youtube.video_info["title"]}')
        subtitle_file = youtube.save_srt_to_file(translated_subtitles)
    # video_file = youtube.download_video('bestvideo[height<=1080]+bestaudio/best')
    # embed_subtitles(video_file, subtitle_file)
