"""
05_evaluate.py
==============
端到端评估在测试集上的表现：
  1. 用 TF-IDF + 垃圾分类器 做技术/垃圾判断
  2. 对判定为技术的样本，用 cluster TF-IDF + SVD + KMeans 给簇
  3. 输出整体准确率、与 03 单独评估对比

并产出最终的词云图（每簇一张）。
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

from sklearn.metrics import classification_report, confusion_matrix, f1_score

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

import matplotlib.font_manager as fm
ZH_FONT = None
for cand in ["PingFang SC", "Hiragino Sans GB", "STHeiti",
             "Heiti SC", "Arial Unicode MS", "Songti SC"]:
    matches = [f for f in fm.fontManager.ttflist if cand in f.name]
    if matches:
        plt.rcParams["font.sans-serif"] = [cand]
        ZH_FONT = matches[0].fname
        break
plt.rcParams["axes.unicode_minus"] = False

TEST = os.path.join(ROOT, "data", "processed", "test.csv")
MODELS_DIR = os.path.join(ROOT, "models")
FIG_DIR = os.path.join(ROOT, "outputs", "figures")


def main():
    test_df = pd.read_csv(TEST, encoding="utf-8-sig")
    test_df["processed_text"] = test_df["processed_text"].fillna("").astype(str)
    test_df["category"] = test_df["category"].fillna("").astype(str)
    y_true_junk = test_df["is_junk"].astype(int).values

    tfidf = joblib.load(os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
    junk_clf = joblib.load(os.path.join(MODELS_DIR, "junk_classifier.pkl"))
    tfidf_cluster = joblib.load(os.path.join(MODELS_DIR, "tfidf_cluster.pkl"))
    svd = joblib.load(os.path.join(MODELS_DIR, "svd_pipeline.pkl"))
    kmeans = joblib.load(os.path.join(MODELS_DIR, "kmeans_model.pkl"))
    with open(os.path.join(MODELS_DIR, "cluster_labels.json")) as f:
        cluster_labels = json.load(f)

    # ── Step 1: 全测试集跑垃圾分类器 ──
    X = tfidf.transform(test_df["processed_text"])
    y_pred_junk = junk_clf.predict(X)
    print(f"垃圾分类器在测试集表现:")
    print(classification_report(y_true_junk, y_pred_junk,
                                target_names=["技术帖", "垃圾帖"], digits=4))

    # ── Step 2: 对真实技术帖跑聚类（用真实标签衡量聚类与类别的纯度）──
    tech_mask = test_df["is_junk"] == 0
    tech_test = test_df[tech_mask].reset_index(drop=True)
    X_c = tfidf_cluster.transform(tech_test["processed_text"])
    X_lsa = svd.transform(X_c)
    cluster_preds = kmeans.predict(X_lsa)
    tech_test["pred_cluster"] = cluster_preds
    tech_test["pred_cluster_name"] = [cluster_labels[str(c)]["name"] for c in cluster_preds]

    cross = pd.crosstab(tech_test["category"], tech_test["pred_cluster"])
    purity = cross.values.max(axis=1).sum() / cross.values.sum()
    print(f"\n测试集技术帖聚类纯度 (每行最大值之和/总样本) = {purity:.4f}")
    print(f"  解读：{purity*100:.1f}% 的技术帖落入了「该类别在某簇下的主导桶」")

    # 保存测试集预测明细
    tech_test[["content", "category", "pred_cluster", "pred_cluster_name"]].to_csv(
        os.path.join(ROOT, "outputs", "test_cluster_predictions.csv"),
        index=False, encoding="utf-8-sig",
    )

    # ── 图：每簇词云 ──
    try:
        from wordcloud import WordCloud
        feat_names = tfidf_cluster.get_feature_names_out()
        # 在 TF-IDF 原空间重建 centroid
        centroids_orig = kmeans.cluster_centers_ @ svd.named_steps["truncatedsvd"].components_
        K = kmeans.n_clusters
        n_cols = min(4, K)
        n_rows = (K + n_cols - 1) // n_cols
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(4 * n_cols, 3.2 * n_rows))
        axes = np.array(axes).flatten()
        for c in range(K):
            centroid = centroids_orig[c]
            top_idx = centroid.argsort()[-50:][::-1]
            freqs = {feat_names[i]: max(centroid[i], 1e-6) for i in top_idx}
            wc = WordCloud(font_path=ZH_FONT, background_color="white",
                           width=400, height=320, max_words=30,
                           colormap="tab10").generate_from_frequencies(freqs)
            axes[c].imshow(wc); axes[c].axis("off")
            name = cluster_labels[str(c)]["name"]
            axes[c].set_title(f"簇{c} · {name} ({cluster_labels[str(c)]['size']})",
                              fontsize=11)
        for j in range(K, len(axes)):
            axes[j].axis("off")
        plt.suptitle(f"各簇关键词词云 (K={K})", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.savefig(os.path.join(FIG_DIR, "cluster_wordclouds.png"),
                    dpi=160, bbox_inches="tight")
        plt.close()
        print(f"词云已保存: cluster_wordclouds.png")
    except Exception as e:
        print(f"词云生成失败: {e}")

    # ── 最终汇总 ──
    overall = {
        "junk_classifier": {
            "test_acc": float((y_pred_junk == y_true_junk).mean()),
            "f1_junk": float(f1_score(y_true_junk, y_pred_junk, pos_label=1)),
            "f1_tech": float(f1_score(y_true_junk, y_pred_junk, pos_label=0)),
        },
        "clustering": {
            "K": int(kmeans.n_clusters),
            "test_purity": float(purity),
        },
    }
    out_path = os.path.join(ROOT, "outputs", "final_summary.json")
    with open(out_path, "w") as f:
        json.dump(overall, f, ensure_ascii=False, indent=2)
    print(f"\n最终汇总: {overall}")
    print(f"保存到 {out_path}")


if __name__ == "__main__":
    main()
