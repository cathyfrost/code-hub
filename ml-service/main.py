"""
CodeHub 智能标签 FastAPI 推理服务 v3
=====================================
两阶段推理流水线（升级自 v2）：

  Stage A (垃圾过滤):
    raw → preprocess → tfidf_vectorizer → junk_classifier
    LinearSVC (Calibrated)，test acc 99.69%

  Stage B (技术帖聚类) ── 仅对 is_junk=False 的样本执行:
    raw → preprocess → tfidf_cluster → svd_pipeline → kmeans
    K=18, Silhouette 0.21（旧版 0.0165）

标签生成保持双路（原文正则 + TF-IDF 关键词），保证向后兼容。
对外 API 契约不变：/predict, /batch-predict, /health。
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from config import (
    CLUSTER_LABELS_FILE,
    JUNK_CLF_MODEL_FILE,
    JUNK_CONFIDENCE_THRESHOLD,
    KMEANS_MODEL_FILE,
    MODELS_DIR,
    TECH_SYNONYMS_FILE,
    TFIDF_MODEL_FILE,
)
from utils.preprocessor import preprocess_to_string
from utils.tag_mapper import get_top_keywords, load_cluster_labels


# 新增产物路径（两阶段架构）
TFIDF_CLUSTER_FILE = os.path.join(str(MODELS_DIR), "tfidf_cluster.pkl")
SVD_PIPELINE_FILE = os.path.join(str(MODELS_DIR), "svd_pipeline.pkl")


# ══════════════════════════════════════════════
#  模型加载
# ══════════════════════════════════════════════
print("加载模型...")
_t0 = time.time()

vectorizer = joblib.load(str(TFIDF_MODEL_FILE))          # 给垃圾分类器
junk_clf = joblib.load(str(JUNK_CLF_MODEL_FILE))
feature_names = vectorizer.get_feature_names_out()

tfidf_cluster = joblib.load(TFIDF_CLUSTER_FILE)          # 给聚类
svd_pipeline = joblib.load(SVD_PIPELINE_FILE)
kmeans = joblib.load(str(KMEANS_MODEL_FILE))
cluster_labels = load_cluster_labels()
feature_names_cluster = tfidf_cluster.get_feature_names_out()
centroids_svd = kmeans.cluster_centers_                  # 在 SVD 空间

# 同义词表（双路标签）
_synonyms: dict = {}
_syn_path = str(TECH_SYNONYMS_FILE)
if os.path.exists(_syn_path):
    with open(_syn_path, "r", encoding="utf-8") as f:
        _synonyms = json.load(f)
_syn_lower = {k.lower(): v for k, v in _synonyms.items()}

print(f"加载完成 ({time.time() - _t0:.2f}s)")
print(f"  TF-IDF (junk path) 词表: {len(feature_names)}")
print(f"  TF-IDF (cluster path) 词表: {len(feature_names_cluster)}")
print(f"  SVD 维度: {kmeans.cluster_centers_.shape[1]}")
print(f"  K-Means K={kmeans.n_clusters}")
print(f"  分类器: {type(junk_clf).__name__}")
print(f"  垃圾阈值: {JUNK_CONFIDENCE_THRESHOLD}")
print(f"  同义词表: {len(_synonyms)} 条")


# ══════════════════════════════════════════════
#  双路标签生成（保留 v2 逻辑，向后兼容）
# ══════════════════════════════════════════════
_entity_patterns = sorted(_synonyms.keys(), key=len, reverse=True)
_entity_regex = (
    re.compile("|".join(re.escape(e) for e in _entity_patterns), re.IGNORECASE)
    if _entity_patterns
    else None
)


def extract_tags_from_raw_text(raw_text: str, max_tags: int = 5) -> list:
    if _entity_regex is None:
        return []
    tags, seen = [], set()
    for m in _entity_regex.findall(raw_text):
        std = _synonyms.get(m) or _syn_lower.get(m.lower())
        if std and std not in seen:
            seen.add(std)
            tags.append(std)
        if len(tags) >= max_tags:
            break
    return tags


def extract_tags_from_keywords(keywords: list, max_tags: int = 5) -> list:
    tags, seen = [], set()
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


def merge_tags(a: list, b: list, max_tags: int = 5) -> list:
    seen, out = set(), []
    for t in a + b:
        if t not in seen:
            seen.add(t)
            out.append(t)
        if len(out) >= max_tags:
            break
    return out


# ══════════════════════════════════════════════
#  FastAPI
# ══════════════════════════════════════════════
app = FastAPI(
    title="CodeHub 智能标签服务",
    description="两阶段流水线：LinearSVC 垃圾过滤 + TF-IDF/SVD/KMeans 技术聚类",
    version="3.0.0",
)


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    is_junk: bool
    tags: List[str]
    cluster_id: Optional[int] = None
    cluster_name: Optional[str] = None
    confidence: float
    keywords: List[str]


class BatchPredictRequest(BaseModel):
    texts: List[str]


class BatchPredictResponse(BaseModel):
    results: List[PredictResponse]


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    vectorizer_features: int
    kmeans_clusters: int
    classifier_type: str
    junk_threshold: float


def predict_single(text: str) -> PredictResponse:
    """两阶段推理"""

    # 1. 预处理
    processed = preprocess_to_string(text)
    if not processed.strip():
        return PredictResponse(
            is_junk=True, tags=[], cluster_id=None,
            cluster_name=None, confidence=0.0, keywords=[],
        )

    # ── Stage A: 垃圾分类 ──
    vec = vectorizer.transform([processed])

    is_junk = False
    junk_prob = 0.0
    if hasattr(junk_clf, "predict_proba"):
        proba = junk_clf.predict_proba(vec)[0]
        junk_prob = float(proba[1]) if len(proba) > 1 else 0.0
        is_junk = junk_prob > JUNK_CONFIDENCE_THRESHOLD
    else:
        pred = int(junk_clf.predict(vec)[0])
        is_junk = pred == 1
        junk_prob = 1.0 if is_junk else 0.0

    # 垃圾帖直接返回（用 junk TF-IDF 抽 5 个关键词，供前端展示）
    if is_junk:
        kw = get_top_keywords(vec, feature_names, top_n=5)
        return PredictResponse(
            is_junk=True, tags=[], cluster_id=None,
            cluster_name=None, confidence=round(junk_prob, 4), keywords=kw,
        )

    # ── Stage B: 技术帖聚类 ──
    vec_c = tfidf_cluster.transform([processed])
    vec_svd = svd_pipeline.transform(vec_c)
    cluster_id = int(kmeans.predict(vec_svd)[0])
    cluster_info = cluster_labels.get(str(cluster_id), {})
    cluster_name = cluster_info.get("name", "未知")

    # 关键词从 cluster TF-IDF 抽（tech-only 词表，对技术帖更准）
    keywords = get_top_keywords(vec_c, feature_names_cluster, top_n=15)

    # 双路标签生成 + 簇标签兜底
    tags_a = extract_tags_from_raw_text(text)
    tags_b = extract_tags_from_keywords(keywords)
    tags = merge_tags(tags_a, tags_b)
    if not tags:
        base = cluster_info.get("tags", [])
        tags = [t for t in base if t != "非技术"][:3]

    # 置信度：在 SVD 空间用 softmax(-distance)
    flat = vec_svd.flatten()
    distances = np.linalg.norm(centroids_svd - flat, axis=1)
    neg = -distances
    exp_neg = np.exp(neg - neg.max())
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
    results = [predict_single(t) for t in req.texts]
    return BatchPredictResponse(results=results)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        models_loaded=True,
        vectorizer_features=len(feature_names),
        kmeans_clusters=int(kmeans.n_clusters),
        classifier_type=type(junk_clf).__name__,
        junk_threshold=JUNK_CONFIDENCE_THRESHOLD,
    )
