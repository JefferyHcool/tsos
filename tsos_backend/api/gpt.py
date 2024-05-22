import os

from openai import OpenAI
from dotenv import load_dotenv

from tsos_backend.api.prompt import prompt

load_dotenv()
client = OpenAI(
    base_url=os.getenv('WILDCARD_BASE_API'),
    api_key=os.getenv('OPENAI_API_KEY_WILDCARD'),
)


def translation(text,extra_info=None):

    if isinstance(text, list):
        text = "\n".join(text)

    if extra_info:
        prompt_text=prompt+extra_info
    prompt_text=prompt
    response = client.chat.completions.create(
        model="gpt-4o-2024-05-13",
        messages=[
            {"role": "system", "content": prompt_text},
            {"role": "user", "content": text}
        ]
    )
    return response.choices[0].message.content
