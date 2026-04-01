"""
文本预处理模块
职责：分词 → 去停用词 → 同义词归一化 → 输出干净词元
训练和推理共用同一套流水线，保证特征一致性
"""

import json
import os
import re
import jieba

from utils.text_cleaner import clean

# ── 路径配置（兼容 notebook 和 main.py 两种调用方式）──
# 优先从 config 导入，找不到就用相对路径兜底
try:
    from config import (
        CN_STOPWORDS_FILE,
        TECH_STOPWORDS_FILE,
        JIEBA_USERDICT_FILE,
        TECH_SYNONYMS_FILE,
    )
except ImportError:
    _BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    CN_STOPWORDS_FILE = os.path.join(_BASE, "data", "stopwords", "cn_stopwords.txt")
    TECH_STOPWORDS_FILE = os.path.join(_BASE, "data", "stopwords", "tech_stopwords.txt")
    JIEBA_USERDICT_FILE = os.path.join(_BASE, "data", "jieba_userdict.txt")
    TECH_SYNONYMS_FILE = os.path.join(_BASE, "data", "tech_synonyms.json")


# ── 全局缓存（只加载一次）──
_stopwords: set | None = None
_synonyms: dict | None = None
_jieba_loaded = False


def _load_stopwords() -> set:
    """加载中文通用停用词 + 技术停用词，合并为一个集合"""
    global _stopwords
    if _stopwords is not None:
        return _stopwords

    words = set()
    for filepath in [CN_STOPWORDS_FILE, TECH_STOPWORDS_FILE]:
        fp = str(filepath)
        if os.path.exists(fp):
            with open(fp, "r", encoding="utf-8") as f:
                for line in f:
                    w = line.strip()
                    if w:
                        words.add(w)
    _stopwords = words
    return _stopwords


def _load_synonyms() -> dict:
    """加载技术同义词映射表"""
    global _synonyms
    if _synonyms is not None:
        return _synonyms

    fp = str(TECH_SYNONYMS_FILE)
    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8") as f:
            _synonyms = json.load(f)
    else:
        _synonyms = {}
    return _synonyms


def _load_jieba_userdict():
    """加载 jieba 自定义词典（只加载一次）"""
    global _jieba_loaded
    if _jieba_loaded:
        return

    fp = str(JIEBA_USERDICT_FILE)
    if os.path.exists(fp):
        jieba.load_userdict(fp)
    _jieba_loaded = True


def tokenize(text: str) -> list[str]:
    """
    中文分词
    使用 jieba 精确模式，加载自定义技术词典
    """
    _load_jieba_userdict()

    # jieba 分词
    tokens = jieba.lcut(text)

    # 过滤：只保留长度>=1的非纯空白token
    tokens = [t.strip() for t in tokens if t.strip()]

    # 过滤纯数字和单个标点
    tokens = [t for t in tokens if not re.match(r'^[\d\W]$', t)]

    return tokens


def remove_stopwords(tokens: list[str]) -> list[str]:
    """去除停用词"""
    stopwords = _load_stopwords()
    return [t for t in tokens if t not in stopwords]


def normalize_synonyms(tokens: list[str]) -> list[str]:
    """
    同义词归一化
    将分词结果中的各种技术表述统一映射为标准术语
    匹配时忽略大小写
    """
    synonyms = _load_synonyms()
    # 构建小写映射用于匹配
    lower_map = {k.lower(): v for k, v in synonyms.items()}

    result = []
    for t in tokens:
        normalized = lower_map.get(t.lower(), t)
        result.append(normalized)
    return result


def preprocess(text: str) -> list[str]:
    """
    完整预处理流水线
    原始文本 → 清洗 → 分词 → 去停用词 → 同义词归一化 → 词元列表
    """
    cleaned = clean(text)
    tokens = tokenize(cleaned)
    tokens = remove_stopwords(tokens)
    tokens = normalize_synonyms(tokens)
    return tokens


def preprocess_to_string(text: str) -> str:
    tokens = preprocess(text)
    return " ".join(t.lower() for t in tokens)