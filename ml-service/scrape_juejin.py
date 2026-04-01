"""
掘金文章爬取脚本（大数据量版）
目标：8000+ 条技术帖
"""

import requests
import csv
import time
import os
import re
from collections import Counter

ARTICLE_LIST_URL = "https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed"
SEARCH_URL = "https://api.juejin.cn/search_api/v1/search"

JUEJIN_CATEGORIES = {
    "前端":     "6809637767543259144",
    "后端":     "6809637769959178254",
    "Android":  "6809635626879549454",
    "iOS":      "6809635626661445640",
    "人工智能":  "6809637773935378440",
    "开发工具":  "6809637771511070734",
}

CATEGORY_MAPPING = {
    "前端":    "前端",
    "后端":    "后端",
    "Android": "移动端",
    "iOS":     "移动端",
    "人工智能": "AI/ML",
    "开发工具": "DevOps",
}

PER_CATEGORY = 800  # 6 × 800 = 4800

SEARCH_QUERIES = {
    "React hooks 组件":         "React",
    "React Router 路由":        "React",
    "Next.js SSR":             "React",
    "React 性能优化":            "React",
    "Vue3 组合式API":           "Vue",
    "Vue Pinia Vuex 状态":      "Vue",
    "Vue Router 路由":          "Vue",
    "CSS Flex Grid 布局":       "CSS",
    "Tailwind CSS 样式":        "CSS",
    "CSS 动画 过渡":            "CSS",
    "TypeScript 泛型 类型":      "TypeScript",
    "JavaScript 闭包 异步":      "JavaScript",
    "ES6 Promise async":       "JavaScript",
    "Node.js Express 后端":     "Node.js",
    "Koa NestJS 中间件":        "Node.js",
    "Python Django Flask":     "Python",
    "FastAPI Python 微服务":    "Python",
    "Python 爬虫 数据":         "Python",
    "Spring Boot 配置":        "Java",
    "Java 多线程 JVM":          "Java",
    "Java 设计模式":             "Java",
    "MySQL 索引 SQL优化":       "数据库",
    "Redis 缓存 MongoDB":      "数据库",
    "PostgreSQL 数据库设计":     "数据库",
    "数据库 事务 锁":            "数据库",
    "Docker 容器 部署":         "DevOps",
    "Kubernetes Nginx CI/CD":  "DevOps",
    "Linux 运维 服务器":        "DevOps",
    "GitHub Actions 自动化":    "DevOps",
    "Git 分支 合并 版本控制":     "Git",
    "算法 LeetCode 动态规划":    "算法",
    "数据结构 二叉树 排序":       "算法",
    "算法 面试题 手写":          "算法",
    "Webpack Vite 构建 工程化":  "工程化",
    "ESLint 代码规范 Monorepo":  "工程化",
    "微信小程序 uni-app 跨端":   "移动端",
    "Flutter React Native":    "移动端",
    "XSS CSRF JWT 鉴权":       "安全",
    "OAuth 权限 认证":          "安全",
    "单元测试 Jest Cypress":    "测试",
    "机器学习 PyTorch 神经网络":  "AI/ML",
    "深度学习 Transformer NLP":  "AI/ML",
    "HTTP 跨域 CORS 网络":     "网络",
    "WebSocket 实时通信 接口":   "网络",
    "GraphQL RESTful API设计":  "网络",
}

PER_SEARCH = 100  # 45 × 100 = 4500

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


def clean_text(text: str) -> str:
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def fetch_by_category(cat_name: str, cat_id: str, count: int):
    articles = []
    cursor = "0"
    while len(articles) < count:
        payload = {
            "id_type": 2,
            "sort_type": 200,
            "cate_id": cat_id,
            "cursor": cursor,
            "limit": 20,
        }
        try:
            resp = requests.post(ARTICLE_LIST_URL, json=payload, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"    [错误] {e}")
            break
        items = data.get("data", [])
        if not items:
            break
        for item in items:
            info = item.get("article_info", {})
            title = clean_text(info.get("title", ""))
            brief = clean_text(info.get("brief_content", ""))
            if not title or len(title) < 5:
                continue
            content = f"{title}。{brief}" if brief else title
            articles.append(content)
            if len(articles) >= count:
                break
        cursor = data.get("cursor", "0")
        if not data.get("has_more", False):
            break
        time.sleep(0.5)
    return articles


def fetch_by_search(query: str, count: int):
    articles = []
    cursor = "0"
    while len(articles) < count:
        payload = {
            "key_word": query,
            "id_type": 0,
            "sort_type": 0,
            "search_type": 2,
            "cursor": cursor,
            "limit": 20,
        }
        try:
            resp = requests.post(SEARCH_URL, json=payload, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"    [错误] {e}")
            break
        items = data.get("data", [])
        if not items:
            break
        for item in items:
            result_model = item.get("result_model", {})
            if not result_model:
                continue
            article_info = result_model.get("article_info", {})
            if not article_info:
                continue
            title = clean_text(article_info.get("title", ""))
            brief = clean_text(article_info.get("brief_content", ""))
            if not title or len(title) < 5:
                continue
            if brief and len(brief) > 150:
                brief = brief[:150]
            content = f"{title}。{brief}" if brief else title
            articles.append(content)
            if len(articles) >= count:
                break
        cursor = str(int(cursor) + 20)
        if len(items) < 20:
            break
        time.sleep(0.8)
    return articles


def main():
    all_data = []

    print("=" * 50)
    print("阶段一：按分类抓取")
    print("=" * 50)
    for cat_name, cat_id in JUEJIN_CATEGORIES.items():
        mapped = CATEGORY_MAPPING[cat_name]
        print(f"  [{cat_name}] → {mapped}...")
        arts = fetch_by_category(cat_name, cat_id, PER_CATEGORY)
        for a in arts:
            all_data.append((a, mapped))
        print(f"    → {len(arts)} 篇")
        time.sleep(1)

    print(f"\n阶段一小计: {len(all_data)} 条")

    print("\n" + "=" * 50)
    print("阶段二：按关键词搜索")
    print("=" * 50)
    for i, (query, category) in enumerate(SEARCH_QUERIES.items()):
        print(f"  [{i+1}/{len(SEARCH_QUERIES)}] {query} → {category}...")
        arts = fetch_by_search(query, PER_SEARCH)
        for a in arts:
            all_data.append((a, category))
        print(f"    → {len(arts)} 篇")
        time.sleep(1)

    # 去重
    seen = set()
    unique = []
    for content, category in all_data:
        key = content[:60]
        if key not in seen:
            seen.add(key)
            unique.append((content, category))

    # 写入
    output_path = os.path.join("data", "raw", "juejin_corpus.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "content", "category", "is_junk"])
        for i, (content, category) in enumerate(unique, 1):
            writer.writerow([i, content, category, 0])

    print(f"\n{'=' * 50}")
    print(f"完成！共 {len(unique)} 条（去重后）")
    print(f"保存到 {output_path}")
    print("=" * 50)
    cats = Counter(c for _, c in unique)
    for cat, cnt in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:12s}: {cnt}")


if __name__ == "__main__":
    main()