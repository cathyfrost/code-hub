"""
01_build_corpus.py
==================
构建训练语料：
  - 真实技术帖：从掘金 API 按分类 + 按关键词检索抓取
  - 垃圾/灌水帖：用模板生成器批量造（复用项目里 generate_junk.py 的 TEMPLATES）
  - 合并去重后写入 data/raw/posts_corpus.csv

执行：
  .venv/bin/python training_v2/01_build_corpus.py
"""
import csv
import json
import os
import random
import re
import sys
import time
from collections import Counter

import requests
from tqdm import tqdm

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

RAW_OUT = os.path.join(ROOT, "data", "raw", "posts_corpus.csv")
JUEJIN_OUT = os.path.join(ROOT, "data", "raw", "juejin_corpus.csv")
JUNK_OUT = os.path.join(ROOT, "data", "raw", "junk_corpus.csv")
os.makedirs(os.path.dirname(RAW_OUT), exist_ok=True)

# ──────────────────────────────────────────────────────────────
#  PART A: 掘金抓取
# ──────────────────────────────────────────────────────────────
ARTICLE_LIST_URL = "https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed"
SEARCH_URL = "https://api.juejin.cn/search_api/v1/search"

JUEJIN_CATEGORIES = {
    "前端": "6809637767543259144",
    "后端": "6809637769959178254",
    "Android": "6809635626879549454",
    "iOS": "6809635626661445640",
    "人工智能": "6809637773935378440",
    "开发工具": "6809637771511070734",
}
CATEGORY_MAPPING = {
    "前端": "前端", "后端": "后端", "Android": "移动端",
    "iOS": "移动端", "人工智能": "AI/ML", "开发工具": "DevOps",
}

# 关键词检索覆盖更细粒度技术栈
SEARCH_QUERIES = {
    "React hooks 组件 useState":   "React",
    "React Router 路由 useEffect": "React",
    "Next.js SSR 服务端渲染":      "React",
    "React 性能优化 memo":         "React",
    "Vue3 组合式API ref":          "Vue",
    "Vue Pinia 状态管理":          "Vue",
    "Vue Router 路由守卫":         "Vue",
    "CSS Flex 布局":               "CSS",
    "CSS Grid 网格":               "CSS",
    "Tailwind CSS 原子化":          "CSS",
    "CSS 动画 过渡 keyframes":      "CSS",
    "TypeScript 泛型 类型推导":     "TypeScript",
    "TypeScript 高级类型 类型体操":  "TypeScript",
    "JavaScript 闭包 原型链":       "JavaScript",
    "JavaScript 异步 Promise":     "JavaScript",
    "ES6 解构 箭头函数":            "JavaScript",
    "Node.js Express 中间件":       "Node.js",
    "Node.js Koa 路由":             "Node.js",
    "NestJS 装饰器":                "Node.js",
    "Python Django 视图":           "Python",
    "Python Flask Web开发":         "Python",
    "FastAPI 异步":                 "Python",
    "Python 爬虫 BeautifulSoup":    "Python",
    "Spring Boot 启动 配置":        "Java",
    "Java 多线程 并发":             "Java",
    "Java JVM 调优":                "Java",
    "Java 设计模式 单例":           "Java",
    "MySQL 索引 explain":           "数据库",
    "MySQL 慢查询 优化":            "数据库",
    "Redis 缓存 数据结构":          "数据库",
    "MongoDB 聚合 查询":            "数据库",
    "PostgreSQL 查询":              "数据库",
    "Docker 镜像 容器":             "DevOps",
    "Docker Compose 编排":          "DevOps",
    "Kubernetes Pod Service":      "DevOps",
    "Nginx 配置 反向代理":          "DevOps",
    "Linux 命令 shell 脚本":        "DevOps",
    "GitHub Actions 自动化部署":     "DevOps",
    "Git 分支 merge rebase":        "Git",
    "算法 LeetCode 动态规划":       "算法",
    "算法 二叉树 遍历":             "算法",
    "数据结构 链表 栈":             "算法",
    "Webpack 配置 loader":          "工程化",
    "Vite 构建优化":                "工程化",
    "ESLint Prettier 代码规范":      "工程化",
    "微信小程序 wxml uniapp":        "移动端",
    "Flutter Dart Widget":         "移动端",
    "React Native 跨平台":          "移动端",
    "XSS CSRF 攻击 防御":           "安全",
    "JWT 鉴权 token":               "安全",
    "OAuth2 单点登录":              "安全",
    "Jest 单元测试 mock":           "测试",
    "Cypress E2E 端到端":           "测试",
    "Pytest 测试 fixture":          "测试",
    "PyTorch 神经网络 模型":         "AI/ML",
    "Transformer 注意力机制":        "AI/ML",
    "大模型 LLM RAG":               "AI/ML",
    "深度学习 卷积神经网络":         "AI/ML",
    "HTTP 协议 跨域 CORS":          "网络",
    "WebSocket 实时通信":           "网络",
    "GraphQL Apollo 查询":          "网络",
    "RESTful API 设计":             "网络",
}

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

