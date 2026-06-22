"""
03_train_junk_classifier.py
===========================
垃圾/技术二分类，对比 3 个模型：MultinomialNB / LogReg / LinearSVC(校准)
按 F1 选最优，保存 TF-IDF + 最优分类器。

产出：
  models/tfidf_vectorizer.pkl
  models/junk_classifier.pkl
  outputs/figures/junk_confusion_matrix.png
  outputs/figures/junk_roc_pr.png
  outputs/figures/junk_classifier_comparison.png
"""
import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    classification_report, confusion_matrix, f1_score,
    roc_curve, precision_recall_curve, auc, average_precision_score,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

# 中文字体（macOS 兜底）
import matplotlib.font_manager as fm
for cand in ["PingFang SC", "Hiragino Sans GB", "STHeiti",
             "Heiti SC", "Arial Unicode MS", "Songti SC"]:
    if any(cand in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [cand]
        break
plt.rcParams["axes.unicode_minus"] = False

TRAIN = os.path.join(ROOT, "data", "processed", "train.csv")
TEST = os.path.join(ROOT, "data", "processed", "test.csv")
MODELS_DIR = os.path.join(ROOT, "models")
FIG_DIR = os.path.join(ROOT, "outputs", "figures")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FIG_DIR, exist_ok=True)

TFIDF_PATH = os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl")
CLF_PATH = os.path.join(MODELS_DIR, "junk_classifier.pkl")


