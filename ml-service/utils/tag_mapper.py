"""
标签映射引擎
职责：将 K-Means 簇 ID + 帖子关键词 → 人类可读标签列表
"""
from __future__ import annotations

import json
import os
import numpy as np

try:
    from config import CLUSTER_LABELS_FILE, TECH_SYNONYMS_FILE
except ImportError:
    _BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    CLUSTER_LABELS_FILE = os.path.join(_BASE, "models", "cluster_labels.json")
    TECH_SYNONYMS_FILE = os.path.join(_BASE, "data", "tech_synonyms.json")


# ── 全局缓存 ──
_cluster_labels: dict | None = None
_reverse_synonyms: dict | None = None


def load_cluster_labels() -> dict:
    """加载 cluster_labels.json"""
    global _cluster_labels
    if _cluster_labels is not None:
        return _cluster_labels

    fp = str(CLUSTER_LABELS_FILE)
    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8") as f:
            _cluster_labels = json.load(f)
    else:
        _cluster_labels = {}
    return _cluster_labels


def _load_reverse_synonyms() -> dict:
    """
    加载同义词映射表并反转：标准标签 → [可能的关键词列表]
    用于从帖子关键词中匹配精细标签
    """
    global _reverse_synonyms
    if _reverse_synonyms is not None:
        return _reverse_synonyms

    fp = str(TECH_SYNONYMS_FILE)
    _reverse_synonyms = {}

    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8") as f:
            synonyms = json.load(f)
        # 反转：标准标签 → [原始词]
        for original, standard in synonyms.items():
            if standard not in _reverse_synonyms:
                _reverse_synonyms[standard] = []
            _reverse_synonyms[standard].append(original.lower())

    return _reverse_synonyms


def get_top_keywords(tfidf_vector, feature_names, top_n: int = 10) -> list[str]:
    """
    从单篇帖子的 TF-IDF 向量中提取权重最高的词
    tfidf_vector: 稀疏矩阵的单行（1 × V）
    feature_names: vectorizer.get_feature_names_out() 的结果
    """
    if hasattr(tfidf_vector, "toarray"):
        vec = tfidf_vector.toarray().flatten()
    else:
        vec = np.array(tfidf_vector).flatten()

    top_indices = vec.argsort()[-top_n:][::-1]
    keywords = []
    for idx in top_indices:
        if vec[idx] > 0:
            keywords.append(feature_names[idx])
    return keywords


def map_cluster_to_tags(cluster_id: int, top_keywords: list[str]) -> list[str]:
    """
    将簇 ID + 帖子关键词 → 标签列表

    策略：
    1. 从 cluster_labels.json 获取该簇的基础标签
    2. 如果是"非技术"簇，直接返回空列表
    3. 用帖子关键词与同义词映射表做二次匹配，补充精细标签
    4. 去重，最多返回 5 个标签
    """
    cluster_labels = load_cluster_labels()
    reverse_synonyms = _load_reverse_synonyms()

    cluster_info = cluster_labels.get(str(cluster_id), {})
    base_tags = cluster_info.get("tags", [])

    # 非技术簇直接返回空
    if "非技术" in base_tags:
        return []

    # 二次匹配：用帖子的 top 关键词去同义词表里找更精确的标签
    refined_tags = set()
    keywords_lower = [kw.lower() for kw in top_keywords]

    for standard_tag, original_words in reverse_synonyms.items():
        for kw in keywords_lower:
            if kw in original_words or kw == standard_tag.lower():
                refined_tags.add(standard_tag)
                break

    # 合并：精细标签优先，基础标签兜底
    if refined_tags:
        # 精细标签排在前面
        final_tags = list(refined_tags)
    else:
        # 没匹配到精细标签，用基础标签
        final_tags = list(base_tags)

    # 去重 + 限制数量
    seen = set()
    unique_tags = []
    for tag in final_tags:
        if tag not in seen and tag != "非技术":
            seen.add(tag)
            unique_tags.append(tag)
    
    return unique_tags[:5]