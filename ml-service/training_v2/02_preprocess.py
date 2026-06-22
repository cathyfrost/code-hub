"""
02_preprocess.py
================
读取 data/raw/posts_corpus.csv → 跑预处理流水线 → 分层切分 train/test
"""
import os
import sys
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from utils.preprocessor import preprocess_to_string  # noqa
from sklearn.model_selection import train_test_split

RAW = os.path.join(ROOT, "data", "raw", "posts_corpus.csv")
TRAIN = os.path.join(ROOT, "data", "processed", "train.csv")
TEST = os.path.join(ROOT, "data", "processed", "test.csv")
os.makedirs(os.path.dirname(TRAIN), exist_ok=True)


def main():
    df = pd.read_csv(RAW, encoding="utf-8-sig")
    print(f"原始: {len(df)} 条")
    df["category"] = df["category"].fillna("").astype(str)
    df["content"] = df["content"].fillna("").astype(str)

    print("跑预处理流水线（清洗 → jieba → 去停用词 → 同义词归一）...")
    df["processed_text"] = df["content"].apply(preprocess_to_string)

    empty = df["processed_text"].str.strip() == ""
    print(f"  预处理后为空: {int(empty.sum())} 条，已剔除")
    df = df[~empty].reset_index(drop=True)

    # 分层切分：技术帖按 category 分层，垃圾帖单独一层
    df["strata"] = df.apply(lambda r: r["category"] if r["is_junk"] == 0 else "__junk__", axis=1)

    # category 内样本数 < 2 的合到一个 "__rare__" 层避免分层报错
    counts = df["strata"].value_counts()
    rare = set(counts[counts < 2].index)
    if rare:
        df.loc[df["strata"].isin(rare), "strata"] = "__rare__"
        print(f"  样本数<2的稀有类合并: {sorted(rare)}")

    train_df, test_df = train_test_split(
        df, test_size=0.2, random_state=42, stratify=df["strata"],
    )
    train_df = train_df.drop(columns=["strata"]).reset_index(drop=True)
    test_df = test_df.drop(columns=["strata"]).reset_index(drop=True)

    train_df.to_csv(TRAIN, index=False, encoding="utf-8-sig")
    test_df.to_csv(TEST, index=False, encoding="utf-8-sig")

    print(f"\n训练集: {len(train_df)} 条")
    print(f"测试集: {len(test_df)} 条")
    print(f"\n训练集 is_junk 分布:")
    print(train_df["is_junk"].value_counts())
    print(f"\n训练集 category 分布 (前 15):")
    print(train_df[train_df["is_junk"] == 0]["category"].value_counts().head(15))


if __name__ == "__main__":
    main()
