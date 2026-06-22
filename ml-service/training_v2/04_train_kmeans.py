"""
04_train_kmeans.py
==================
对【只剩技术帖】的训练子集做聚类：
  1. TF-IDF (max_features=8000) 重新 fit_transform
  2. TruncatedSVD 降到 100 维 (LSA)
  3. 在 SVD 空间上扫 K=[5..18]，按 Silhouette 选最优 K
  4. 用最优 K 训练 KMeans，根据每簇主导类别自动取名

产出：
  models/tfidf_vectorizer.pkl  (复用 03 产物或重新 fit)
  models/svd_pipeline.pkl
  models/kmeans_model.pkl
  models/cluster_labels.json
  outputs/figures/kmeans_metrics.png  (Elbow + Silhouette + DB + CH 四联图)
  outputs/figures/kmeans_pca_tsne.png
  outputs/figures/cluster_distribution.png
  outputs/figures/category_vs_cluster.png

注意：垃圾分类器用的 TF-IDF (03 产出) 是【在全量数据上 fit 的】，
推理路径需要兼容；这里聚类专用一份单独的 TF-IDF，只在技术帖子集上 fit，
保存到 models/tfidf_cluster.pkl 与 svd_pipeline.pkl 配对。
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import Normalizer
from sklearn.pipeline import make_pipeline
from sklearn.cluster import KMeans
from sklearn.metrics import (
    silhouette_score, calinski_harabasz_score, davies_bouldin_score,
)
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

import matplotlib.font_manager as fm
for cand in ["PingFang SC", "Hiragino Sans GB", "STHeiti",
             "Heiti SC", "Arial Unicode MS", "Songti SC"]:
    if any(cand in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [cand]
        break
plt.rcParams["axes.unicode_minus"] = False

TRAIN = os.path.join(ROOT, "data", "processed", "train.csv")
MODELS_DIR = os.path.join(ROOT, "models")
FIG_DIR = os.path.join(ROOT, "outputs", "figures")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FIG_DIR, exist_ok=True)

TFIDF_CLUSTER_PATH = os.path.join(MODELS_DIR, "tfidf_cluster.pkl")
SVD_PATH = os.path.join(MODELS_DIR, "svd_pipeline.pkl")
KMEANS_PATH = os.path.join(MODELS_DIR, "kmeans_model.pkl")
LABELS_PATH = os.path.join(MODELS_DIR, "cluster_labels.json")

K_RANGE = list(range(5, 19))
SVD_DIM = 100


def auto_name_clusters(train_df, labels, top_keywords):
    """根据每簇主导类别 + 关键词自动命名"""
    out = {}
    for c in sorted(set(labels)):
        mask = labels == c
        sub = train_df[mask]
        cats = sub["category"].value_counts()
        dominant = cats.index[0] if len(cats) else "其他技术"
        # 选前 3 个非空类别作为 tags
        non_empty = [str(x) for x in cats.index if str(x).strip()][:3]
        if not non_empty:
            non_empty = ["其他技术"]
        out[str(c)] = {
            "name": dominant if dominant.strip() else "其他技术",
            "size": int(mask.sum()),
            "tags": non_empty,
            "keywords": top_keywords[c][:6],
            "category_distribution": {str(k): int(v) for k, v in cats.head(5).items()},
        }
    return out


def main():
    train_df = pd.read_csv(TRAIN, encoding="utf-8-sig")
    train_df["processed_text"] = train_df["processed_text"].fillna("").astype(str)
    train_df["category"] = train_df["category"].fillna("").astype(str)

    # 只对技术帖聚类
    tech = train_df[train_df["is_junk"] == 0].reset_index(drop=True)
    print(f"技术帖训练子集: {len(tech)} 条")
    print(f"类别数: {tech['category'].nunique()}")

    # ── 在技术帖子集上 fit TF-IDF（专用于聚类）──
    vec = TfidfVectorizer(
        max_features=8000, max_df=0.85, min_df=2,
        ngram_range=(1, 2), sublinear_tf=True,
    )
    X = vec.fit_transform(tech["processed_text"])
    feat_names = vec.get_feature_names_out()
    print(f"TF-IDF: {X.shape}, nnz={X.nnz}")

    # ── SVD 降维 (LSA) ──
    svd = TruncatedSVD(n_components=SVD_DIM, random_state=42)
    normalizer = Normalizer(copy=False)
    lsa = make_pipeline(svd, normalizer)
    X_lsa = lsa.fit_transform(X)
    explained = svd.explained_variance_ratio_.sum()
    print(f"SVD: {X_lsa.shape}, 解释方差 {explained*100:.1f}%")

    # ── K 选择 ──
    print("\nK 扫描:")
    wcss, sils, chs, dbs = [], [], [], []
    for k in K_RANGE:
        km = KMeans(n_clusters=k, n_init=15, max_iter=300, random_state=42)
        lbl = km.fit_predict(X_lsa)
        s = silhouette_score(X_lsa, lbl)
        ch = calinski_harabasz_score(X_lsa, lbl)
        db = davies_bouldin_score(X_lsa, lbl)
        wcss.append(km.inertia_); sils.append(s); chs.append(ch); dbs.append(db)
        print(f"  K={k:2d}  WCSS={km.inertia_:.2f}  Sil={s:.4f}  CH={ch:6.1f}  DB={db:.4f}")

    # 选 Silhouette 最高的 K
    best_k = K_RANGE[int(np.argmax(sils))]
    print(f"\n★ 最优 K (Silhouette peak) = {best_k}, sil={max(sils):.4f}")

    # ── 四联图 ──
    fig, axes = plt.subplots(2, 2, figsize=(13, 9))
    axes[0, 0].plot(K_RANGE, wcss, "bo-"); axes[0, 0].set_title("肘部法则 WCSS")
    axes[0, 0].set_xlabel("K"); axes[0, 0].set_ylabel("WCSS"); axes[0, 0].grid(alpha=0.3)

    axes[0, 1].plot(K_RANGE, sils, "rs-")
    axes[0, 1].axvline(best_k, color="green", linestyle="--", label=f"最优 K={best_k}")
    axes[0, 1].set_title("Silhouette Score (越大越好)")
    axes[0, 1].set_xlabel("K"); axes[0, 1].set_ylabel("Sil"); axes[0, 1].grid(alpha=0.3); axes[0, 1].legend()

    axes[1, 0].plot(K_RANGE, chs, "g^-")
    axes[1, 0].set_title("Calinski-Harabasz (越大越好)")
    axes[1, 0].set_xlabel("K"); axes[1, 0].set_ylabel("CH"); axes[1, 0].grid(alpha=0.3)

    axes[1, 1].plot(K_RANGE, dbs, "mv-")
    axes[1, 1].set_title("Davies-Bouldin (越小越好)")
    axes[1, 1].set_xlabel("K"); axes[1, 1].set_ylabel("DB"); axes[1, 1].grid(alpha=0.3)

    plt.suptitle(f"K-Means 评估指标扫描 (n={len(tech)}, SVD={SVD_DIM}d)", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "kmeans_metrics.png"), dpi=180, bbox_inches="tight")
    plt.close()

    # ── 最终模型 ──
    km = KMeans(n_clusters=best_k, n_init=30, max_iter=500, random_state=42)
    labels = km.fit_predict(X_lsa)
    tech["cluster"] = labels

    # ── 关键词：从原 TF-IDF 空间的 centroids 重建 ──
    # 由于聚类发生在 LSA 空间，要把 LSA centroid 投回原 V 维 TF-IDF 空间
    # X_lsa = (X @ V) @ Normalizer，X = tfidf；V = svd.components_.T；
    # 因此 centroid_in_tfidf ≈ centroid_in_lsa @ V.T = centroid_in_lsa @ svd.components_
    centroids_orig = km.cluster_centers_ @ svd.components_

    top_keywords = {}
    for c in range(best_k):
        top_idx = centroids_orig[c].argsort()[-15:][::-1]
        top_keywords[c] = [feat_names[i] for i in top_idx]

    cluster_info = auto_name_clusters(tech, labels, top_keywords)

    # ── 保存 ──
    with open(LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(cluster_info, f, ensure_ascii=False, indent=2)
    joblib.dump(vec, TFIDF_CLUSTER_PATH)
    joblib.dump(lsa, SVD_PATH)
    joblib.dump(km, KMEANS_PATH)
    print(f"\n保存: {TFIDF_CLUSTER_PATH}")
    print(f"保存: {SVD_PATH}")
    print(f"保存: {KMEANS_PATH}")
    print(f"保存: {LABELS_PATH}")

    # ── 图：簇大小柱状图 ──
    fig, ax = plt.subplots(figsize=(11, 5.5))
    sizes = pd.Series(labels).value_counts().sort_index()
    bars = ax.bar(sizes.index, sizes.values, color=plt.cm.tab20(np.linspace(0, 1, best_k)))
    for b, v in zip(bars, sizes.values):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 3,
                str(v), ha="center", fontsize=10, fontweight="bold")
    xlabels = [f"簇{i}\n{cluster_info[str(i)]['name'][:8]}" for i in sizes.index]
    ax.set_xticks(sizes.index); ax.set_xticklabels(xlabels, fontsize=9)
    ax.set_title(f"各簇样本数分布 (K={best_k})", fontsize=14)
    ax.set_xlabel("簇编号"); ax.set_ylabel("样本数")
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "cluster_distribution.png"), dpi=180, bbox_inches="tight")
    plt.close()

    # ── 图：PCA + t-SNE 双视图 ──
    print("\n降维做散点（PCA + t-SNE）...")
    pca = PCA(n_components=2, random_state=42)
    coords_pca = pca.fit_transform(X_lsa)
    tsne = TSNE(n_components=2, random_state=42, perplexity=min(30, len(tech) - 1),
                init="pca", learning_rate="auto")
    coords_tsne = tsne.fit_transform(X_lsa)

    fig, axes = plt.subplots(1, 2, figsize=(15, 6.5))
    for ax, coords, title in [(axes[0], coords_pca, "PCA 投影"),
                              (axes[1], coords_tsne, "t-SNE 投影")]:
        sc = ax.scatter(coords[:, 0], coords[:, 1], c=labels, cmap="tab20",
                        s=14, alpha=0.7, edgecolors="none")
        ax.set_title(f"{title} — K-Means K={best_k}", fontsize=13)
        ax.set_xlabel("dim 1"); ax.set_ylabel("dim 2")
    plt.suptitle("聚类结果可视化（颜色 = 簇编号）", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "kmeans_pca_tsne.png"), dpi=180, bbox_inches="tight")
    plt.close()

    # ── 图：原始类别 vs 预测簇 交叉热力图 ──
    cross = pd.crosstab(tech["category"], tech["cluster"])
    # 行序按总数倒序
    cross = cross.loc[cross.sum(axis=1).sort_values(ascending=False).index]
    fig, ax = plt.subplots(figsize=(min(2 + best_k, 18), max(6, 0.35 * len(cross))))
    sns.heatmap(cross, annot=True, fmt="d", cmap="YlOrRd", linewidths=0.4, ax=ax,
                cbar_kws={"label": "样本数"})
    ax.set_title("原始类别 × K-Means 簇 交叉表（理想：每行集中在 1-2 列）", fontsize=12)
    ax.set_xlabel("簇编号"); ax.set_ylabel("原始类别")
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "category_vs_cluster.png"), dpi=180, bbox_inches="tight")
    plt.close()

    # ── 摘要 ──
    summary = {
        "n_tech_train": int(len(tech)),
        "tfidf_dim": int(X.shape[1]),
        "svd_dim": SVD_DIM,
        "svd_explained_var": float(explained),
        "best_K": int(best_k),
        "silhouette": float(max(sils)),
        "wcss": float(km.inertia_),
        "k_metrics": {
            "K": K_RANGE,
            "wcss": [float(v) for v in wcss],
            "silhouette": [float(v) for v in sils],
            "ch": [float(v) for v in chs],
            "db": [float(v) for v in dbs],
        },
    }
    with open(os.path.join(ROOT, "outputs", "kmeans_summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\n摘要 silhouette={max(sils):.4f}, K={best_k}")


if __name__ == "__main__":
    main()
