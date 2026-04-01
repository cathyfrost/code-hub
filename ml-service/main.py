"""
CodeHub 智能标签 FastAPI 推理服务 v2

标签生成策略：
  1. TF-IDF 关键词 → 同义词映射 → 标签
  2. 原文直接正则匹配技术实体词 → 标签
  两路合并去重，保证不遗漏
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import json
import numpy as np
import re
import os
import time

from config import (
    TFIDF_MODEL_FILE, KMEANS_MODEL_FILE, JUNK_CLF_MODEL_FILE,
    CLUSTER_LABELS_FILE, JUNK_CONFIDENCE_THRESHOLD, TECH_SYNONYMS_FILE,
)
from utils.preprocessor import preprocess_to_string
from utils.tag_mapper import load_cluster_labels, get_top_keywords


# ══════════════════════════════════════════════
#  模型加载
# ══════════════════════════════════════════════

print("正在加载模型...")
_start = time.time()

vectorizer = joblib.load(str(TFIDF_MODEL_FILE))
kmeans = joblib.load(str(KMEANS_MODEL_FILE))
junk_clf = joblib.load(str(JUNK_CLF_MODEL_FILE))
cluster_labels = load_cluster_labels()
feature_names = vectorizer.get_feature_names_out()

# 加载同义词映射表
_synonyms = {}
_syn_path = str(TECH_SYNONYMS_FILE)
if os.path.exists(_syn_path):
    with open(_syn_path, "r", encoding="utf-8") as f:
        _synonyms = json.load(f)
_syn_lower = {k.lower(): v for k, v in _synonyms.items()}

centroids = kmeans.cluster_centers_

_load_time = time.time() - _start
print(f"模型加载完成 ({_load_time:.2f}s)")
print(f"  TF-IDF 词表: {len(feature_names)}")
print(f"  K-Means K={kmeans.n_clusters}")
print(f"  分类器: {type(junk_clf).__name__}")
print(f"  垃圾阈值: {JUNK_CONFIDENCE_THRESHOLD}")
print(f"  同义词表: {len(_synonyms)} 条")


# ══════════════════════════════════════════════
#  双路标签生成
# ══════════════════════════════════════════════

# 预编译：从同义词表构建「原文实体词 → 标准标签」的正则匹配器
# 按长度倒序排列，优先匹配长词（如 "React Native" 优先于 "React"）
_entity_patterns = sorted(_synonyms.keys(), key=len, reverse=True)
_entity_regex = re.compile(
    "|".join(re.escape(e) for e in _entity_patterns),
    re.IGNORECASE
)


def extract_tags_from_raw_text(raw_text: str, max_tags: int = 5) -> list[str]:
    """
    路线 A：直接从原文中正则匹配技术实体词
    不依赖 TF-IDF，不会被词频稀释
    """
    tags = []
    seen = set()

    matches = _entity_regex.findall(raw_text)
    for match in matches:
        standard_tag = _synonyms.get(match) or _syn_lower.get(match.lower())
        if standard_tag and standard_tag not in seen:
            seen.add(standard_tag)
            tags.append(standard_tag)
        if len(tags) >= max_tags:
            break

    return tags


def extract_tags_from_keywords(keywords: list[str], max_tags: int = 5) -> list[str]:
    """
    路线 B：从 TF-IDF 关键词通过同义词映射生成标签
    """
    tags = []
    seen = set()

    for kw in keywords:
        kw_lower = kw.lower().strip()
        if kw_lower in _syn_lower:
            tag = _syn_lower[kw_lower]
            if tag not in seen:
                seen.add(tag)
                tags.append(tag)
        elif " " in kw_lower:
            for part in kw_lower.split():
                if part in _syn_lower:
                    tag = _syn_lower[part]
                    if tag not in seen:
                        seen.add(tag)
                        tags.append(tag)
        if len(tags) >= max_tags:
            break

    return tags


def merge_tags(tags_a: list[str], tags_b: list[str], max_tags: int = 5) -> list[str]:
    """合并两路标签，去重，限制数量"""
    seen = set()
    merged = []
    for tag in tags_a + tags_b:
        if tag not in seen:
            seen.add(tag)
            merged.append(tag)
        if len(merged) >= max_tags:
            break
    return merged


# ══════════════════════════════════════════════
#  FastAPI 应用
# ══════════════════════════════════════════════

app = FastAPI(
    title="CodeHub 智能标签服务",
    description="基于 TF-IDF + K-Means + NB 的帖子自动标签与垃圾过滤",
    version="2.0.0",
)


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    is_junk: bool
    tags: list[str]
    cluster_id: int | None
    cluster_name: str | None
    confidence: float
    keywords: list[str]


class BatchPredictRequest(BaseModel):
    texts: list[str]


class BatchPredictResponse(BaseModel):
    results: list[PredictResponse]


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    vectorizer_features: int
    kmeans_clusters: int
    classifier_type: str
    junk_threshold: float


def predict_single(text: str) -> PredictResponse:
    """单条帖子的完整推理流程"""

    # 1. 预处理
    processed = preprocess_to_string(text)
    if not processed.strip():
        return PredictResponse(
            is_junk=True, tags=[], cluster_id=None,
            cluster_name=None, confidence=0.0, keywords=[],
        )

    # 2. TF-IDF 向量化
    vec = vectorizer.transform([processed])

    # 3. 垃圾分类（概率阈值）
    is_junk = False
    junk_prob = 0.0

    if hasattr(junk_clf, "predict_proba"):
        proba = junk_clf.predict_proba(vec)[0]
        junk_prob = proba[1] if len(proba) > 1 else 0.0
        is_junk = junk_prob > JUNK_CONFIDENCE_THRESHOLD
    else:
        pred = junk_clf.predict(vec)[0]
        is_junk = bool(pred == 1)
        junk_prob = 1.0 if is_junk else 0.0

    # 4. 提取 TF-IDF 关键词
    keywords = get_top_keywords(vec, feature_names, top_n=15)

    # 5. 如果是垃圾，直接返回
    if is_junk:
        return PredictResponse(
            is_junk=True, tags=[], cluster_id=None,
            cluster_name=None, confidence=junk_prob, keywords=keywords[:5],
        )

    # 6. K-Means 聚类
    cluster_id = int(kmeans.predict(vec)[0])
    cluster_info = cluster_labels.get(str(cluster_id), {})
    cluster_name = cluster_info.get("name", "未知")

    # 7. 双路标签生成
    tags_from_text = extract_tags_from_raw_text(text)       # 路线A：原文实体匹配
    tags_from_kw = extract_tags_from_keywords(keywords)     # 路线B：TF-IDF关键词映射
    tags = merge_tags(tags_from_text, tags_from_kw)

    # 兜底：都没匹配到就用簇标签
    if not tags:
        base_tags = cluster_info.get("tags", [])
        tags = [t for t in base_tags if t != "非技术"][:3]

    # 8. 置信度（softmax）
    vec_dense = vec.toarray().flatten()
    distances = [np.linalg.norm(vec_dense - centroids[j]) for j in range(kmeans.n_clusters)]
    neg_distances = [-d for d in distances]
    exp_neg = np.exp(neg_distances - np.max(neg_distances))
    softmax = exp_neg / exp_neg.sum()
    confidence = float(softmax[cluster_id])

    return PredictResponse(
        is_junk=False,
        tags=tags,
        cluster_id=cluster_id,
        cluster_name=cluster_name,
        confidence=round(confidence, 4),
        keywords=keywords[:5],
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")
    return predict_single(req.text)


@app.post("/batch-predict", response_model=BatchPredictResponse)
async def batch_predict(req: BatchPredictRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="texts 不能为空")
    if len(req.texts) > 100:
        raise HTTPException(status_code=400, detail="单次最多 100 条")
    results = [predict_single(text) for text in req.texts]
    return BatchPredictResponse(results=results)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        models_loaded=True,
        vectorizer_features=len(feature_names),
        kmeans_clusters=kmeans.n_clusters,
        classifier_type=type(junk_clf).__name__,
        junk_threshold=JUNK_CONFIDENCE_THRESHOLD,
    )