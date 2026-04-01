"""
MNBVC 技术内容提取脚本（针对百度知道问答数据）
主要从 "1.问答" 文件夹的 JSONL 中提取技术相关问答

数据结构：
  {"qid": "...", "category": "教育/科学-理工学科", "title": "问题标题", "desc": "描述", "answer": "回答"}
"""

import os
import csv
import json
import re
import random

# ★★★ 修改为你的实际路径 ★★★
MNBVC_ROOT = r"D:\code-hub\ml-service\mnbvc数据集"

OUTPUT_PATH = os.path.join("data", "raw", "mnbvc_tech.csv")
MAX_TOTAL = 5000

# ── 百度知道 category 中的技术相关分类关键词 ──
TECH_CATEGORIES = [
    "电脑", "计算机", "互联网", "网络", "软件", "编程", "程序",
    "手机", "电子", "通信", "数码", "硬件",
    "科技", "工程",
]

# ── 内容级技术关键词（标题/描述/回答包含即命中）──
TECH_KEYWORDS = [
    # 编程语言
    "python", "java", "javascript", "c++", "c#", "php", "golang", "rust",
    "typescript", "swift", "kotlin", "ruby", "scala", "lua", "perl",
    # 前端
    "html", "css", "react", "vue", "angular", "前端", "网页", "浏览器",
    "dom", "webpack", "node.js", "jquery",
    # 后端
    "后端", "服务器", "spring", "django", "flask", "tomcat", "servlet",
    "mybatis", "接口", "api",
    # 数据库
    "数据库", "mysql", "sql", "oracle", "mongodb", "redis", "索引",
    "查询", "表结构",
    # 系统/运维
    "linux", "windows", "mac", "操作系统", "命令行", "终端",
    "docker", "虚拟机", "服务器",
    # 网络
    "ip地址", "dns", "http", "tcp", "网络", "路由", "防火墙",
    "端口", "协议", "代理", "vpn",
    # 算法
    "算法", "数据结构", "排序", "二叉树", "递归", "动态规划",
    # AI
    "人工智能", "机器学习", "深度学习", "神经网络", "自然语言",
    # 编程通用
    "编程", "代码", "程序", "软件开发", "编译", "调试", "debug",
    "函数", "变量", "数组", "循环", "条件", "类", "对象",
    "继承", "封装", "多态", "线程", "进程", "内存",
    "框架", "开发环境", "IDE", "编辑器",
    # 具体技术问题
    "报错", "异常", "bug", "闪退", "蓝屏", "安装失败",
    "无法运行", "配置", "环境变量", "依赖",
]

TECH_KEYWORD_PATTERN = re.compile(
    "|".join(re.escape(kw) for kw in TECH_KEYWORDS),
    re.IGNORECASE
)


def is_tech_by_category(category: str) -> bool:
    """通过百度知道的分类判断是否技术相关"""
    if not category:
        return False
    cat_lower = category.lower()
    return any(kw in cat_lower for kw in TECH_CATEGORIES)


def is_tech_by_content(text: str) -> bool:
    """通过内容关键词判断是否技术相关"""
    if not text or len(text) < 10:
        return False
    return bool(TECH_KEYWORD_PATTERN.search(text))


def clean_text(text: str) -> str:
    """清理文本"""
    text = re.sub(r'<[^>]+>', '', text)  # HTML标签
    text = re.sub(r'https?://\S+', '', text)  # URL
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_from_qa_jsonl(filepath: str) -> list[tuple[str, str]]:
    """
    从百度知道问答 JSONL 文件提取技术内容
    返回 [(content, category), ...]
    """
    results = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                category = data.get("category", "")
                title = data.get("title", "")
                desc = data.get("desc", "")
                answer = data.get("answer", "")

                # 两层过滤：分类匹配 OR 内容关键词匹配
                full_text = f"{title} {desc} {answer}"
                if is_tech_by_category(category) or is_tech_by_content(title):
                    title_clean = clean_text(title)
                    # 取标题 + 描述前100字（或回答前100字）
                    detail = clean_text(desc) if desc else clean_text(answer)
                    if detail and len(detail) > 100:
                        detail = detail[:100]

                    content = title_clean
                    if detail and len(detail) > 5:
                        content = f"{title_clean}。{detail}"

                    if content and 15 <= len(content) <= 250:
                        # 简单分类映射
                        tag = guess_tech_tag(title_clean, category)
                        results.append((content, tag))

    except Exception as e:
        print(f"    [错误] {e}")

    return results


