"""
文本清洗模块
职责：将帖子原始富文本（HTML/Markdown）转化为干净的纯文本
"""

import re


def strip_html(text: str) -> str:
    """去除 HTML 标签"""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)  # &nbsp; &lt; 等
    return text


def strip_markdown(text: str) -> str:
    """去除 Markdown 语法标记"""
    # 代码块 ```...``` → 先提取语言标识再删除
    text = re.sub(r'```(\w*)\n[\s\S]*?```', r' \1 ', text)
    # 行内代码 `xxx` → 保留内容
    text = re.sub(r'`([^`]*)`', r' \1 ', text)
    # 图片 ![alt](url)
    text = re.sub(r'!\[.*?\]\(.*?\)', ' ', text)
    # 链接 [text](url) → 保留 text
    text = re.sub(r'\[([^\]]*)\]\([^\)]*\)', r' \1 ', text)
    # 标题 # ## ###
    text = re.sub(r'#{1,6}\s*', ' ', text)
    # 加粗/斜体 ** __ * _
    text = re.sub(r'[*_]{1,3}', '', text)
    # 删除线 ~~
    text = re.sub(r'~~', '', text)
    # 引用 >
    text = re.sub(r'^\s*>\s*', ' ', text, flags=re.MULTILINE)
    # 分隔线 --- ***
    text = re.sub(r'^[-*]{3,}\s*$', ' ', text, flags=re.MULTILINE)
    # 无序列表 - * +
    text = re.sub(r'^\s*[-*+]\s+', ' ', text, flags=re.MULTILINE)
    # 有序列表 1. 2.
    text = re.sub(r'^\s*\d+\.\s+', ' ', text, flags=re.MULTILINE)
    return text


def normalize_whitespace(text: str) -> str:
    """合并连续空白字符"""
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def clean(text: str) -> str:
    """
    完整清洗流水线
    原始帖文 → 去HTML → 去Markdown → 合并空白 → 干净纯文本
    """
    if not text:
        return ""
    text = strip_html(text)
    text = strip_markdown(text)
    text = normalize_whitespace(text)
    return text