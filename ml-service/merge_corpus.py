"""
语料合并脚本
合并：种子数据 + 掘金 + MNBVC技术帖 + 微博垃圾帖 → posts_corpus.csv
"""

import pandas as pd
import os

RAW_DIR = os.path.join("data", "raw")

SOURCES = [
    ("posts_corpus_seed.csv", "种子数据"),
    ("juejin_corpus.csv",     "掘金"),
    ("mnbvc_tech.csv",        "MNBVC技术帖"),
    ("weibo_junk.csv",        "微博垃圾帖"),
]


def main():
    frames = []

    for filename, label in SOURCES:
        path = os.path.join(RAW_DIR, filename)
        if os.path.exists(path):
            df = pd.read_csv(path, encoding="utf-8-sig")
            tech = (df["is_junk"] == 0).sum()
            junk = (df["is_junk"] == 1).sum()
            print(f"{label}: {len(df)} 条 (技术:{tech}, 垃圾:{junk})")
            frames.append(df)
        else:
            print(f"{label}: 跳过 ({path})")

    if not frames:
        print("没有数据！")
        return

    merged = pd.concat(frames, ignore_index=True)
    merged["_dedup"] = merged["content"].astype(str).str[:80]
    merged = merged.drop_duplicates(subset="_dedup").drop(columns="_dedup")
    merged = merged[merged["content"].astype(str).str.len() >= 5]
    merged = merged.reset_index(drop=True)
    merged["id"] = range(1, len(merged) + 1)

    output_path = os.path.join(RAW_DIR, "posts_corpus.csv")
    merged.to_csv(output_path, index=False, encoding="utf-8-sig")

    tech = (merged["is_junk"] == 0).sum()
    junk = (merged["is_junk"] == 1).sum()
    total = len(merged)

    print(f"\n{'=' * 50}")
    print(f"合并完成: {total} 条")
    print(f"  技术帖: {tech} ({tech/total*100:.1f}%)")
    print(f"  垃圾帖: {junk} ({junk/total*100:.1f}%)")
    print(f"{'=' * 50}")

    if tech > 0:
        print(f"\n技术帖分类分布:")
        tech_df = merged[merged["is_junk"] == 0]
        print(tech_df["category"].value_counts().head(20).to_string())


if __name__ == "__main__":
    main()