def guess_tech_tag(title: str, category: str) -> str:
    """根据标题和分类猜测技术标签"""
    text = f"{title} {category}".lower()

    tag_rules = [
        (["python", "django", "flask"], "Python"),
        (["java", "spring", "mybatis", "tomcat"], "Java"),
        (["javascript", "js", "jquery", "node"], "JavaScript"),
        (["html", "css", "前端", "网页", "浏览器"], "前端"),
        (["react", "vue", "angular"], "前端"),
        (["数据库", "mysql", "sql", "oracle", "mongodb"], "数据库"),
        (["linux", "命令", "终端", "shell"], "Linux"),
        (["网络", "ip", "dns", "tcp", "http", "路由"], "网络"),
        (["手机", "android", "ios", "app"], "移动端"),
        (["人工智能", "机器学习", "深度学习"], "AI/ML"),
        (["算法", "数据结构", "排序"], "算法"),
        (["c++", "c语言", "指针", "内存"], "C/C++"),
        (["php", "wordpress"], "PHP"),
        (["电脑", "系统", "windows", "蓝屏", "驱动"], "操作系统"),
        (["软件", "安装", "下载"], "软件工具"),
    ]

    for keywords, tag in tag_rules:
        if any(kw in text for kw in keywords):
            return tag

    return "编程技术"  # 默认标签


def main():
    all_tech = []

    print(f"从 MNBVC 数据集提取技术内容...")
    print(f"根目录: {MNBVC_ROOT}")
    print("=" * 60)

    # 遍历所有子文件夹
    for dirname in sorted(os.listdir(MNBVC_ROOT)):
        dirpath = os.path.join(MNBVC_ROOT, dirname)
        if not os.path.isdir(dirpath):
            continue

        # 问答类文件夹最有价值
        is_qa = "问答" in dirname

        for filename in os.listdir(dirpath):
            filepath = os.path.join(dirpath, filename)

            if filename.endswith(".json") or filename.endswith(".jsonl"):
                if is_qa:
                    results = extract_from_qa_jsonl(filepath)
                else:
                    # 非问答类也尝试提取，但用更严格的关键词过滤
                    results = extract_from_other_json(filepath)

                if results:
                    all_tech.extend(results)
                    print(f"  {dirname}/{filename}: {len(results)} 条")

            elif filename.endswith(".csv"):
                results = extract_from_csv(filepath)
                if results:
                    all_tech.extend(results)
                    print(f"  {dirname}/{filename}: {len(results)} 条")

        if len(all_tech) >= MAX_TOTAL * 2:
            print(f"\n已收集 {len(all_tech)} 条，停止扫描")
            break

    # 去重
    seen = set()
    unique = []
    for content, tag in all_tech:
        key = content[:60]
        if key not in seen:
            seen.add(key)
            unique.append((content, tag))

    # 抽样
    if len(unique) > MAX_TOTAL:
        random.seed(42)
        unique = random.sample(unique, MAX_TOTAL)

    # 写入
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "content", "category", "is_junk"])
        for i, (content, tag) in enumerate(unique, 1):
            writer.writerow([i, content, tag, 0])

    print(f"\n{'=' * 60}")
    print(f"提取完成: {len(unique)} 条技术帖")
    print(f"保存到: {OUTPUT_PATH}")

    # 统计标签分布
    from collections import Counter
    tags = Counter(t for _, t in unique)
    print(f"\n标签分布:")
    for tag, cnt in sorted(tags.items(), key=lambda x: -x[1]):
        print(f"  {tag:<12s}: {cnt}")

    # 示例
    print(f"\n示例:")
    for content, tag in random.sample(unique, min(10, len(unique))):
        print(f"  [{tag}] {content[:70]}...")


def extract_from_other_json(filepath: str) -> list[tuple[str, str]]:
    """从非问答类 JSON 文件提取技术内容"""
    results = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # 尝试多种字段
                text_parts = []
                for key in ["title", "headline", "标题", "question"]:
                    if key in data and data[key]:
                        text_parts.append(str(data[key]))
                for key in ["content", "text", "body", "short_description"]:
                    if key in data and data[key]:
                        text_parts.append(str(data[key])[:150])

                text = " ".join(text_parts).strip()
                if is_tech_by_content(text) and len(text) >= 15:
                    text_clean = clean_text(text)
                    if len(text_clean) > 200:
                        text_clean = text_clean[:200]
                    tag = guess_tech_tag(text_clean, "")
                    results.append((text_clean, tag))

    except Exception:
        pass
    return results


def extract_from_csv(filepath: str) -> list[tuple[str, str]]:
    """从 CSV 文件提取技术内容"""
    results = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            fields = reader.fieldnames or []

            # 找内容字段
            content_field = None
            for c in ["content", "text", "review", "body", "title", "headline", "Comment"]:
                if c in fields:
                    content_field = c
                    break
            if not content_field and len(fields) >= 2:
                content_field = fields[1]

            if not content_field:
                return results

            for row in reader:
                text = row.get(content_field, "")
                if is_tech_by_content(text) and len(text) >= 15:
                    text_clean = clean_text(text)
                    if len(text_clean) > 200:
                        text_clean = text_clean[:200]
                    if len(text_clean) >= 15:
                        tag = guess_tech_tag(text_clean, "")
                        results.append((text_clean, tag))

    except Exception:
        pass
    return results


if __name__ == "__main__":
    main()