def main():
    train_df = pd.read_csv(TRAIN, encoding="utf-8-sig")
    test_df = pd.read_csv(TEST, encoding="utf-8-sig")
    train_df["processed_text"] = train_df["processed_text"].fillna("").astype(str)
    test_df["processed_text"] = test_df["processed_text"].fillna("").astype(str)

    y_train = train_df["is_junk"].astype(int).values
    y_test = test_df["is_junk"].astype(int).values
    print(f"训练集: {len(train_df)} ({(y_train==1).sum()} 垃圾 / {(y_train==0).sum()} 技术)")
    print(f"测试集: {len(test_df)} ({(y_test==1).sum()} 垃圾 / {(y_test==0).sum()} 技术)")

    # ── TF-IDF 训练 ──
    vec = TfidfVectorizer(
        max_features=8000,        # 提到 8000，词表更丰富
        max_df=0.9,
        min_df=2,
        ngram_range=(1, 2),
        sublinear_tf=True,
    )
    X_train = vec.fit_transform(train_df["processed_text"])
    X_test = vec.transform(test_df["processed_text"])
    print(f"TF-IDF shape: {X_train.shape}, nnz={X_train.nnz}")

    # ── 三个分类器 ──
    models = {
        "MultinomialNB": MultinomialNB(alpha=0.5),
        "LogisticRegression": LogisticRegression(
            C=4.0, max_iter=2000, class_weight="balanced",
            solver="liblinear", random_state=42,
        ),
        "LinearSVC": CalibratedClassifierCV(
            LinearSVC(C=1.0, max_iter=5000, class_weight="balanced", random_state=42),
            cv=3,
        ),
    }

    results = {}
    for name, m in models.items():
        m.fit(X_train, y_train)
        pred = m.predict(X_test)
        proba = m.predict_proba(X_test)[:, 1] if hasattr(m, "predict_proba") else None
        f1_junk = f1_score(y_test, pred, pos_label=1)
        f1_tech = f1_score(y_test, pred, pos_label=0)
        acc = (pred == y_test).mean()
        results[name] = dict(model=m, pred=pred, proba=proba,
                             acc=acc, f1_junk=f1_junk, f1_tech=f1_tech)
        print(f"\n{name}")
        print(f"  acc={acc:.4f}  F1(垃圾)={f1_junk:.4f}  F1(技术)={f1_tech:.4f}")
        print(classification_report(y_test, pred,
                                    target_names=["技术帖", "垃圾帖"]))

    # 选 macro F1 最高的（兼顾两类）
    def macro_f1(r):
        return (r["f1_junk"] + r["f1_tech"]) / 2
    best_name = max(results, key=lambda k: macro_f1(results[k]))
    best = results[best_name]
    print(f"\n★ 选定: {best_name} (macro_F1={macro_f1(best):.4f})")

    # ── 图 1：三个模型混淆矩阵并排 ──
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    for ax, (name, r) in zip(axes, results.items()):
        cm = confusion_matrix(y_test, r["pred"])
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                    xticklabels=["技术", "垃圾"], yticklabels=["技术", "垃圾"],
                    annot_kws={"size": 14})
        ax.set_title(f"{name}\nacc={r['acc']:.3f}  macroF1={macro_f1(r):.3f}",
                     fontsize=11)
        ax.set_xlabel("预测"); ax.set_ylabel("真实")
    plt.suptitle("垃圾分类器对比 - 混淆矩阵", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "junk_classifier_comparison.png"),
                dpi=180, bbox_inches="tight")
    plt.close()

    # ── 图 2：ROC + PR 曲线 ──
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    for name, r in results.items():
        if r["proba"] is None:
            continue
        fpr, tpr, _ = roc_curve(y_test, r["proba"])
        auc_v = auc(fpr, tpr)
        axes[0].plot(fpr, tpr, label=f"{name} (AUC={auc_v:.3f})", linewidth=2)

        prec, rec, _ = precision_recall_curve(y_test, r["proba"])
        ap = average_precision_score(y_test, r["proba"])
        axes[1].plot(rec, prec, label=f"{name} (AP={ap:.3f})", linewidth=2)

    axes[0].plot([0, 1], [0, 1], "k--", alpha=0.5)
    axes[0].set_xlabel("假阳性率 FPR"); axes[0].set_ylabel("真阳性率 TPR")
    axes[0].set_title("ROC 曲线（垃圾类）"); axes[0].legend(loc="lower right"); axes[0].grid(alpha=0.3)
    axes[1].set_xlabel("Recall"); axes[1].set_ylabel("Precision")
    axes[1].set_title("PR 曲线（垃圾类）"); axes[1].legend(loc="lower left"); axes[1].grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "junk_roc_pr.png"), dpi=180, bbox_inches="tight")
    plt.close()

    # ── 图 3：选定模型的单图混淆矩阵 ──
    fig, ax = plt.subplots(figsize=(6, 5))
    cm = confusion_matrix(y_test, best["pred"])
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                xticklabels=["技术帖", "垃圾帖"], yticklabels=["技术帖", "垃圾帖"],
                annot_kws={"size": 18})
    ax.set_title(f"垃圾分类器混淆矩阵 - {best_name}\n"
                 f"acc={best['acc']:.4f}  F1(垃圾)={best['f1_junk']:.4f}  F1(技术)={best['f1_tech']:.4f}",
                 fontsize=12)
    ax.set_xlabel("预测", fontsize=12); ax.set_ylabel("真实", fontsize=12)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "junk_confusion_matrix.png"),
                dpi=180, bbox_inches="tight")
    plt.close()

    # ── 持久化 ──
    joblib.dump(vec, TFIDF_PATH)
    joblib.dump(best["model"], CLF_PATH)
    print(f"\n保存: {TFIDF_PATH}")
    print(f"保存: {CLF_PATH}")
    print(f"图保存到 {FIG_DIR}")

    # ── 摘要 ──
    summary = {
        "vocab_size": X_train.shape[1],
        "best_classifier": best_name,
        "test_acc": float(best["acc"]),
        "f1_junk": float(best["f1_junk"]),
        "f1_tech": float(best["f1_tech"]),
        "macro_f1": float(macro_f1(best)),
    }
    import json
    with open(os.path.join(ROOT, "outputs", "junk_summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"摘要: {summary}")


if __name__ == "__main__":
    main()
