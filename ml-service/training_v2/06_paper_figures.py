"""
06_paper_figures.py
===================
生成论文/答辩用的图表：
  - fig_pipeline.png         流水线架构图（matplotlib 绘制）
  - fig_before_after.png     旧 vs 新 关键指标对比柱状图
  - fig_dataset.png          数据集组成（饼图 + 类别分布）
  - fig_threshold.png        垃圾阈值敏感性曲线
  - fig_learning_curve.png   训练集规模 vs 性能
  - fig_examples.png         每簇代表性预测示例（表格）
  - fig_summary_dashboard.png 一张总览图（4 panel 仪表盘）
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
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

from sklearn.metrics import f1_score, accuracy_score, precision_score, recall_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

import matplotlib.font_manager as fm
for cand in ["PingFang SC", "Hiragino Sans GB", "STHeiti",
             "Heiti SC", "Arial Unicode MS", "Songti SC"]:
    if any(cand in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [cand]
        break
plt.rcParams["axes.unicode_minus"] = False

TRAIN = os.path.join(ROOT, "data", "processed", "train.csv")
TEST = os.path.join(ROOT, "data", "processed", "test.csv")
RAW = os.path.join(ROOT, "data", "raw", "posts_corpus.csv")
MODELS = os.path.join(ROOT, "models")
FIG = os.path.join(ROOT, "outputs", "figures")
os.makedirs(FIG, exist_ok=True)


# ──────────────────────────────────────────────────────────────
# 图 1: 流水线架构
# ──────────────────────────────────────────────────────────────
def fig_pipeline():
    fig, ax = plt.subplots(figsize=(14, 6.5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7)
    ax.axis("off")

    def box(x, y, w, h, label, color, text_color="black", fs=10):
        ax.add_patch(FancyBboxPatch(
            (x, y), w, h, boxstyle="round,pad=0.08",
            linewidth=1.3, facecolor=color, edgecolor="#333"))
        ax.text(x + w / 2, y + h / 2, label, ha="center", va="center",
                fontsize=fs, fontweight="bold", color=text_color, wrap=True)

    def arrow(x1, y1, x2, y2):
        ax.add_patch(FancyArrowPatch(
            (x1, y1), (x2, y2), arrowstyle="->",
            mutation_scale=22, linewidth=1.6, color="#444"))

    # 输入
    box(0.2, 3, 1.4, 1, "原始帖文\n(HTML/MD)", "#dfe9f5", fs=10)

    # 预处理
    box(2.0, 2.5, 1.8, 2, "预处理\n(jieba 分词\n停用词\n同义词归一)", "#fff2cc", fs=9)

    # TF-IDF（双路）
    box(4.4, 4.3, 1.7, 1.0, "TF-IDF（全量）\n8000 维", "#e1f5e1", fs=9)
    box(4.4, 1.7, 1.7, 1.0, "TF-IDF（技术帖）\n~3000 维", "#e1f5e1", fs=9)

    # Stage A
    box(6.8, 4.3, 2.0, 1.0, "Stage A\nLinearSVC\n(Calibrated)", "#f8cecc", fs=10)
    box(9.6, 4.3, 1.4, 1.0, "is_junk\n判定", "#f5d6e8", fs=10)

    # Stage B
    box(6.8, 1.7, 1.7, 1.0, "SVD/LSA\n降到 100 维", "#d5e8d4", fs=9)
    box(9.0, 1.7, 1.7, 1.0, "K-Means\nK=18", "#d5e8d4", fs=10)
    box(11.4, 1.2, 2.2, 2.0, "标签生成\n• 簇名\n• 同义词映射\n• 原文实体匹配\n• 置信度", "#fef9c8", fs=9)

    # Junk path
    box(11.4, 4.3, 2.2, 1.0, "返回\nis_junk=True", "#f5b7b1", fs=10)

    # 输入箭头
    arrow(1.6, 3.5, 2.0, 3.5)
    arrow(3.8, 4.0, 4.4, 4.7)
    arrow(3.8, 3.0, 4.4, 2.2)
    arrow(6.1, 4.7, 6.8, 4.7)
    arrow(8.8, 4.7, 9.6, 4.7)
    arrow(11.0, 4.7, 11.4, 4.7)
    arrow(6.1, 2.2, 6.8, 2.2)
    arrow(8.5, 2.2, 9.0, 2.2)
    arrow(10.7, 2.2, 11.4, 2.2)
    # 分流箭头
    arrow(10.3, 4.3, 9.6, 3.0)

    # 注释
    ax.text(7.0, 5.7, "Stage A —— 垃圾过滤", fontsize=11,
            fontweight="bold", color="#c0392b")
    ax.text(7.0, 0.6, "Stage B —— 技术帖聚类与打标 (仅 is_junk=False)",
            fontsize=11, fontweight="bold", color="#27ae60")
    ax.text(7.0, 6.4, "CodeHub 智能标签服务 v3 - 两阶段推理流水线",
            ha="center", fontsize=14, fontweight="bold")

    plt.savefig(os.path.join(FIG, "fig_pipeline.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_pipeline.png")


# ──────────────────────────────────────────────────────────────
# 图 2: Before/After 对比
# ──────────────────────────────────────────────────────────────
def fig_before_after():
    # 旧 vs 新 数据来自审计结果与新训练
    metrics_clf = {
        "测试集准确率": (0.9495, 0.9969),
        "F1 (垃圾类)":  (0.9630, 0.9961),
        "F1 (技术类)":  (0.9207, 0.9974),
    }
    metrics_cluster = {
        "Silhouette ↑": (0.0165, 0.2100),
        "DB 倒数 ↑":   (1 / 7.99, 1 / 2.47),  # 取倒数让"越大越好"
        "CH / 100 ↑":  (16.1 / 100, 101.0 / 100),
    }

    fig, axes = plt.subplots(1, 2, figsize=(14, 5.5))

    # ── 左：分类器 ──
    ax = axes[0]
    keys = list(metrics_clf.keys())
    old = [metrics_clf[k][0] for k in keys]
    new = [metrics_clf[k][1] for k in keys]
    x = np.arange(len(keys))
    w = 0.36
    b1 = ax.bar(x - w / 2, old, w, label="旧模型 (NB)", color="#c0392b", alpha=0.85)
    b2 = ax.bar(x + w / 2, new, w, label="新模型 (LinearSVC)", color="#27ae60", alpha=0.9)
    for bars, vals in [(b1, old), (b2, new)]:
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + 0.01,
                    f"{v:.3f}", ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(keys, fontsize=11)
    ax.set_ylim(0.8, 1.05); ax.set_ylabel("分数")
    ax.set_title("垃圾分类器：优化前 vs 优化后", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right"); ax.grid(axis="y", alpha=0.3)

    # ── 右：聚类 ──
    ax = axes[1]
    keys = list(metrics_cluster.keys())
    old = [metrics_cluster[k][0] for k in keys]
    new = [metrics_cluster[k][1] for k in keys]
    x = np.arange(len(keys))
    b1 = ax.bar(x - w / 2, old, w, label="旧模型 (K=10 直接聚类)", color="#c0392b", alpha=0.85)
    b2 = ax.bar(x + w / 2, new, w, label="新模型 (SVD + K=18)", color="#27ae60", alpha=0.9)
    for bars, vals in [(b1, old), (b2, new)]:
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + 0.02,
                    f"{v:.3f}", ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(keys, fontsize=11)
    ax.set_ylabel("分数（越大越好）")
    ax.set_title("K-Means 聚类：优化前 vs 优化后", fontsize=13, fontweight="bold")
    ax.legend(loc="upper left"); ax.grid(axis="y", alpha=0.3)

    plt.suptitle("核心指标优化前后对比", fontsize=15, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "fig_before_after.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_before_after.png")


# ──────────────────────────────────────────────────────────────
# 图 3: 数据集组成
# ──────────────────────────────────────────────────────────────
def fig_dataset():
    df = pd.read_csv(RAW, encoding="utf-8-sig")
    df["category"] = df["category"].fillna("").astype(str)
    n_tech = int((df["is_junk"] == 0).sum())
    n_junk = int((df["is_junk"] == 1).sum())

    fig, axes = plt.subplots(1, 2, figsize=(14, 5.5))
    # 左：饼图
    ax = axes[0]
    ax.pie([n_tech, n_junk], labels=[f"技术帖\n{n_tech}", f"垃圾帖\n{n_junk}"],
           colors=["#27ae60", "#e74c3c"], autopct="%.1f%%",
           textprops={"fontsize": 12, "fontweight": "bold"}, startangle=90,
           wedgeprops={"linewidth": 1.5, "edgecolor": "white"})
    ax.set_title(f"语料组成 (n={len(df)})", fontsize=13, fontweight="bold")

    # 右：技术帖类别分布
    ax = axes[1]
    tech = df[df["is_junk"] == 0].copy()
    cats = tech["category"].replace("", "未分类").value_counts().head(20)
    bars = ax.barh(range(len(cats)), cats.values, color=plt.cm.viridis(np.linspace(0.15, 0.85, len(cats))))
    ax.set_yticks(range(len(cats))); ax.set_yticklabels(cats.index, fontsize=10)
    ax.invert_yaxis()
    for b, v in zip(bars, cats.values):
        ax.text(v + 4, b.get_y() + b.get_height() / 2, str(v), va="center", fontsize=9)
    ax.set_xlabel("帖子数"); ax.set_title("技术帖类别分布 (Top 20)", fontsize=13, fontweight="bold")
    ax.grid(axis="x", alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "fig_dataset.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_dataset.png")


# ──────────────────────────────────────────────────────────────
# 图 4: 垃圾阈值敏感性
# ──────────────────────────────────────────────────────────────
def fig_threshold():
    test_df = pd.read_csv(TEST, encoding="utf-8-sig")
    test_df["processed_text"] = test_df["processed_text"].fillna("").astype(str)
    tfidf = joblib.load(os.path.join(MODELS, "tfidf_vectorizer.pkl"))
    clf = joblib.load(os.path.join(MODELS, "junk_classifier.pkl"))
    X = tfidf.transform(test_df["processed_text"])
    y = test_df["is_junk"].astype(int).values
    proba = clf.predict_proba(X)[:, 1]

    thresholds = np.linspace(0.05, 0.95, 31)
    acc, prec_j, rec_j, f1_j, f1_t = [], [], [], [], []
    for t in thresholds:
        pred = (proba >= t).astype(int)
        acc.append(accuracy_score(y, pred))
        prec_j.append(precision_score(y, pred, pos_label=1, zero_division=0))
        rec_j.append(recall_score(y, pred, pos_label=1, zero_division=0))
        f1_j.append(f1_score(y, pred, pos_label=1, zero_division=0))
        f1_t.append(f1_score(y, pred, pos_label=0, zero_division=0))

    fig, ax = plt.subplots(figsize=(11, 6))
    ax.plot(thresholds, acc, label="Accuracy", linewidth=2.4, color="#2c3e50")
    ax.plot(thresholds, f1_j, label="F1 (垃圾类)", linewidth=2, color="#e74c3c")
    ax.plot(thresholds, f1_t, label="F1 (技术类)", linewidth=2, color="#27ae60")
    ax.plot(thresholds, prec_j, "--", label="Precision (垃圾)", linewidth=1.5, alpha=0.7, color="#e67e22")
    ax.plot(thresholds, rec_j, "--", label="Recall (垃圾)", linewidth=1.5, alpha=0.7, color="#9b59b6")
    ax.axvline(0.5, color="gray", linestyle=":", alpha=0.6, label="默认 0.5")
    ax.axvline(0.8, color="blue", linestyle=":", alpha=0.6, label="当前 0.8")
    ax.set_xlabel("垃圾判定阈值"); ax.set_ylabel("分数")
    ax.set_title("垃圾分类器阈值敏感性分析", fontsize=13, fontweight="bold")
    ax.legend(loc="lower left", ncol=2); ax.grid(alpha=0.3)
    ax.set_ylim(0.5, 1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "fig_threshold.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_threshold.png")


# ──────────────────────────────────────────────────────────────
# 图 5: 学习曲线（不同训练规模 vs 性能）
# ──────────────────────────────────────────────────────────────
def fig_learning_curve():
    train_df = pd.read_csv(TRAIN, encoding="utf-8-sig")
    test_df = pd.read_csv(TEST, encoding="utf-8-sig")
    train_df["processed_text"] = train_df["processed_text"].fillna("").astype(str)
    test_df["processed_text"] = test_df["processed_text"].fillna("").astype(str)

    rng = np.random.RandomState(42)
    n_total = len(train_df)
    fractions = [0.1, 0.2, 0.3, 0.5, 0.7, 0.85, 1.0]
    accs, f1s = [], []
    for frac in fractions:
        n = int(n_total * frac)
        idx = rng.permutation(n_total)[:n]
        sub = train_df.iloc[idx]
        vec = TfidfVectorizer(max_features=8000, max_df=0.9, min_df=2,
                              ngram_range=(1, 2), sublinear_tf=True)
        X_tr = vec.fit_transform(sub["processed_text"])
        y_tr = sub["is_junk"].astype(int).values
        X_te = vec.transform(test_df["processed_text"])
        y_te = test_df["is_junk"].astype(int).values
        clf = LinearSVC(C=1.0, max_iter=3000, class_weight="balanced", random_state=42)
        clf = CalibratedClassifierCV(clf, cv=3).fit(X_tr, y_tr)
        pred = clf.predict(X_te)
        accs.append(accuracy_score(y_te, pred))
        f1s.append((f1_score(y_te, pred, pos_label=0) +
                    f1_score(y_te, pred, pos_label=1)) / 2)
        print(f"  frac={frac:.2f}  n={n:>4d}  acc={accs[-1]:.4f}  macroF1={f1s[-1]:.4f}")

    sizes = [int(n_total * f) for f in fractions]
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(sizes, accs, "o-", linewidth=2.4, markersize=9, color="#2c3e50", label="Accuracy")
    ax.plot(sizes, f1s, "s--", linewidth=2.0, markersize=8, color="#e67e22", label="Macro F1")
    for s, a in zip(sizes, accs):
        ax.text(s, a + 0.004, f"{a:.3f}", ha="center", fontsize=9)
    ax.set_xlabel("训练样本数"); ax.set_ylabel("分数")
    ax.set_title("学习曲线 - 训练规模对垃圾分类器性能的影响", fontsize=13, fontweight="bold")
    ax.grid(alpha=0.3); ax.legend(loc="lower right")
    ax.set_ylim(0.88, 1.005)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "fig_learning_curve.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_learning_curve.png")


# ──────────────────────────────────────────────────────────────
# 图 6: 每簇代表性预测示例（表格）
# ──────────────────────────────────────────────────────────────
def fig_examples():
    # 读测试集预测结果
    pred_csv = os.path.join(ROOT, "outputs", "test_cluster_predictions.csv")
    df = pd.read_csv(pred_csv, encoding="utf-8-sig")
    with open(os.path.join(MODELS, "cluster_labels.json")) as f:
        cluster_labels = json.load(f)

    rng = np.random.RandomState(42)
    # 每簇挑 1 个代表性短样本
    rows = []
    for cid in sorted(cluster_labels.keys(), key=int):
        sub = df[df["pred_cluster"] == int(cid)]
        if len(sub) == 0:
            continue
        # 挑长度 30-80 之间的样本（保证可读）
        sub2 = sub[sub["content"].str.len().between(20, 80)]
        if len(sub2):
            sample = sub2.sample(1, random_state=42).iloc[0]
        else:
            sample = sub.sample(1, random_state=42).iloc[0]
        true_cat = sample["category"] if str(sample["category"]).strip() else "(无)"
        is_match = str(sample["category"]).strip() == cluster_labels[cid]["name"]
        rows.append({
            "簇": cid,
            "簇名": cluster_labels[cid]["name"],
            "示例文本": sample["content"][:60] + ("..." if len(sample["content"]) > 60 else ""),
            "真实类别": true_cat,
            "预测正确": "YES" if is_match else "-",
        })

    # 用 matplotlib 画一个表格图
    n = len(rows)
    fig, ax = plt.subplots(figsize=(13, 0.42 * n + 1))
    ax.axis("off")
    cell_text = [[r["簇"], r["簇名"], r["示例文本"], r["真实类别"], r["预测正确"]] for r in rows]
    cols = ["簇 ID", "预测簇名", "测试集文本片段", "真实类别", "对齐"]
    table = ax.table(cellText=cell_text, colLabels=cols, loc="center", cellLoc="left",
                     colWidths=[0.05, 0.10, 0.62, 0.13, 0.07])
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 1.5)
    # 表头样式
    for i in range(len(cols)):
        cell = table[0, i]
        cell.set_facecolor("#2c3e50"); cell.set_text_props(color="white", fontweight="bold")
    # 行交替
    for i in range(1, n + 1):
        for j in range(len(cols)):
            cell = table[i, j]
            cell.set_facecolor("#ecf0f1" if i % 2 == 0 else "white")
            if j == 4:  # 对齐列
                if cell.get_text().get_text() == "YES":
                    cell.set_text_props(color="#27ae60", fontweight="bold", ha="center")
                else:
                    cell.set_text_props(color="#7f8c8d", ha="center")
    ax.set_title("每簇测试集预测示例（验证簇与真实类别的对齐情况）",
                 fontsize=13, fontweight="bold", pad=14)
    plt.savefig(os.path.join(FIG, "fig_examples.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_examples.png")


# ──────────────────────────────────────────────────────────────
# 图 7: 总览仪表盘
# ──────────────────────────────────────────────────────────────
def fig_summary_dashboard():
    fig = plt.figure(figsize=(15, 9))
    gs = fig.add_gridspec(3, 4, hspace=0.45, wspace=0.35)

    # (1) 总指标卡片（左上 2x1）
    ax1 = fig.add_subplot(gs[0, :2])
    ax1.axis("off")
    summary = json.load(open(os.path.join(ROOT, "outputs", "final_summary.json")))
    junk_summary = json.load(open(os.path.join(ROOT, "outputs", "junk_summary.json")))
    kmeans_summary = json.load(open(os.path.join(ROOT, "outputs", "kmeans_summary.json")))
    text = (
        f"垃圾分类器：{junk_summary['best_classifier']}\n"
        f"  测试集准确率   = {summary['junk_classifier']['test_acc']:.4f}\n"
        f"  F1 (垃圾) = {summary['junk_classifier']['f1_junk']:.4f}\n"
        f"  F1 (技术) = {summary['junk_classifier']['f1_tech']:.4f}\n\n"
        f"K-Means 聚类：K = {summary['clustering']['K']}\n"
        f"  Silhouette = {kmeans_summary['silhouette']:.4f}\n"
        f"  WCSS = {kmeans_summary['wcss']:.2f}\n"
        f"  测试集纯度 = {summary['clustering']['test_purity']:.4f}\n\n"
        f"数据规模：n_train = {kmeans_summary['n_tech_train']}（技术帖）\n"
        f"           TF-IDF dim = {kmeans_summary['tfidf_dim']}, SVD = {kmeans_summary['svd_dim']}\n"
        f"           SVD 解释方差 = {kmeans_summary['svd_explained_var']*100:.1f}%"
    )
    ax1.text(0.02, 0.95, "CodeHub ML 训练摘要", fontsize=15, fontweight="bold",
             va="top", color="#2c3e50")
    ax1.text(0.02, 0.78, text, fontsize=11, va="top",
             color="#34495e", linespacing=1.6)
    ax1.add_patch(plt.Rectangle((0, 0), 1, 1, fill=False, edgecolor="#bdc3c7",
                                 linewidth=1.5, transform=ax1.transAxes))

    # (2) K 扫描曲线（右上 2x1）
    ax2 = fig.add_subplot(gs[0, 2:])
    K = kmeans_summary["k_metrics"]["K"]; sils = kmeans_summary["k_metrics"]["silhouette"]
    ax2.plot(K, sils, "o-", linewidth=2.5, color="#e74c3c", markersize=7)
    best_k = summary["clustering"]["K"]
    ax2.axvline(best_k, color="green", linestyle="--", linewidth=1.5,
                label=f"最优 K = {best_k}")
    ax2.set_xlabel("K"); ax2.set_ylabel("Silhouette")
    ax2.set_title("K-Means K 选择 (Silhouette 越大越好)", fontsize=12, fontweight="bold")
    ax2.grid(alpha=0.3); ax2.legend()

    # (3) 簇大小分布（中行 全宽）
    ax3 = fig.add_subplot(gs[1, :])
    with open(os.path.join(MODELS, "cluster_labels.json")) as f:
        cluster_labels = json.load(f)
    keys = sorted(cluster_labels.keys(), key=int)
    sizes = [cluster_labels[k]["size"] for k in keys]
    names = [cluster_labels[k]["name"] for k in keys]
    bars = ax3.bar(range(len(keys)), sizes,
                   color=plt.cm.tab20(np.linspace(0, 1, len(keys))))
    for b, v in zip(bars, sizes):
        ax3.text(b.get_x() + b.get_width()/2, v + 2, str(v),
                 ha="center", fontsize=9, fontweight="bold")
    labels = [f"{i}\n{n}" for i, n in zip(keys, names)]
    ax3.set_xticks(range(len(keys))); ax3.set_xticklabels(labels, fontsize=9)
    ax3.set_ylabel("样本数"); ax3.set_title(f"各簇规模 (K={len(keys)})",
                                            fontsize=12, fontweight="bold")
    ax3.grid(axis="y", alpha=0.3)

    # (4) Before/After 关键指标对比（底行 全宽 2x2）
    ax4 = fig.add_subplot(gs[2, :2])
    labels_ = ["acc", "F1(垃圾)", "F1(技术)"]
    old = [0.9495, 0.9630, 0.9207]
    new = [summary['junk_classifier']['test_acc'],
           summary['junk_classifier']['f1_junk'],
           summary['junk_classifier']['f1_tech']]
    x = np.arange(len(labels_)); w = 0.36
    ax4.bar(x - w/2, old, w, label="旧 (NB)", color="#c0392b", alpha=0.85)
    ax4.bar(x + w/2, new, w, label="新 (LinearSVC)", color="#27ae60", alpha=0.9)
    for i, (o, n) in enumerate(zip(old, new)):
        ax4.text(i - w/2, o + 0.005, f"{o:.3f}", ha="center", fontsize=8)
        ax4.text(i + w/2, n + 0.005, f"{n:.3f}", ha="center", fontsize=8)
    ax4.set_xticks(x); ax4.set_xticklabels(labels_)
    ax4.set_ylim(0.85, 1.02); ax4.set_title("分类器: 旧 vs 新",
                                             fontsize=12, fontweight="bold")
    ax4.legend(); ax4.grid(axis="y", alpha=0.3)

    ax5 = fig.add_subplot(gs[2, 2:])
    labels_ = ["Silhouette", "1/DB", "CH/100"]
    old = [0.0165, 1/7.99, 16.1/100]
    new = [0.2100, 1/2.47, 101.0/100]
    x = np.arange(len(labels_))
    ax5.bar(x - w/2, old, w, label="旧 (K=10 直接聚)", color="#c0392b", alpha=0.85)
    ax5.bar(x + w/2, new, w, label="新 (SVD+K=18)", color="#27ae60", alpha=0.9)
    for i, (o, n) in enumerate(zip(old, new)):
        ax5.text(i - w/2, o + 0.02, f"{o:.3f}", ha="center", fontsize=8)
        ax5.text(i + w/2, n + 0.02, f"{n:.3f}", ha="center", fontsize=8)
    ax5.set_xticks(x); ax5.set_xticklabels(labels_)
    ax5.set_title("聚类: 旧 vs 新", fontsize=12, fontweight="bold")
    ax5.legend(); ax5.grid(axis="y", alpha=0.3)

    plt.suptitle("CodeHub 智能标签系统 - 训练效果总览",
                 fontsize=16, fontweight="bold", y=1.005)
    plt.savefig(os.path.join(FIG, "fig_summary_dashboard.png"), dpi=180, bbox_inches="tight")
    plt.close()
    print("✓ fig_summary_dashboard.png")


if __name__ == "__main__":
    fig_pipeline()
    fig_before_after()
    fig_dataset()
    fig_threshold()
    fig_learning_curve()
    fig_examples()
    fig_summary_dashboard()
    print(f"\n所有论文图表保存到: {FIG}/")
