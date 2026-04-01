"""
微博情感数据集清洗脚本
输入：weibo_senti_100k.csv（label, review）
输出：data/raw/weibo_junk.csv（id, content, category, is_junk）

清洗规则：
1. 去除 @用户名
2. 去除 [表情] 标记
3. 去除 #话题# 标签
4. 去除 URL 链接
5. 去除 //转发内容
6. 过滤过短（<8字）和过长（>200字）的内容
7. 过滤清洗后为空或纯标点的内容
"""

import csv
import re
import os


def clean_weibo(text: str) -> str:
    """清洗单条微博文本"""
    # 去除 @用户名（中英文用户名）
    text = re.sub(r'@[\w\u4e00-\u9fff-]+[：:]?', '', text)
    # 去除 [表情] 标记
    text = re.sub(r'\[[^\]]{1,8}\]', '', text)
    # 去除 #话题#
    text = re.sub(r'#[^#]+#', '', text)
    # 去除 URL
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'http?://\S+', '', text)
    # 去除转发内容（// 后面的部分）
    text = re.sub(r'//.*$', '', text)
    # 去除特殊 unicode 符号（◆ 等）
    text = re.sub(r'[◆◇●○■□▲△▼▽★☆♦♠♣♥❤️✨🔥💕]', '', text)
    # 去除连续重复标点（～～～、。。。等）
    text = re.sub(r'[～~]{2,}', '', text)
    text = re.sub(r'[。]{2,}', '。', text)
    text = re.sub(r'[！]{2,}', '！', text)
    text = re.sub(r'[？]{2,}', '？', text)
    text = re.sub(r'[\.]{3,}', '...', text)
    # 合并空白
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def is_valid(text: str) -> bool:
    """检查清洗后的文本是否有效"""
    if not text:
        return False
    # 过滤过短或过长
    if len(text) < 8 or len(text) > 200:
        return False
    # 过滤纯标点/纯数字
    content_chars = re.sub(r'[\s\W]', '', text)
    if len(content_chars) < 4:
        return False
    # 过滤纯英文（可能是spam或广告）
    if re.match(r'^[a-zA-Z\s\d\W]+$', text) and len(text) < 20:
        return False
    # 过滤转发微博空内容
    if text in ['转发微博', 'Repost', '转发', '转']:
        return False
    return True


def main():
    input_path = os.path.join("data", "raw", "weibo_senti_100k.csv")
    output_path = os.path.join("data", "raw", "weibo_junk.csv")

    if not os.path.exists(input_path):
        # 也检查 algorithm-service 目录下
        alt_path = os.path.join("..", "algorithm-service", "data", "weibo_senti_100k.csv")
        if os.path.exists(alt_path):
            input_path = alt_path
        else:
            print(f"找不到文件: {input_path}")
            print("请将 weibo_senti_100k.csv 放到 data/raw/ 目录下")
            return

    # 读取原始数据
    total = 0
    cleaned = []

    # 尝试不同编码
    for encoding in ["utf-8", "utf-8-sig", "gbk", "gb18030"]:
        try:
            with open(input_path, "r", encoding=encoding, errors="replace") as f:
                reader = csv.reader(f)
                header = next(reader)  # 跳过表头 label,review
                print(f"表头: {header}")
                print(f"使用编码: {encoding}")

                for row in reader:
                    total += 1
                    if len(row) < 2:
                        continue
                    review = row[1].strip()
                    text = clean_weibo(review)

                    if is_valid(text):
                        cleaned.append(text)
            break
        except Exception as e:
            print(f"编码 {encoding} 失败: {e}")
            continue

    print(f"\n原始数据: {total} 条")
    print(f"清洗后有效: {len(cleaned)} 条")
    print(f"过滤掉: {total - len(cleaned)} 条 ({(total - len(cleaned))/total*100:.1f}%)")

    # 去重
    seen = set()
    unique = []
    for text in cleaned:
        key = text[:40]
        if key not in seen:
            seen.add(key)
            unique.append(text)

    print(f"去重后: {len(unique)} 条")

    # 如果数据太多，随机抽样 5000 条（避免垃圾样本占比过大）
    import random
    random.seed(42)
    if len(unique) > 5000:
        unique = random.sample(unique, 5000)
        print(f"抽样 5000 条（控制数据集平衡）")

    # 写入
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "content", "category", "is_junk"])
        for i, text in enumerate(unique, 1):
            writer.writerow([i, text, "", 1])

    print(f"\n保存到: {output_path}")

    # 示例
    print(f"\n清洗后示例:")
    for text in random.sample(unique, min(10, len(unique))):
        print(f"  {text[:80]}")


if __name__ == "__main__":
    main()