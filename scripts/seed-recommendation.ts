// ============================================
// CodeHub 种子数据生成脚本（丰富版）
// prisma/seed-recommendation.ts
//
// 用法：npx tsx prisma/seed-recommendation.ts
// 功能：清空所有帖子相关数据，重新生成帖子、点赞、收藏、评论
//       用户和关注关系保留不动
// ============================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== 配置 ====================
const CONFIG = {
  postCount: 400,
  likesPerUser: { min: 8, max: 35 },
  bookmarksPerUser: { min: 2, max: 12 },
  commentsCount: 800,
  lurkerLikes: { min: 3, max: 15 },
  lurkerComments: { min: 2, max: 8 },
};

// ==================== 工具函数 ====================
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}
function randomDate(daysBack: number = 90): Date {
  const now = new Date();
  const past = new Date(now.getTime() - randomInt(0, daysBack) * 24 * 60 * 60 * 1000);
  past.setHours(randomInt(8, 23), randomInt(0, 59), randomInt(0, 59));
  return past;
}
function generateId(): string {
  return "c" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

// ==================== 帖子内容模板池 ====================
// 分为：技术教程、日常分享、提问求助、项目展示、学习感悟、非技术闲聊

interface PostTemplate {
  content: string;
  codeBlocks: number;
  tags: string[];
  difficulty: number;
}

const POST_TEMPLATES: PostTemplate[] = [
  // ===== 技术教程（有代码）=====
  {
    tags: ["JavaScript"], difficulty: 1, codeBlocks: 1,
    content: `JavaScript 变量声明方式总结

今天来总结一下 JS 中三种变量声明的区别，希望对初学者有帮助！

\`\`\`javascript
// var - 函数作用域，存在变量提升
var name = "CodeHub";

// let - 块级作用域，不会提升
let age = 20;
if (true) {
  let age = 30; // 不影响外层
}

// const - 块级作用域，不可重新赋值
const PI = 3.14159;
\`\`\`

总结：优先使用 const，需要重新赋值时用 let，尽量不用 var。`
  },
  {
    tags: ["JavaScript"], difficulty: 2, codeBlocks: 1,
    content: `箭头函数 vs 普通函数的核心区别

\`\`\`javascript
const obj = {
  name: "CodeHub",
  // 普通函数：this 指向 obj
  sayHi() { console.log(this.name); },
  // 箭头函数：this 继承外层，这里是 undefined
  sayHi2: () => { console.log(this.name); }
};

obj.sayHi();  // "CodeHub"
obj.sayHi2(); // undefined
\`\`\`

一句话记住：箭头函数没有自己的 this。写 React 组件的时候特别要注意这个。`
  },
  {
    tags: ["JavaScript"], difficulty: 3, codeBlocks: 1,
    content: `Promise 和 async/await 到底怎么选？

工作中遇到的真实场景：

\`\`\`javascript
// 串行请求用 async/await 更清晰
async function getProfile(userId) {
  const user = await fetchUser(userId);
  const posts = await fetchPosts(user.id);
  return { user, posts };
}

// 并发请求用 Promise.all
async function getDashboard() {
  const [users, posts, stats] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchStats()
  ]);
  return { users, posts, stats };
}
\`\`\`

别无脑 await 每一个请求，能并发就并发，性能差距很大。`
  },
  {
    tags: ["TypeScript"], difficulty: 3, codeBlocks: 1,
    content: `TypeScript 泛型不难，看完这个例子就懂了

\`\`\`typescript
// 不用泛型：每种类型写一个函数
function getFirstString(arr: string[]): string { return arr[0]; }
function getFirstNumber(arr: number[]): number { return arr[0]; }

// 用泛型：一个函数搞定所有类型
function getFirst<T>(arr: T[]): T { return arr[0]; }

getFirst<string>(["hello", "world"]); // "hello"
getFirst<number>([1, 2, 3]);          // 1
getFirst([true, false]);               // 自动推断为 boolean
\`\`\`

泛型就是"类型的参数"，跟函数参数一样，只不过传的是类型。`
  },
  {
    tags: ["React"], difficulty: 2, codeBlocks: 1,
    content: `useState 的一个常见坑，很多人踩过

\`\`\`javascript
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    // 错误：连续调用3次，结果只加1
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);

    // 正确：用函数式更新
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
  }

  return <button onClick={handleClick}>{count}</button>;
}
\`\`\`

因为 setState 是异步的，直接用 count 拿到的都是旧值。用回调函数就能拿到最新值。`
  },
  {
    tags: ["React", "Next.js"], difficulty: 4, codeBlocks: 1,
    content: `Next.js Server Actions 真的太爽了

以前写一个表单提交要写 API route + fetch + loading 状态管理，现在一个 "use server" 搞定：

\`\`\`typescript
"use server";

export async function createPost(formData: FormData) {
  const content = formData.get("content") as string;
  await prisma.post.create({ data: { content, userId: user.id } });
  revalidatePath("/");
}
\`\`\`

前端直接用 form action 调用，不需要 API route，不需要手动 fetch。代码量直接砍半。

你们在用 Server Actions 了吗？体验如何？`
  },
  {
    tags: ["Next.js"], difficulty: 3, codeBlocks: 1,
    content: `分享一个 Next.js 图片优化踩坑记录

在国内服务器部署 Next.js，图片优化超时的问题折腾了我两天：

\`\`\`javascript
// next.config.js
const nextConfig = {
  images: {
    // 国内部署加这个，跳过图片优化
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "https", hostname: "你的图片域名" }
    ]
  }
};
\`\`\`

如果是部署在 Vercel 上就不需要，它自带 CDN 图片优化。国内阿里云服务器才需要这个配置。`
  },
  {
    tags: ["Java"], difficulty: 2, codeBlocks: 1,
    content: `Java Stream API 让集合操作优雅了 100 倍

以前写循环过滤、转换，代码又长又丑。用 Stream 之后：

\`\`\`java
List<String> names = users.stream()
    .filter(u -> u.getAge() > 18)          // 过滤
    .sorted(Comparator.comparing(User::getAge)) // 排序
    .map(User::getName)                     // 取名字
    .collect(Collectors.toList());          // 收集结果

// 统计平均年龄
double avgAge = users.stream()
    .mapToInt(User::getAge)
    .average()
    .orElse(0);
\`\`\`

Java 8 之后写 Java 终于不那么痛苦了。`
  },
  {
    tags: ["Java", "Spring Boot"], difficulty: 4, codeBlocks: 1,
    content: `Spring Boot 全局异常处理最佳实践

每个 Controller 都写 try-catch 太傻了，用全局异常处理：

\`\`\`java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404)
            .body(new ErrorResponse(404, e.getMessage()));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException e) {
        return ResponseEntity.status(400)
            .body(new ErrorResponse(400, e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        log.error("未知错误", e);
        return ResponseEntity.status(500)
            .body(new ErrorResponse(500, "服务器内部错误"));
    }
}
\`\`\`

配合自定义异常类，Controller 里直接 throw 就行，干净利落。`
  },
  {
    tags: ["Python"], difficulty: 2, codeBlocks: 1,
    content: `Python 列表推导式太优雅了

\`\`\`python
# 传统写法
squares = []
for x in range(10):
    if x % 2 == 0:
        squares.append(x ** 2)

# 列表推导式，一行搞定
squares = [x**2 for x in range(10) if x % 2 == 0]

# 字典推导式
word_len = {w: len(w) for w in ["hello", "world", "python"]}

# 生成器（大数据量时节省内存）
total = sum(x**2 for x in range(1000000))
\`\`\`

刚从 Java 转 Python 的时候被这个语法惊艳到了。`
  },
  {
    tags: ["Python"], difficulty: 3, codeBlocks: 1,
    content: `用 Python 装饰器实现函数计时和重试

\`\`\`python
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} 耗时: {time.time()-start:.2f}秒")
        return result
    return wrapper

def retry(max_attempts=3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for i in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if i == max_attempts - 1: raise
                    print(f"第{i+1}次失败，重试中...")
        return wrapper
    return decorator

@timer
@retry(max_attempts=3)
def fetch_data(url):
    pass
\`\`\`

装饰器是 Python 最 elegant 的特性之一。`
  },
  {
    tags: ["Docker"], difficulty: 3, codeBlocks: 2,
    content: `Docker 多阶段构建让镜像从 1.2G 缩到 200M

\`\`\`dockerfile
# 第一阶段：构建
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 第二阶段：运行（只要构建产物）
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
\`\`\`

前后端 + 数据库一键部署，爽。`
  },
  {
    tags: ["Git"], difficulty: 2, codeBlocks: 1,
    content: `Git 撤销操作速查表，总有你需要的

\`\`\`bash
# 还没 add：丢弃工作区修改
git checkout -- file.txt

# 已经 add 但没 commit：撤回暂存区
git reset HEAD file.txt

# 已经 commit：撤销提交但保留修改
git reset --soft HEAD~1

# 已经 push：生成一个反向提交
git revert HEAD

# 找回误删的分支
git reflog
git checkout -b 恢复的分支 <commit-hash>
\`\`\`

建议收藏，每次忘了都来查。`
  },
  {
    tags: ["CSS", "Tailwind"], difficulty: 1, codeBlocks: 1,
    content: `5 个 Tailwind 小技巧，让你写样式飞快

\`\`\`html
<!-- 1. 居中万能方案 -->
<div class="flex items-center justify-center h-screen">居中</div>

<!-- 2. 文字截断 -->
<p class="truncate w-48">很长很长的文字会被截断...</p>

<!-- 3. 悬停动画 -->
<button class="transition-all hover:scale-105 hover:shadow-lg">点我</button>

<!-- 4. 响应式网格 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">...</div>

<!-- 5. 暗色模式 -->
<div class="bg-white dark:bg-gray-900">自动适配</div>
\`\`\`

Tailwind 用熟了效率真的高，回不去手写 CSS 了。`
  },
  {
    tags: ["Prisma", "PostgreSQL"], difficulty: 3, codeBlocks: 1,
    content: `Prisma 查询优化：一个 include 让 N+1 问题消失

\`\`\`typescript
// 坏：N+1 查询，100个帖子就是101次查库
const posts = await prisma.post.findMany();
for (const post of posts) {
  const user = await prisma.user.findUnique({ where: { id: post.userId } });
}

// 好：一次查询搞定
const posts = await prisma.post.findMany({
  include: {
    user: { select: { displayName: true, avatarUrl: true } },
    _count: { select: { likes: true, comments: true } }
  },
  orderBy: { createAt: "desc" },
  take: 20
});
\`\`\`

Prisma 的 include 和 select 用好了，性能不会比手写 SQL 差多少。`
  },
  {
    tags: ["算法", "数据结构"], difficulty: 3, codeBlocks: 1,
    content: `二分查找写了 100 遍还是写不对？看这个模板

\`\`\`javascript
function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1; // 没找到
}

// 变种：找第一个 >= target 的位置
function lowerBound(nums, target) {
  let left = 0, right = nums.length;
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}
\`\`\`

核心就三点：循环条件、mid 计算、边界更新。背住模板比理解原理更实用。`
  },
  {
    tags: ["算法"], difficulty: 4, codeBlocks: 1,
    content: `动态规划的本质就是"记住算过的结果"

以爬楼梯为例，一步可以走1阶或2阶，到第n阶有多少种走法？

\`\`\`javascript
// 暴力递归（超时）
function climbStairs(n) {
  if (n <= 2) return n;
  return climbStairs(n-1) + climbStairs(n-2);
}

// 加缓存（记忆化）
function climbStairs(n, memo = {}) {
  if (n <= 2) return n;
  if (memo[n]) return memo[n];
  memo[n] = climbStairs(n-1, memo) + climbStairs(n-2, memo);
  return memo[n];
}

// 最优：迭代DP
function climbStairs(n) {
  if (n <= 2) return n;
  let prev = 1, curr = 2;
  for (let i = 3; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}
\`\`\`

三种写法从 O(2^n) 优化到 O(n)，核心思想一样：别重复计算。`
  },
  {
    tags: ["Linux"], difficulty: 2, codeBlocks: 1,
    content: `Linux 必背命令，开发中天天用

\`\`\`bash
# 查找文件
find . -name "*.ts" -type f

# 搜索内容
grep -r "TODO" ./src --include="*.ts"

# 查看端口占用
lsof -i :3000
netstat -tlnp | grep 3000

# 实时看日志
tail -f app.log | grep ERROR

# 磁盘空间
df -h
du -sh node_modules  # 看看 node_modules 有多大（慎看）

# 进程管理
ps aux | grep node
kill -9 <PID>
\`\`\`

Mac 用户把 netstat 换成 lsof 就行。`
  },

  // ===== 日常分享（无代码）=====
  {
    tags: ["JavaScript", "React"], difficulty: 1, codeBlocks: 0,
    content: `今天面试被问到 React 和 Vue 的区别，我巴拉巴拉说了一堆，面试官最后说"其实我只是想听你说说用过哪个"。

面试经验：别过度解读问题，简洁回答，等面试官追问再展开。

另外分享一个发现：面试官问"你有什么问题想问我"的时候，问团队技术栈和项目方向比问薪资更加分。`
  },
  {
    tags: ["JavaScript"], difficulty: 1, codeBlocks: 0,
    content: `学编程一年了，从零基础到能独立做项目。分享一下我的学习路线：

1. 先学 HTML/CSS，做几个静态页面找感觉
2. JavaScript 基础，重点理解变量、函数、数组、对象
3. 跟着做一个 TodoList 项目
4. 学 React 或 Vue（我选了 React）
5. 做一个完整项目练手

最重要的经验：不要一直看视频，动手写代码才是王道。看100小时视频不如自己写10个小时代码。`
  },
  {
    tags: ["React", "Next.js"], difficulty: 2, codeBlocks: 0,
    content: `分享一下我的毕业设计——一个编程学习社区

技术栈：Next.js 15 + React 19 + Tailwind + Prisma + PostgreSQL

功能包括：
- 帖子发布（支持代码高亮、图片、视频）
- 点赞、收藏、评论系统
- 关注系统 + 智能推荐
- AI 帖子分析
- 在线代码编辑器
- 用户等级体系

从零开始做到现在花了大概3个月，踩了无数坑，但学到的东西比上一年课都多。

有兴趣的同学欢迎交流！`
  },
  {
    tags: ["Python", "机器学习"], difficulty: 2, codeBlocks: 0,
    content: `刚入门机器学习，说一下我的感受：

数学真的很重要。线性代数、概率论、微积分，这三门课上学的时候觉得没用，现在全用上了。

推荐学习路线：
1. 吴恩达的 ML 课程（免费，讲得超好）
2. 用 scikit-learn 跑几个经典数据集
3. 入门深度学习，用 PyTorch
4. 做一个自己感兴趣的项目

千万别一上来就看 Transformer 论文，会劝退的。`
  },
  {
    tags: ["系统设计"], difficulty: 3, codeBlocks: 0,
    content: `被问到"如何设计一个短链接系统"，我的回答思路：

1. 核心需求：长URL → 短URL，短URL → 重定向到长URL
2. 短码生成：Base62 编码（a-z, A-Z, 0-9），6位可表示 568 亿个链接
3. 存储：Redis 做缓存 + MySQL 做持久化
4. 读写比：读远大于写，重点优化读性能
5. 高可用：多机房部署、主从复制
6. 防滥用：限流、黑名单

面试系统设计题的关键：先问清需求和规模，再画架构，最后讨论取舍。千万别上来就写代码。`
  },
  {
    tags: ["设计模式"], difficulty: 3, codeBlocks: 0,
    content: `工作中最常用的三个设计模式：

1. 单例模式 - 数据库连接池、配置管理器，全局只要一个实例
2. 观察者模式 - 事件系统、消息订阅，一个变化通知所有关注者
3. 策略模式 - 不同的支付方式、不同的排序算法，运行时切换

说实话，工作中用到的设计模式不超过 10 个。不需要把 23 个全背下来，理解这几个核心的，遇到具体问题再查就行。

过度设计比没有设计更可怕。`
  },

  // ===== 提问求助 =====
  {
    tags: ["React"], difficulty: 2, codeBlocks: 0,
    content: `救命！React 水合错误怎么解决？

页面上显示：Hydration failed because the initial UI does not match what was rendered on the server.

我检查了半天代码，发现是因为用了 Date.now() 导致服务端和客户端时间不一致。

但是我还遇到另一个情况，用了一个浏览器扩展插件它会往 DOM 里注入元素，也会导致这个错误。

有没有大佬遇到过其他触发水合错误的情况？求分享！`
  },
  {
    tags: ["Docker", "Nginx"], difficulty: 3, codeBlocks: 0,
    content: `Docker 部署 Next.js 后图片加载超时，求助

环境：阿里云 ECS + Docker + Nginx 反向代理

现象：本地开发一切正常，部署到服务器后图片加载要 10 秒以上，经常超时。

已经试过的方案：
- 设置了 next.config.js 的 images.unoptimized
- Nginx 配置了缓存
- 增大了 Docker 内存限制

还是很慢，有没有大佬遇到过类似问题？`
  },
  {
    tags: ["JavaScript"], difficulty: 1, codeBlocks: 0,
    content: `请问大家学前端一般多久能找到实习？

我的情况：大三，自学了3个月 JS + React，做了两个项目（TodoList 和一个天气APP）。

投了十几份简历，只有两个面试机会，都没过。

是我准备不够还是现在市场太卷了？求过来人指点一下方向。`
  },

  // ===== 项目展示 =====
  {
    tags: ["Vue", "Node.js"], difficulty: 3, codeBlocks: 0,
    content: `历时两个月，我的全栈博客系统终于上线了！

前端：Vue 3 + Vite + Element Plus
后端：Node.js + Express + MongoDB
部署：阿里云 + Nginx + PM2

实现了：Markdown 编辑器、评论系统、标签分类、全文搜索、暗色模式

最大的收获：独立完成一个完整项目后，对"全栈"的理解完全不一样了。以前觉得全栈就是前后端都会写，现在发现部署、运维、安全、性能优化这些才是真正的挑战。

项目已开源，欢迎 star 和提 issue！`
  },
  {
    tags: ["Flutter", "Kotlin"], difficulty: 3, codeBlocks: 0,
    content: `用 Flutter 做了一个背单词 APP，分享一下心得

主要功能：
- 艾宾浩斯遗忘曲线复习提醒
- 自定义词库导入
- 打卡日历
- 统计分析（折线图、饼图）

感受：Flutter 开发效率是真的高，一套代码 iOS 和 Android 都能跑。热重载太爽了，改完代码秒刷新。

坑也不少：状态管理选型纠结了很久（最后用了 Riverpod），还有打包发布到应用商店的流程比开发还折腾。`
  },

  // ===== 学习感悟 =====
  {
    tags: ["JavaScript", "TypeScript"], difficulty: 2, codeBlocks: 0,
    content: `从 JavaScript 转到 TypeScript 一个月的感受

优点：
- 类型提示太爽了，再也不用猜一个变量是什么类型
- 重构有信心了，改完类型报错就知道哪里要改
- 团队协作代码质量明显提升

缺点：
- 学习曲线确实存在，泛型那部分看了好几遍才懂
- 类型体操太恐怖了，不过日常开发用不到那些花活
- 配置 tsconfig 第一次会很懵

总结：值得学，但不要追求"完美"类型，够用就行。any 偶尔用一下不丢人。`
  },
  {
    tags: ["Go", "Rust"], difficulty: 4, codeBlocks: 0,
    content: `Go 和 Rust 选哪个？两个都写过的来说说

Go 适合的场景：
- Web 后端、微服务
- 学习曲线平缓，一周上手
- 并发模型（goroutine）简单好用
- 编译快，部署方便

Rust 适合的场景：
- 系统编程、高性能需求
- 学习曲线陡峭，所有权系统需要时间消化
- 内存安全，没有 GC 停顿
- 生态在快速成长

我的建议：如果做 Web 后端，直接 Go。如果对系统底层感兴趣或追求极致性能，学 Rust。不要两个同时学，会精神分裂。`
  },
  {
    tags: ["机器学习", "深度学习"], difficulty: 3, codeBlocks: 0,
    content: `读研一个学期了，说说科研和想象中的差距

以为读研是：每天看论文 → 灵光一闪 → 提出新方法 → 发顶会

实际读研是：导师说去看这个方向 → 看了50篇论文还是懵 → 复现别人的代码跑不通 → debug 一周 → 终于跑通了结果不对 → 再 debug → 结果差一点点 → 调参调到怀疑人生

不过说实话，虽然过程痛苦，但每次搞懂一个东西的成就感是工作中很难体会到的。

准备读研的同学，做好心理准备，同时也别太焦虑，大家都是这么过来的。`
  },

  // ===== 非技术闲聊 =====
  {
    tags: ["JavaScript"], difficulty: 1, codeBlocks: 0,
    content: `程序员的一天：

9:00 到公司，打开电脑，泡杯咖啡
9:30 打开 VS Code，准备开始写代码
9:31 先看看微信消息
9:45 回了几条消息，打开 B 站"学习"
10:30 啊不对我要工作了
10:31 开始写代码
10:35 遇到 bug，打开 Google
11:30 bug 修好了，原来是少了个分号
12:00 午饭
13:00 午休
14:00 开会
15:00 继续写代码
16:00 又遇到 bug
17:30 还在 debug
18:00 bug 修好了，提交代码，下班！

你们的一天是什么样的？`
  },
  {
    tags: ["React"], difficulty: 1, codeBlocks: 0,
    content: `你们觉得程序员最重要的能力是什么？

我觉得排名是：

1. 解决问题的能力（搜索 + 理解 + 应用）
2. 学习新技术的能力（框架更新太快了）
3. 沟通能力（和产品经理battle的能力）
4. 代码能力（这个反而没那么重要）

技术好但不会沟通的人，不如技术一般但能把事情推动起来的人。

不接受反驳（x`
  },
  {
    tags: ["Python"], difficulty: 1, codeBlocks: 0,
    content: `分享一些我觉得很有价值的学习资源

前端：MDN 文档（最权威）、JavaScript.info（最详细）
React：官方新文档 react.dev（重新写过，质量很高）
算法：力扣（LeetCode），但建议按标签刷而不是按编号
系统设计：System Design Primer（GitHub 开源）
英语：看 YouTube 技术视频是最好的学英语方式

还有一个建议：少看付费课程，多看官方文档。很多付费课只是把官方文档翻译了一遍然后收你钱。`
  },
  {
    tags: ["CSS"], difficulty: 1, codeBlocks: 0,
    content: `设计师给了一个按钮悬停效果，我对着 CSS 调了两个小时...

最后发现设计稿用的是 Figma 的高斯模糊，CSS 的 blur 参数完全不一样。

前端开发的苦：设计师觉得"这不就是一个按钮吗"，产品经理觉得"这不就改个颜色吗"，后端觉得"你们前端就是写 HTML 的"。

谁懂啊，CSS 比算法还难（暴论）。`
  },
  {
    tags: ["Node.js", "Express"], difficulty: 2, codeBlocks: 0,
    content: `后端选型纠结症犯了...

做个人项目，在 Node.js + Express、Go + Gin、Java + Spring Boot 之间犹豫。

考虑因素：
- Express：最熟悉，但是性能一般
- Go + Gin：性能好，学过基础，但 ORM 生态不如 JS
- Spring Boot：企业级首选，但个人项目感觉太重了

你们做个人项目一般用什么？`
  },
  {
    tags: ["MongoDB", "Redis"], difficulty: 3, codeBlocks: 0,
    content: `Redis 缓存穿透、缓存雪崩、缓存击穿，面试被问了三遍终于搞懂了

缓存穿透：查不存在的数据，请求直达数据库 → 解决：布隆过滤器 / 缓存空值
缓存雪崩：大量 key 同时过期 → 解决：随机过期时间 / 永不过期 + 后台刷新
缓存击穿：热点 key 过期，大量请求同时打到数据库 → 解决：互斥锁 / 逻辑过期

面试被这三个搞了好几次，记录一下免得又忘了。

有补充或者不对的地方欢迎指出！`
  },
  {
    tags: ["React Native", "Flutter"], difficulty: 2, codeBlocks: 0,
    content: `纠结了一周，最终选了 Flutter 而不是 React Native

原因：
1. Flutter 性能更好，自绘引擎不依赖原生控件
2. Dart 语言写起来比 JS 更舒服（有类型系统、不用配TypeScript）
3. Flutter 的 Widget 体系比 RN 的组件更一致
4. Google 在背后推，生态增长很快

RN 的优势：
1. 如果团队都是 JS/TS 背景，RN 上手更快
2. 可以和现有 React Web 项目共享一些代码
3. 社区更大（但 Flutter 在追赶）

纯属个人选择，两个都是好框架。`
  },
  {
    tags: ["CI/CD", "Docker"], difficulty: 4, codeBlocks: 0,
    content: `我们团队从手动部署到 CI/CD 的转型之路

以前的部署流程：
1. 本地打包
2. 手动上传到服务器
3. 手动重启服务
4. 祈祷不出问题

现在的流程：
1. git push
2. 没了

用 GitHub Actions + Docker + 阿里云 CR，推代码自动构建镜像、自动部署。

最大的好处不是效率提升，而是心理负担小了——以前每次手动部署都紧张得要命，生怕操作错了。`
  },
  {
    tags: ["Swift"], difficulty: 2, codeBlocks: 0,
    content: `作为一个安卓转 iOS 的开发者，谈谈 Swift 的第一印象

喜欢的：
- Optional 的设计太好了，再也不怕 NullPointerException
- SwiftUI 的声明式语法非常优雅
- Playground 可以即时预览

不习惯的：
- Xcode 比 Android Studio 卡多了（16G 内存不够用）
- 模拟器启动慢
- Apple 开发者账号每年 688 块（安卓 25 美元终身）

总体感受：Swift 是一门设计得很现代的语言，写起来比 Kotlin 还舒服。`
  },
  {
    tags: ["NLP", "深度学习"], difficulty: 4, codeBlocks: 0,
    content: `大模型时代，NLP 方向还值得深入吗？

说说我的看法：

传统 NLP 任务（分词、命名实体识别、情感分析）确实被大模型降维打击了。但这不意味着 NLP 没价值了：

1. 大模型本身就是 NLP 的产物，理解 Transformer 架构还是很重要
2. 垂直领域的微调和适配需求很大
3. RAG（检索增强生成）是当前最热的方向
4. 多模态（文本+图像+语音）还有很多开放问题

我的建议：别只学调 API，要理解底层原理。会调 ChatGPT 的人满大街都是，能微调模型、优化推理效率的人才才稀缺。`
  },
  {
    tags: ["TensorFlow", "PyTorch"], difficulty: 3, codeBlocks: 0,
    content: `PyTorch vs TensorFlow，2024年了还在纠结吗？

简单说结论：

学术研究 → PyTorch（90% 的论文用 PyTorch）
工业部署 → 都行，但 TensorFlow Serving 更成熟
入门学习 → PyTorch（更 Pythonic，调试方便）
移动端部署 → TensorFlow Lite

我个人用 PyTorch 更多，因为动态图调试真的方便太多了。TensorFlow 2.x 虽然也支持 Eager Mode 了，但社区惯性已经形成了。

新人直接学 PyTorch，没什么好纠结的。`
  },

  // ===== 更多日常和感悟 =====
  {
    tags: ["JavaScript"], difficulty: 1, codeBlocks: 0,
    content: `周末参加了一个线下黑客松，48小时没怎么睡，但是超开心！

我们团队做了一个 AI 辅助的代码 review 工具，虽然最后没拿奖，但认识了好几个厉害的开发者。

收获最大的是：看到别人怎么在短时间内做技术决策。有个大佬 10 分钟就定好了技术栈和分工，而我们纠结选型纠结了两个小时。

建议大家有机会多参加黑客松，比在家自学有意思多了。`
  },
  {
    tags: ["Java"], difficulty: 1, codeBlocks: 0,
    content: `转行做程序员半年了，聊聊感受

之前在一家小公司做行政，工资不高也看不到前途。去年下定决心转行，自学了半年 Java，然后找到了一份初级开发的工作。

真实感受：
- 工资确实涨了，但加班也多了
- 学习永远停不下来，技术更新太快
- 解决 bug 的成就感很大，但被 bug 折磨的时候也很崩溃
- 同事人都很好，程序员圈子氛围不错

给想转行的人的建议：做好至少半年全职学习的准备，别指望看两个月视频就能找到工作。`
  },
  {
    tags: ["Vue", "React"], difficulty: 2, codeBlocks: 0,
    content: `学了 React 之后回头看 Vue，有了新的理解

以前只会 Vue，觉得 React 的 JSX 很奇怪，为什么要把 HTML 写在 JS 里？

学了 React 之后：哦，原来一切都是 JS，组件就是函数，props 就是参数，状态就是变量。思维方式完全不一样。

Vue 像是给你搭好了房子，你按规矩住就行（模板、computed、watch）
React 像是给你一堆积木，你想怎么搭都行（但也更容易搭歪）

两个都是好框架，没有高下之分。Vue 上手快，React 更灵活。`
  },
  {
    tags: ["PostgreSQL", "MySQL"], difficulty: 2, codeBlocks: 0,
    content: `PostgreSQL 和 MySQL 怎么选？说说我的经验

个人项目 / 小团队：都行，选你熟的
需要复杂查询 / JSON 字段：PostgreSQL
需要读写分离 / 主从复制：MySQL 生态更成熟
地理空间数据：PostgreSQL + PostGIS
全文搜索：PostgreSQL 内置支持，MySQL 需要额外配置

我现在新项目默认用 PostgreSQL，因为它的功能更全面，数组类型、JSON 支持、CTE 递归查询都很好用。

MySQL 的优势是性能调优资料更多（毕竟历史更长），运维工具更丰富。`
  },
  {
    tags: ["Nginx"], difficulty: 3, codeBlocks: 0,
    content: `第一次配 Nginx 反向代理踩了一晚上的坑，记录一下

坑1：忘记把 WebSocket 升级头传递，导致实时功能挂了
坑2：SSL 证书配置的路径写错了，HTTPS 打不开
坑3：proxy_pass 结尾加不加斜杠，行为完全不一样
坑4：413 错误，原来是默认上传文件大小限制 1M
坑5：静态资源没配缓存，每次刷新都重新加载

总结：Nginx 配置看起来简单，但细节巨多。建议每改一行就 nginx -t 测试一下，别改了一堆再测，出错了都不知道哪里有问题。`
  },
];

// ==================== 评论内容模板池 ====================
const COMMENT_TEMPLATES = [
  // 技术相关评论
  "写得很好，收藏了！",
  "正好在学这个，感谢分享",
  "代码写得很清晰，新手友好！",
  "请问这个方法在生产环境中性能怎么样？",
  "踩过同样的坑，感谢楼主总结。",
  "能出一个进阶版吗？想深入了解。",
  "这个方法我之前不知道，学到了！",
  "面试刚好被问到这个知识点，感谢！",
  "建议可以加上错误处理的部分。",
  "实际项目中用过，确实很好用。",
  "终于搞懂了！之前看了好几篇都没看明白。",
  "代码风格很规范，值得学习。",
  "跟着代码敲了一遍，加深了理解。",
  "这个写法比我之前用的简洁多了。",
  "补充一点：还可以用 try-catch 包裹一下更安全。",

  // 日常互动评论
  "哈哈哈太真实了",
  "深有同感，我也是这样过来的",
  "说得太对了，尤其是第三点",
  "感谢分享，已经收藏了",
  "期待更新！",
  "同为转行选手，一起加油！",
  "你说的这个资源我也用过，确实不错",
  "请问可以分享一下你的学习路线吗？",
  "关注了，期待更多分享！",
  "这个观点我之前没想到，受教了",

  // 提问和讨论
  "请问楼主用的什么编辑器？",
  "这个和 xxx 相比有什么优势吗？",
  "我遇到类似的问题，但场景不太一样，能帮忙看看吗？",
  "补充一个坑：如果是 Windows 系统需要注意路径问题",
  "这个库最新版本的 API 有变化，文档更新了",
  "请问学到什么程度可以开始找实习？",
  "我的方法不太一样，但效果也不错",
  "有没有推荐的进阶学习资料？",

  // 鼓励和社交
  "太强了，膜拜大佬",
  "加油！坚持就有收获",
  "欢迎来我的主页交流，互关一下？",
  "我也是今年毕业，共勉！",
  "写得用心了，点赞支持",
  "每次看你的帖子都能学到东西",
  "这个社区氛围真好",
  "谢谢楼主的无私分享",
  "虽然看不太懂但感觉好厉害",
  "先马后看，周末来学",
];

// ==================== 主生成逻辑 ====================

async function main() {
  console.log("🌱 开始重新生成帖子相关数据...\n");

  // ===== 1. 清空帖子相关数据 =====
  console.log("🗑️  清空旧帖子数据（保留用户和关注关系）...");
  await prisma.notification.deleteMany({});
  await prisma.commentLike.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.media.deleteMany({});
  await prisma.post.deleteMany({});
  console.log("  ✅ 旧数据已清空\n");

  // ===== 2. 获取所有现有用户 =====
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, interests: true, skillLevel: true, email: true },
  });

  // 区分活跃用户和潜水用户
  const activeUsers = allUsers.filter((u) => !u.email?.includes("lurker_"));
  const lurkerUsers = allUsers.filter((u) => u.email?.includes("lurker_"));

  console.log(`  活跃用户: ${activeUsers.length}，潜水用户: ${lurkerUsers.length}\n`);

  if (activeUsers.length === 0) {
    console.error("❌ 没有活跃用户，请先运行初始 seed 脚本创建用户");
    return;
  }

  // ===== 3. 生成帖子 =====
  console.log(`📝 生成 ${CONFIG.postCount} 篇帖子...`);

  interface PostRecord {
    id: string;
    userId: string;
    tags: string[];
    difficulty: number;
  }

  const posts: PostRecord[] = [];

  for (let i = 0; i < CONFIG.postCount; i++) {
    const author = randomItem(activeUsers);

    // 70% 概率选与作者兴趣相关的模板，30% 随机
    let template: PostTemplate;
    if (Math.random() < 0.7 && author.interests.length > 0) {
      const matchingTemplates = POST_TEMPLATES.filter((t) =>
        t.tags.some((tag) => author.interests.includes(tag))
      );
      template = matchingTemplates.length > 0 ? randomItem(matchingTemplates) : randomItem(POST_TEMPLATES);
    } else {
      template = randomItem(POST_TEMPLATES);
    }

    const postId = generateId();

    await prisma.post.create({
      data: {
        id: postId,
        content: template.content,
        userId: author.id,
        tags: template.tags,
        difficulty: template.difficulty,
        codeBlocks: template.codeBlocks,
        createAt: randomDate(90),
      },
    });

    posts.push({ id: postId, userId: author.id, tags: template.tags, difficulty: template.difficulty });
  }
  console.log(`  ✅ ${posts.length} 篇帖子已创建`);

  // ===== 4. 活跃用户点赞 =====
  console.log(`\n📝 生成活跃用户点赞数据...`);
  let totalLikes = 0;
  const likeSet = new Set<string>();

  for (const user of activeUsers) {
    const numLikes = randomInt(CONFIG.likesPerUser.min, CONFIG.likesPerUser.max);
    const matchingPosts = posts.filter((p) => p.tags.some((t) => user.interests.includes(t)));

    for (let j = 0; j < numLikes; j++) {
      const targetPost = Math.random() < 0.7 && matchingPosts.length > 0
        ? randomItem(matchingPosts) : randomItem(posts);

      const key = `${user.id}-${targetPost.id}`;
      if (likeSet.has(key) || targetPost.userId === user.id) continue;
      likeSet.add(key);

      await prisma.like.create({ data: { userId: user.id, postId: targetPost.id } });
      totalLikes++;
    }
  }
  console.log(`  ✅ ${totalLikes} 条活跃用户点赞`);

  // ===== 5. 活跃用户收藏 =====
  console.log(`\n📝 生成活跃用户收藏数据...`);
  let totalBookmarks = 0;
  const bookmarkSet = new Set<string>();

  for (const user of activeUsers) {
    const numBookmarks = randomInt(CONFIG.bookmarksPerUser.min, CONFIG.bookmarksPerUser.max);
    const goodPosts = posts.filter((p) => p.tags.some((t) => user.interests.includes(t)));

    for (let j = 0; j < numBookmarks; j++) {
      const targetPost = Math.random() < 0.8 && goodPosts.length > 0
        ? randomItem(goodPosts) : randomItem(posts);

      const key = `${user.id}-${targetPost.id}`;
      if (bookmarkSet.has(key) || targetPost.userId === user.id) continue;
      bookmarkSet.add(key);

      await prisma.bookmark.create({ data: { userId: user.id, postId: targetPost.id } });
      totalBookmarks++;
    }
  }
  console.log(`  ✅ ${totalBookmarks} 条活跃用户收藏`);

  // ===== 6. 活跃用户评论 =====
  console.log(`\n📝 生成 ${CONFIG.commentsCount} 条活跃用户评论...`);
  let activeComments = 0;

  for (let i = 0; i < CONFIG.commentsCount; i++) {
    const commenter = randomItem(activeUsers);
    const targetPost = randomItem(posts);
    if (commenter.id === targetPost.userId && Math.random() < 0.3) continue;

    await prisma.comment.create({
      data: {
        content: randomItem(COMMENT_TEMPLATES),
        userId: commenter.id,
        postId: targetPost.id,
        createAt: randomDate(60),
      },
    });
    activeComments++;
  }
  console.log(`  ✅ ${activeComments} 条活跃用户评论`);

  // ===== 7. 潜水用户互动 =====
  if (lurkerUsers.length > 0) {
    console.log(`\n📝 生成潜水用户互动...`);

    // 分组：只点赞 / 只评论 / 点赞+评论 / 纯潜水
    const groupSize = Math.floor(lurkerUsers.length / 4);
    const likeOnlyGroup = lurkerUsers.slice(0, groupSize);
    const commentOnlyGroup = lurkerUsers.slice(groupSize, groupSize * 2);
    const bothGroup = lurkerUsers.slice(groupSize * 2, groupSize * 3);
    // 最后一组纯潜水，什么都不做

    let lurkerLikes = 0;
    let lurkerComments = 0;

    // 只点赞组
    for (const user of likeOnlyGroup) {
      const num = randomInt(CONFIG.lurkerLikes.min, CONFIG.lurkerLikes.max);
      for (let j = 0; j < num; j++) {
        const post = randomItem(posts);
        const key = `${user.id}-${post.id}`;
        if (likeSet.has(key)) continue;
        likeSet.add(key);
        try {
          await prisma.like.create({ data: { userId: user.id, postId: post.id } });
          lurkerLikes++;
        } catch { /* skip */ }
      }
    }

    // 只评论组
    for (const user of commentOnlyGroup) {
      const num = randomInt(CONFIG.lurkerComments.min, CONFIG.lurkerComments.max);
      for (let j = 0; j < num; j++) {
        const post = randomItem(posts);
        await prisma.comment.create({
          data: {
            content: randomItem(COMMENT_TEMPLATES),
            userId: user.id,
            postId: post.id,
            createAt: randomDate(60),
          },
        });
        lurkerComments++;
      }
    }

    // 点赞+评论组
    for (const user of bothGroup) {
      const numLikes = randomInt(CONFIG.lurkerLikes.min, CONFIG.lurkerLikes.max);
      for (let j = 0; j < numLikes; j++) {
        const post = randomItem(posts);
        const key = `${user.id}-${post.id}`;
        if (likeSet.has(key)) continue;
        likeSet.add(key);
        try {
          await prisma.like.create({ data: { userId: user.id, postId: post.id } });
          lurkerLikes++;
        } catch { /* skip */ }
      }
      const numComments = randomInt(CONFIG.lurkerComments.min, CONFIG.lurkerComments.max);
      for (let j = 0; j < numComments; j++) {
        const post = randomItem(posts);
        await prisma.comment.create({
          data: {
            content: randomItem(COMMENT_TEMPLATES),
            userId: user.id,
            postId: post.id,
            createAt: randomDate(60),
          },
        });
        lurkerComments++;
      }
    }

    console.log(`  ✅ 潜水用户点赞: ${lurkerLikes}，评论: ${lurkerComments}`);
    totalLikes += lurkerLikes;
  }

  // ===== 8. 更新所有用户技能等级 =====
  console.log(`\n🔄 更新所有用户技能等级...`);
  let levelChanged = 0;

  for (const user of allUsers) {
    const postStats = await prisma.post.aggregate({
      where: { userId: user.id },
      _count: true,
      _sum: { codeBlocks: true },
    });
    const likes = await prisma.like.count({ where: { post: { userId: user.id } } });
    const bookmarks = await prisma.bookmark.count({ where: { post: { userId: user.id } } });
    const comments = await prisma.comment.count({ where: { userId: user.id } });

    const rawScore =
      (postStats._count || 0) * 2 +
      (postStats._sum.codeBlocks || 0) * 3 +
      likes * 1 +
      bookmarks * 2 +
      comments * 1;

    let newLevel = 1;
    if (rawScore > 100) newLevel = 5;
    else if (rawScore > 60) newLevel = 4;
    else if (rawScore > 30) newLevel = 3;
    else if (rawScore > 10) newLevel = 2;

    if (newLevel !== user.skillLevel) {
      await prisma.user.update({ where: { id: user.id }, data: { skillLevel: newLevel } });
      levelChanged++;
    }
  }
  console.log(`  ✅ ${levelChanged} 个用户等级已更新`);

  // ===== 统计 =====
  const totalComments = await prisma.comment.count();
  const totalBookmarksCount = await prisma.bookmark.count();

  console.log("\n" + "=".repeat(50));
  console.log("🎉 数据重新生成完成！");
  console.log(`   📄 帖子: ${posts.length}`);
  console.log(`   ❤️  点赞: ${totalLikes}`);
  console.log(`   🔖 收藏: ${totalBookmarksCount}`);
  console.log(`   💬 评论: ${totalComments}`);
  console.log(`   👤 用户: ${allUsers.length}（未改动）`);
  console.log(`   👥 关注: 未改动`);
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error("❌ 失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());