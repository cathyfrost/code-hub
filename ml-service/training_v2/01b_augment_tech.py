"""
01b_augment_tech.py
===================
模板化技术帖生成器 —— 给每个目标类别造 ~200 条真实风格的技术问答/分享

合并策略：
  最终 posts_corpus.csv = 掘金真实抓取(323条) + 模板技术帖(~3000条) + 垃圾帖(~2500条)
"""
import csv
import os
import random
import sys

random.seed(42)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW_DIR = os.path.join(ROOT, "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)


# 每个类别有：术语 / 动词 / 问题模板 / 分享模板
CATEGORIES = {
    "React": {
        "topics": ["useState", "useEffect", "useMemo", "useCallback", "useReducer",
                   "useRef", "useContext", "Custom Hook", "Context API",
                   "组件通信", "Props 传递", "状态提升", "受控组件", "非受控组件",
                   "React Router", "React Query", "Redux Toolkit", "Zustand",
                   "Suspense", "React.memo", "懒加载", "代码分割",
                   "React 18 并发模式", "Server Components", "Next.js App Router",
                   "Next.js SSR", "Next.js ISR", "ErrorBoundary", "Portal", "Fragment"],
        "verbs": ["怎么用", "如何实现", "什么时候用", "性能优化", "踩坑笔记",
                 "源码解析", "面试题", "原理分析", "最佳实践"],
        "frames": [
            "React 中 {t} 怎么用？{t2} 和 {t} 有什么区别？",
            "用 {t} 实现 {t2} 总是触发多次渲染怎么办",
            "{t} 闭包陷阱，依赖数组应该怎么写",
            "{t} 性能优化实战，避免不必要的重渲染",
            "Next.js App Router 下 {t} 报错 hydration mismatch",
            "React {t} 源码原理深度剖析",
            "封装一个通用 {t} 自定义 Hook",
            "{t} 和 {t2} 的最佳实践对比",
            "React 18 中 {t} 的新特性总结",
        ],
    },
    "Vue": {
        "topics": ["ref", "reactive", "computed", "watch", "watchEffect",
                   "组合式API", "setup", "defineProps", "defineEmits",
                   "v-model", "插槽 slot", "provide/inject", "Teleport",
                   "Vue Router", "Pinia", "Vuex", "动态组件", "异步组件",
                   "Element Plus", "Naive UI", "Vue 3.5", "响应式原理",
                   "Proxy 响应式", "diff 算法", "Composition API"],
        "verbs": ["怎么用", "原理", "踩坑", "最佳实践", "性能优化", "源码"],
        "frames": [
            "Vue3 {t} 怎么用？和 Vue2 的 {t2} 有什么区别",
            "{t} 失去响应式怎么办？解构 ref 的正确姿势",
            "Pinia 替代 Vuex 的实战迁移笔记",
            "Vue {t} 源码原理：从 Proxy 到依赖收集",
            "Element Plus + Vue3 {t} 二次封装",
            "{t} 与 {t2} 配合使用避免性能问题",
            "Vue3 组合式 API 中 {t} 的最佳实践",
        ],
    },
    "JavaScript": {
        "topics": ["闭包", "原型链", "this 指向", "事件循环", "宏任务微任务",
                   "Promise", "async/await", "Generator", "Symbol", "Proxy",
                   "Reflect", "WeakMap", "Set Map", "防抖节流", "深拷贝",
                   "事件委托", "原型继承", "ES6 解构", "可选链", "空值合并",
                   "Iterator 迭代器", "模块化 ESM"],
        "verbs": ["原理", "面试题", "易错点", "进阶用法", "源码实现"],
        "frames": [
            "JavaScript {t} 面试题：手写实现一个 {t2}",
            "{t} 和 {t2} 你真的搞清楚了吗",
            "彻底理解 JavaScript 中的 {t}",
            "{t} 的 5 个常见易错点",
            "手写 Promise A+ 实现 {t}",
            "面试官问 {t}，我从这几个层面回答的",
        ],
    },
    "TypeScript": {
        "topics": ["泛型", "条件类型", "映射类型", "类型推导", "类型守卫",
                   "infer", "keyof", "typeof", "in", "Partial", "Pick", "Omit",
                   "Record", "Required", "Readonly", "Exclude", "Extract",
                   "tsconfig 配置", "声明文件", "模块解析", "类型体操"],
        "verbs": ["进阶", "实战", "类型体操", "原理", "源码"],
        "frames": [
            "TypeScript {t} 进阶：从入门到类型体操",
            "用 {t} 实现一个高级类型工具：{t2}",
            "TypeScript {t} 在大型项目中的实战",
            "类型体操之手写 {t}",
            "{t} 和 {t2} 的常见用法对比",
        ],
    },
    "CSS": {
        "topics": ["Flexbox", "Grid 布局", "BFC", "层叠上下文", "盒模型",
                   "选择器优先级", "伪元素", "媒体查询", "响应式", "动画 keyframes",
                   "transform", "transition", "CSS 变量", "Sass 嵌套",
                   "Tailwind 原子化", "CSS Module", "样式隔离", "毛玻璃效果",
                   "渐变背景", "阴影效果", "Grid 模板区域"],
        "verbs": ["实现", "技巧", "进阶", "踩坑", "原理"],
        "frames": [
            "CSS {t} 实战：实现一个 {t2} 效果",
            "{t} 和 {t2} 的区别，什么时候用哪个",
            "Tailwind CSS {t} 工具类详解",
            "用 CSS {t} 实现优雅的 {t2}",
            "{t} 进阶用法：突破常规布局思维",
            "CSS {t} 兼容性踩坑记录",
        ],
    },
    "Node.js": {
        "topics": ["Express 中间件", "Koa 洋葱模型", "NestJS 装饰器",
                   "事件循环", "Stream 流", "Buffer", "fs 模块",
                   "http 模块", "Worker Threads", "进程通信", "PM2 部署",
                   "Cluster 模式", "npm 包管理", "pnpm workspace",
                   "异步控制流", "性能调优"],
        "verbs": ["实战", "原理", "部署", "性能"],
        "frames": [
            "Node.js {t} 原理深入：从源码看 {t2}",
            "用 Express 实现 {t}，处理 {t2}",
            "NestJS {t} 模式实战",
            "Node.js {t} 性能优化技巧",
            "{t} 和 {t2} 在生产环境的最佳实践",
        ],
    },
    "Python": {
        "topics": ["装饰器", "生成器", "迭代器", "GIL", "多线程", "多进程",
                   "asyncio 异步", "Django ORM", "Flask 蓝图", "FastAPI 依赖注入",
                   "Pydantic 数据校验", "SQLAlchemy", "Celery 任务队列",
                   "Pandas DataFrame", "NumPy 向量化", "类型注解", "魔术方法",
                   "上下文管理器", "元类"],
        "verbs": ["实战", "原理", "性能", "进阶"],
        "frames": [
            "Python {t} 深度解析与实战",
            "用 FastAPI 实现 {t}，集成 {t2}",
            "Python {t} 性能优化：从慢到快",
            "{t} 和 {t2} 在数据处理中的对比",
            "Django {t} 进阶实战",
        ],
    },
    "Java": {
        "topics": ["JVM 内存模型", "GC 垃圾回收", "类加载机制", "反射",
                   "代理 Proxy", "Spring IOC", "Spring AOP", "Spring Boot 自动装配",
                   "MyBatis 缓存", "Mybatis Plus", "SpringCloud Eureka",
                   "Nacos 注册中心", "线程池", "ConcurrentHashMap",
                   "ReentrantLock", "AQS", "ThreadLocal", "JUC 并发",
                   "synchronized 原理", "volatile 语义"],
        "verbs": ["原理", "面试", "源码", "调优"],
        "frames": [
            "Java {t} 源码深度解读",
            "{t} 面试高频题：从基础到原理",
            "JVM {t} 调优实战，OOM 排查",
            "Spring Boot {t} 自动装配原理",
            "Java 并发系列：{t} 与 {t2}",
            "{t} 在高并发场景下的实战",
        ],
    },
    "Go": {
        "topics": ["goroutine", "channel", "select 多路复用", "sync.Mutex",
                   "sync.WaitGroup", "context 取消", "GMP 调度模型",
                   "defer 原理", "interface 接口", "反射 reflect",
                   "Gin 路由", "GORM ORM", "Go Module", "切片底层",
                   "map 实现", "GC 三色标记", "逃逸分析"],
        "verbs": ["原理", "实战", "调优", "面试"],
        "frames": [
            "Go {t} 源码剖析",
            "Go {t} 实战，避免 {t2} 陷阱",
            "深入理解 Go 的 {t} 调度",
            "用 Gin 实现 {t}，性能压测",
            "{t} vs {t2}：Go 并发的两种方案",
        ],
    },
    "数据库": {
        "topics": ["MySQL 索引", "B+ 树原理", "执行计划 explain",
                   "慢查询优化", "联合索引", "覆盖索引", "事务隔离级别",
                   "MVCC 多版本并发", "Undo Log", "Redo Log",
                   "Redis 数据结构", "Redis 持久化 AOF RDB",
                   "Redis 集群", "MongoDB 聚合管道", "PostgreSQL 视图",
                   "分库分表", "读写分离", "ShardingSphere",
                   "ClickHouse 列存", "ElasticSearch 倒排索引"],
        "verbs": ["优化", "原理", "实战", "踩坑"],
        "frames": [
            "MySQL {t} 优化：慢查询从 5s 到 50ms",
            "Redis {t} 原理：源码级解读",
            "{t} 和 {t2} 你选哪个？场景对比",
            "深度理解 MySQL 的 {t}",
            "数据库 {t} 实战调优记录",
            "MongoDB {t} 实战：聚合查询性能优化",
        ],
    },
    "DevOps": {
        "topics": ["Docker 镜像构建", "Dockerfile 优化", "多阶段构建",
                   "Docker Compose 编排", "Kubernetes Pod",
                   "K8s Deployment", "K8s Service", "Ingress 网关",
                   "Helm Chart", "Istio Service Mesh",
                   "Nginx 反向代理", "Nginx 负载均衡",
                   "Jenkins 流水线", "GitHub Actions",
                   "Prometheus 监控", "Grafana 可视化",
                   "Linux 性能调优", "shell 脚本", "Ansible 自动化"],
        "verbs": ["实战", "原理", "部署", "运维"],
        "frames": [
            "Docker {t} 实战：镜像大小从 1GB 到 100MB",
            "Kubernetes {t} 实战部署",
            "用 GitHub Actions 实现 {t} 自动化",
            "Nginx {t} 配置详解",
            "K8s {t} 与 {t2} 的最佳实践",
            "Linux {t} 排查线上问题的全过程",
        ],
    },
    "移动端": {
        "topics": ["React Native 桥接", "Flutter Widget", "Flutter 状态管理",
                   "Dart 异步", "小程序双线程模型", "uni-app 跨端",
                   "Taro 跨端", "iOS Swift UI", "Android Jetpack Compose",
                   "原生与 Webview 通信", "性能监控", "包体积优化",
                   "推送通知", "App 打包发布", "热更新"],
        "verbs": ["实战", "原理", "性能优化"],
        "frames": [
            "React Native {t} 实战：原生模块开发",
            "Flutter {t} 状态管理实战",
            "微信小程序 {t} 性能优化",
            "uni-app 实现 {t} 跨端方案",
            "iOS {t} 与 Android {t2} 的对比",
            "App 包体积从 80M 减到 30M 的 {t} 优化",
        ],
    },
    "AI/ML": {
        "topics": ["Transformer 注意力", "BERT 预训练", "GPT 解码",
                   "RAG 检索增强", "向量数据库", "Embedding 嵌入",
                   "LLM 微调", "LoRA", "PEFT 参数高效",
                   "PyTorch 训练", "TensorFlow 部署", "ONNX 推理",
                   "CNN 卷积网络", "RNN 循环网络", "LSTM",
                   "图神经网络 GNN", "强化学习 PPO",
                   "LangChain 工具调用", "Agent 智能体",
                   "Stable Diffusion", "Llama 部署", "vLLM 推理加速"],
        "verbs": ["原理", "实战", "微调", "部署"],
        "frames": [
            "大模型 {t} 原理：从 0 到 1 理解",
            "用 LangChain 实现 {t} Agent",
            "Llama-3 {t} 微调实战",
            "PyTorch {t} 训练全流程",
            "向量数据库 {t} 与 {t2} 选型对比",
            "Stable Diffusion {t} 工作流",
            "{t} 在 RAG 系统中的应用",
        ],
    },
    "算法": {
        "topics": ["动态规划", "回溯算法", "贪心算法", "分治", "二分查找",
                   "DFS 深度优先", "BFS 广度优先", "并查集", "Trie 前缀树",
                   "红黑树", "AVL 树", "B+ 树", "二叉搜索树", "跳表",
                   "堆排序", "快速排序", "归并排序", "拓扑排序",
                   "最短路径 Dijkstra", "最小生成树", "KMP 字符串匹配",
                   "滑动窗口", "双指针", "前缀和", "差分数组"],
        "verbs": ["LeetCode", "原理", "解题思路", "面试"],
        "frames": [
            "LeetCode {t} 题目精讲：从暴力到最优",
            "{t} 经典题 5 题汇总",
            "面试常考 {t}：原理 + 模板 + 实战",
            "{t} 和 {t2} 哪个更优？复杂度对比",
            "手写 {t} 算法实现",
        ],
    },
    "安全": {
        "topics": ["XSS 攻击", "CSRF 防御", "SQL 注入", "XSS 过滤",
                   "JWT 鉴权", "OAuth2.0 授权码模式", "OAuth2 PKCE",
                   "RSA 加密", "AES 加密", "HTTPS TLS 握手",
                   "SSO 单点登录", "RBAC 权限模型", "API 签名",
                   "防重放攻击", "DDoS 防护", "WAF 防火墙"],
        "verbs": ["防御", "实战", "原理"],
        "frames": [
            "Web 安全 {t} 实战防御",
            "{t} 攻击与防御代码示例",
            "OAuth2.0 {t} 模式深入解析",
            "JWT {t} 实战，签发与校验",
            "{t} 和 {t2} 的安全对比",
        ],
    },
    "测试": {
        "topics": ["Jest mock 函数", "Vitest 单测", "测试覆盖率",
                   "Cypress E2E", "Playwright 自动化", "Pytest fixture",
                   "TDD 测试驱动", "BDD 行为驱动",
                   "Mocha 异步", "JUnit Spring Boot 测试",
                   "性能测试 JMeter", "接口测试 Postman"],
        "verbs": ["实战", "原理", "覆盖率"],
        "frames": [
            "Jest {t} 实战：mock 第三方依赖",
            "Cypress {t} 自动化测试搭建",
            "{t} 测试金字塔实践",
            "Pytest {t} 用法详解",
            "提高 {t} 测试覆盖率的 5 个技巧",
        ],
    },
    "网络": {
        "topics": ["HTTP/2", "HTTP/3 QUIC", "TCP 三次握手",
                   "TCP 四次挥手", "WebSocket 协议", "gRPC 流式调用",
                   "GraphQL 查询", "RESTful 设计", "CORS 跨域",
                   "JSONP", "Service Worker", "PWA 离线",
                   "DNS 解析", "CDN 加速", "反向代理"],
        "verbs": ["原理", "实战"],
        "frames": [
            "HTTP {t} 协议深入解读",
            "WebSocket {t} 实战：实时聊天系统",
            "gRPC {t} 与 RESTful 的对比",
            "GraphQL {t} 实战：Apollo Client",
            "TCP {t} 与 {t2} 的关系",
        ],
    },
    "工程化": {
        "topics": ["Webpack Loader 原理", "Webpack Plugin 开发",
                   "Vite 启动原理", "Rollup tree shaking",
                   "esbuild 构建", "ESLint 自定义规则",
                   "Prettier 代码格式化", "Monorepo Lerna",
                   "Turborepo", "pnpm workspace",
                   "CI/CD 流水线", "脚手架开发", "代码提交规范",
                   "commitlint", "husky 钩子"],
        "verbs": ["原理", "实战"],
        "frames": [
            "Webpack {t} 源码剖析",
            "Vite vs Webpack：{t} 的对比",
            "Monorepo {t} 实战：从 0 到 1",
            "用 {t} 搭建企业级脚手架",
            "前端工程化 {t} 最佳实践",
        ],
    },
}


SUFFIXES = [
    "", "", "", "",  # 增加无后缀概率
    "求大佬指教",
    "有踩过这个坑的吗",
    "分享一下我的方案",
    "贴一段核心代码",
    "完整代码已开源在 GitHub",
    "希望对大家有帮助",
    "欢迎讨论",
    "做了详细笔记",
    "用了一周才搞明白",
    "看了很多文章终于理解了",
]


def gen_post(category: str, info: dict) -> str:
    topics = info["topics"]
    t = random.choice(topics)
    t2 = random.choice([x for x in topics if x != t])
    frame = random.choice(info["frames"])
    text = frame.format(t=t, t2=t2)
    suf = random.choice(SUFFIXES)
    if suf:
        text = f"{text}。{suf}"
    return text


def main(per_category: int = 200):
    OUT = os.path.join(RAW_DIR, "tech_synth_corpus.csv")
    rows = []
    for cat, info in CATEGORIES.items():
        seen = set()
        attempts = 0
        while len(seen) < per_category and attempts < per_category * 5:
            attempts += 1
            text = gen_post(cat, info)
            if text in seen:
                continue
            seen.add(text)
        for t in seen:
            rows.append((t, cat, 0))
    random.shuffle(rows)
    with open(OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "content", "category", "is_junk"])
        for i, (c, cat, j) in enumerate(rows, 1):
            w.writerow([i, c, cat, j])
    print(f"模板技术帖: {len(rows)} 条")
    cats = {}
    for c, cat, _ in rows:
        cats[cat] = cats.get(cat, 0) + 1
    for cat, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:10s}: {n}")

    # 合并 juejin + synth + junk 写最终 posts_corpus.csv
    JUEJIN = os.path.join(RAW_DIR, "juejin_corpus.csv")
    JUNK = os.path.join(RAW_DIR, "junk_corpus.csv")
    FINAL = os.path.join(RAW_DIR, "posts_corpus.csv")

    import pandas as pd
    tech_juejin = pd.read_csv(JUEJIN, encoding="utf-8-sig")
    tech_synth = pd.read_csv(OUT, encoding="utf-8-sig")
    junk = pd.read_csv(JUNK, encoding="utf-8-sig")

    combined = pd.concat([tech_juejin, tech_synth, junk], ignore_index=True)
    combined["id"] = range(1, len(combined) + 1)
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)
    combined.to_csv(FINAL, index=False, encoding="utf-8-sig")
    print(f"\n合并完成: {FINAL}")
    print(f"  总计: {len(combined)} 条")
    print(f"  技术帖: {(combined['is_junk']==0).sum()}")
    print(f"  垃圾帖: {(combined['is_junk']==1).sum()}")


if __name__ == "__main__":
    main(per_category=200)