PER_CATEGORY = 500   # 6 类 × 500 = 3000
PER_SEARCH = 60      # 60 query × 60 = 3600
DEDUP_KEY_LEN = 60


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def safe_post(url, payload, retries=3):
    """带重试的 POST"""
    for i in range(retries):
        try:
            resp = requests.post(url, json=payload, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("err_no", 0) != 0:
                return None
            return data
        except Exception:
            if i < retries - 1:
                time.sleep(1 + i)
            else:
                return None
    return None


def fetch_by_category(cat_id: str, target: int):
    out = []
    cursor = "0"
    for _ in range(target // 20 + 5):
        data = safe_post(ARTICLE_LIST_URL, {
            "id_type": 2, "sort_type": 200, "cate_id": cat_id,
            "cursor": cursor, "limit": 20,
        })
        if not data:
            break
        items = data.get("data") or []
        if not items:
            break
        for it in items:
            info = it.get("article_info", {})
            title = clean_text(info.get("title", ""))
            brief = clean_text(info.get("brief_content", ""))[:200]
            if len(title) < 6:
                continue
            content = f"{title}。{brief}" if brief else title
            out.append(content)
            if len(out) >= target:
                return out
        cursor = data.get("cursor", "0")
        if not data.get("has_more", False):
            break
        time.sleep(0.4)
    return out


def fetch_by_search(query: str, target: int):
    out = []
    cursor = "0"
    for _ in range(target // 20 + 3):
        data = safe_post(SEARCH_URL, {
            "key_word": query, "id_type": 0, "sort_type": 0,
            "search_type": 2, "cursor": cursor, "limit": 20,
        })
        if not data:
            break
        items = data.get("data") or []
        if not items:
            break
        for it in items:
            rm = it.get("result_model", {}) or {}
            info = rm.get("article_info", {}) or {}
            title = clean_text(info.get("title", ""))
            brief = clean_text(info.get("brief_content", ""))[:200]
            if len(title) < 6:
                continue
            content = f"{title}。{brief}" if brief else title
            out.append(content)
            if len(out) >= target:
                return out
        cursor = str(int(cursor) + 20)
        if len(items) < 20:
            break
        time.sleep(0.4)
    return out


def scrape_juejin():
    all_data = []
    print("\n[A1] 按分类抓取掘金")
    for cat_name, cat_id in JUEJIN_CATEGORIES.items():
        mapped = CATEGORY_MAPPING[cat_name]
        arts = fetch_by_category(cat_id, PER_CATEGORY)
        print(f"  {cat_name:8s} → {mapped:8s}  {len(arts)} 条")
        for a in arts:
            all_data.append((a, mapped))
        time.sleep(0.5)

    print("\n[A2] 按关键词检索掘金")
    for q, cat in tqdm(SEARCH_QUERIES.items(), ncols=80):
        arts = fetch_by_search(q, PER_SEARCH)
        for a in arts:
            all_data.append((a, cat))
        time.sleep(0.5)

    # 去重
    seen = set()
    unique = []
    for c, cat in all_data:
        k = c[:DEDUP_KEY_LEN]
        if k in seen:
            continue
        seen.add(k)
        unique.append((c, cat))

    # 写中间产物
    with open(JUEJIN_OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "content", "category", "is_junk"])
        for i, (c, cat) in enumerate(unique, 1):
            w.writerow([i, c, cat, 0])

    cats = Counter(c for _, c in unique)
    print(f"\n掘金抓取去重后: {len(unique)} 条")
    for cat, cnt in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:10s}: {cnt}")
    return unique


# ──────────────────────────────────────────────────────────────
#  PART B: 垃圾帖生成（模板）
# ──────────────────────────────────────────────────────────────
import importlib.util

def load_junk_module():
    spec = importlib.util.spec_from_file_location("generate_junk",
                                                  os.path.join(ROOT, "generate_junk.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def generate_junk(target: int = 3000):
    print("\n[B] 生成垃圾/灌水帖")
    gj = load_junk_module()
    templates = gj.TEMPLATES
    slots = gj.SLOTS

    # 短回复（如"哈哈"，"+1"）做点缀
    SHORT_NOISE = [
        "哈哈哈", "+1", "顶", "支持", "学习了", "mark", "收藏了", "感谢分享",
        "前排", "沙发", "板凳", "围观", "厉害", "牛逼", "学到了",
        "请教一下", "在吗", "怎么没人回", "已转发", "已点赞", "已收藏",
    ]

    def fill(tpl: str) -> str:
        out = tpl
        for slot in re.findall(r"\{(\w+)\}", tpl):
            if slot in slots:
                out = out.replace(f"{{{slot}}}", random.choice(slots[slot]), 1)
        return out

    out = []
    per_cat = max(target // len(templates), 30)
    for cat, tpls in templates.items():
        for _ in range(per_cat):
            content = fill(random.choice(tpls))
            # 随机加噪：拼接短词、加表情符号
            if random.random() < 0.3:
                content = content + " " + random.choice(SHORT_NOISE)
            if random.random() < 0.15:
                content = content + " " + random.choice(["[流泪]", "[捂脸]", "[赞]", "[doge]", "QAQ", "TT", "QwQ"])
            out.append(content)

    # 补 100 条纯噪声短回复
    for _ in range(100):
        out.append(random.choice(SHORT_NOISE))

    # 去重
    seen = set()
    unique = []
    for c in out:
        k = c[:DEDUP_KEY_LEN]
        if k in seen:
            continue
        seen.add(k)
        unique.append(c)

    with open(JUNK_OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "content", "category", "is_junk"])
        for i, c in enumerate(unique, 1):
            w.writerow([i, c, "", 1])

    print(f"垃圾帖去重后: {len(unique)} 条")
    return [(c, "") for c in unique]


# ──────────────────────────────────────────────────────────────
#  PART C: 合并写最终语料
# ──────────────────────────────────────────────────────────────
def write_combined(tech, junk):
    print("\n[C] 合并写入 posts_corpus.csv")
    random.seed(42)
    rows = []
    for c, cat in tech:
        rows.append((c, cat, 0))
    for c, _ in junk:
        rows.append((c, "", 1))
    random.shuffle(rows)

    with open(RAW_OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "content", "category", "is_junk"])
        for i, (c, cat, j) in enumerate(rows, 1):
            w.writerow([i, c, cat, j])

    n_tech = sum(1 for r in rows if r[2] == 0)
    n_junk = sum(1 for r in rows if r[2] == 1)
    print(f"  最终: {len(rows)} 条 (技术 {n_tech} / 垃圾 {n_junk})")
    print(f"  保存到: {RAW_OUT}")


if __name__ == "__main__":
    random.seed(42)
    t0 = time.time()
    tech = scrape_juejin()
    junk = generate_junk(target=3000)
    write_combined(tech, junk)
    print(f"\n总耗时: {time.time() - t0:.1f}s")
