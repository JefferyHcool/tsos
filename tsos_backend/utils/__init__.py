import re


def sanitize_filename(filename):
    # 替换无效字符
    return re.sub(r'[<>:"/\\|?*]', '_', filename)


test = ['1\n00:00:00,000 --> 00:00:03,720\nHappy birthday to you!',
        '2\n00:00:03,720 --> 00:00:05,460\nSpeech! Speech! Speech!',
        '3\n00:00:05,460 --> 00:00:07,720\nAll right, okay, um...',
        "4\n00:00:07,720 --> 00:00:10,600\nIt's been a challenging few years, for sure.",
        "5\n00:00:10,600 --> 00:00:12,440\nBut I'm happy.",
        '6\n00:00:12,440 --> 00:00:14,600\nThat is because of each and every one of you.',
        '7\n00:00:14,600 --> 00:00:16,860\nI am the luckiest man alive.',
        '8\n00:00:16,860 --> 00:00:18,860\nMake a wish, buddy.', '9\n00:00:25,080 --> 00:00:26,320\nWade Wilson?',
        "10\n00:00:26,320 --> 00:00:28,320\nWho's asking?",
        '11\n00:00:28,860 --> 00:00:32,060\nWhoa, whoa, whoa, whoa, whoa, whoa, whoa, whoa, whoa.',
        '12\n00:00:32,060 --> 00:00:33,599\nIs that supposed to be scary?',
        "13\n00:00:33,599 --> 00:00:35,480\nPegging isn't new for me, friendo.",
        '14\n00:00:35,480 --> 00:00:37,480\nBut it is for Disney.',
        '15\n00:00:46,439 --> 00:00:50,419\nMr. Wilson, you appear to have soiled yourself while unconscious.',
        "16\n00:00:50,419 --> 00:00:53,459\nI wasn't unconscious. Who are you?",
        '17\n00:00:53,459 --> 00:00:54,959\nWhy am I here?', '18\n00:00:54,959 --> 00:00:56,959\nWalk with me.',
        '19\n00:00:59,220 --> 00:01:00,799\nWade.', '20\n00:01:00,799 --> 00:01:02,799\nYou are special.',
        '21\n00:01:04,260 --> 00:01:08,900\nThis is your chance to be a hero among heroes.',
        "22\n00:01:13,580 --> 00:01:15,580\nI smell what you're stepping in, sensei.",
        '23\n00:01:15,580 --> 00:01:19,620\nYour little cinematic universe is about to change forever.',
        "24\n00:01:21,660 --> 00:01:23,660\nI'm the messiah.", '25\n00:01:23,660 --> 00:01:25,660\nI am.',
        '26\n00:01:26,639 --> 00:01:28,639\nMarvel Jesus.',
        '27\n00:01:43,059 --> 00:01:45,059\nGod, please! Oh, my back!',
        '28\n00:01:51,059 --> 00:01:53,059\nGotta love this part.', '29\n00:01:53,059 --> 00:01:55,059\nWade!',
        '30\n00:01:56,660 --> 00:01:58,660\nOh!', "31\n00:02:09,160 --> 00:02:11,160\nDon't just stand there, you ape.",
        '32\n00:02:11,160 --> 00:02:13,160\nGive me a hand up.',
        "33\n00:02:13,160 --> 00:02:15,160\nNope. I'm actually okay.",
        '34\n00:02:15,160 --> 00:02:17,160\nThank you very much.', '\n']


def split_srt(srt_content):
    # 分割 srt 字幕
    print(type(srt_content))
    last_index = 0
    srt_content = srt_content.split("\n\n")
    for i in srt_content:
        try:
            index, time, content = str(i).split("\n")
            print(len(content))
            print(index, time, content)
        except:
            continue

# split_srt(test)
