// ============================================
// CodeHub 推荐算法种子数据生成脚本（修正版）
// seed-recommendation.ts
//
// 用法：npx tsx prisma/seed-recommendation.ts
// 前提：已执行 schema 迁移，新增 skillLevel, interests, tags, difficulty, codeBlocks 字段
//
// ⚠️ 帖子内容格式：纯文本 + ```language\n代码\n``` 代码块
//    匹配前端 renderContent 函数的解析逻辑
// ============================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== 配置参数 ====================
const CONFIG = {
  userCount: 80,
  postCount: 400,
  likesPerUser: { min: 10, max: 40 },
  bookmarksPerUser: { min: 3, max: 15 },
  commentsCount: 600,
  followsPerUser: { min: 3, max: 20 },
};

// ==================== 基础数据定义 ====================
const TAGS = {
  frontend: ["JavaScript", "TypeScript", "React", "Vue", "Next.js", "CSS", "HTML", "Tailwind"],
  backend: ["Java", "Spring Boot", "Node.js", "Express", "Python", "Django", "Go", "Rust"],
  database: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "Prisma"],
  devops: ["Docker", "Linux", "Git", "CI/CD", "Nginx"],
  mobile: ["Flutter", "React Native", "Swift", "Kotlin"],
  ai: ["机器学习", "深度学习", "PyTorch", "TensorFlow", "NLP"],
  general: ["算法", "数据结构", "设计模式", "系统设计"],
};

const ALL_TAGS = Object.values(TAGS).flat();

const USER_PROFILES = [
  { direction: "前端开发", tags: TAGS.frontend, weight: 0.25 },
  { direction: "后端开发", tags: TAGS.backend, weight: 0.25 },
  { direction: "全栈开发", tags: [...TAGS.frontend, ...TAGS.backend], weight: 0.2 },
  { direction: "AI/数据", tags: TAGS.ai, weight: 0.1 },
  { direction: "移动开发", tags: TAGS.mobile, weight: 0.1 },
  { direction: "DevOps", tags: TAGS.devops, weight: 0.1 },
];

const SURNAMES = [
  "张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴",
  "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
  "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
];

const GIVEN_NAMES = [
  "伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "洋", "勇",
  "艳", "杰", "涛", "明", "超", "秀英", "华", "慧", "建华", "玲",
  "桂英", "飞", "平", "鑫", "军", "辉", "志强", "秀兰", "霞", "旭",
  "宇轩", "子涵", "浩然", "梓萱", "雨桐", "思远", "晨曦", "诗涵", "昊天", "若溪",
];

// ==================== 帖子内容模板（纯文本 + ```代码块```）====================

function generatePostContent(
  tags: string[],
  difficulty: number
): { content: string; codeBlocks: number } {
  const mainTag = tags[0];
  const templates = getTemplatesForTag(mainTag, difficulty);
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template;
}

function getTemplatesForTag(
  tag: string,
  difficulty: number
): Array<{ content: string; codeBlocks: number }> {

  // ========== JavaScript / TypeScript ==========
  if (tag === "JavaScript" || tag === "TypeScript") {
    if (difficulty <= 2) {
      return [
        {
          content: `JavaScript 变量声明方式总结

今天来总结一下 JS 中三种变量声明的区别，希望对初学者有帮助！

\`\`\`javascript
// var - 函数作用域，存在变量提升
var name = "CodeHub";
console.log(name);

// let - 块级作用域，不会提升
let age = 20;
if (true) {
  let age = 30; // 不影响外层
}

// const - 块级作用域，不可重新赋值
const PI = 3.14159;
// PI = 3; // TypeError!
\`\`\`

总结：优先使用 const，需要重新赋值时用 let，尽量不用 var。`,
          codeBlocks: 1,
        },
        {
          content: `箭头函数 vs 普通函数

很多新手搞不清楚箭头函数和普通函数的区别，我来梳理一下：

\`\`\`javascript
// 普通函数
function greet(name) {
  return "Hello, " + name;
}

// 箭头函数（简写）
const greetArrow = (name) => "Hello, " + name;

// 关键区别：this 指向不同
const obj = {
  name: "CodeHub",
  // 普通函数 this 指向 obj
  sayHi() { console.log(this.name); },
  // 箭头函数 this 继承外层
  sayHi2: () => { console.log(this.name); } // undefined!
};
\`\`\`

记住：箭头函数没有自己的 this，这是最重要的区别！`,
          codeBlocks: 1,
        },
        {
          content: `数组常用方法速查

整理了最常用的数组方法，建议收藏！

\`\`\`javascript
const nums = [1, 2, 3, 4, 5];

// map - 映射
const doubled = nums.map(n => n * 2); // [2,4,6,8,10]

// filter - 过滤
const evens = nums.filter(n => n % 2 === 0); // [2,4]

// reduce - 累加
const sum = nums.reduce((acc, n) => acc + n, 0); // 15

// find - 查找
const found = nums.find(n => n > 3); // 4

// some / every - 条件检测
nums.some(n => n > 4);  // true
nums.every(n => n > 0); // true
\`\`\`

这几个方法用熟了，基本能处理 90% 的数组操作场景。`,
          codeBlocks: 1,
        },
        {
          content: `解构赋值让代码更简洁

ES6 的解构赋值是日常开发中最常用的语法之一：

\`\`\`javascript
// 对象解构
const user = { name: "Cathy", age: 22, city: "常州" };
const { name, age } = user;
console.log(name); // "Cathy"

// 重命名
const { name: userName } = user;

// 默认值
const { role = "user" } = user;

// 数组解构
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first); // 1
console.log(rest);  // [3, 4, 5]

// 函数参数解构
function showUser({ name, age }) {
  console.log(name + " 今年 " + age + " 岁");
}
showUser(user);
\`\`\`

写 React 的时候 props 解构特别常用，一定要掌握！`,
          codeBlocks: 1,
        },
      ];
    } else if (difficulty <= 4) {
      return [
        {
          content: `Promise 和 async/await 深入理解

异步编程是 JS 的核心难点，来看看 Promise 链和 async/await 的对比：

\`\`\`javascript
// Promise 链式调用
function fetchUserPosts(userId) {
  return fetch("/api/users/" + userId)
    .then(res => res.json())
    .then(user => fetch("/api/posts?author=" + user.name))
    .then(res => res.json())
    .catch(err => console.error("Error:", err));
}

// async/await 改写（更清晰）
async function fetchUserPostsAsync(userId) {
  try {
    const userRes = await fetch("/api/users/" + userId);
    const user = await userRes.json();
    const postsRes = await fetch("/api/posts?author=" + user.name);
    return await postsRes.json();
  } catch (err) {
    console.error("Error:", err);
  }
}
\`\`\`

\`\`\`javascript
// 并发请求用 Promise.all
async function fetchMultiple(ids) {
  const promises = ids.map(id =>
    fetch("/api/posts/" + id).then(r => r.json())
  );
  const results = await Promise.all(promises);
  return results;
}
\`\`\`

建议：简单场景用 async/await，需要并发时配合 Promise.all。`,
          codeBlocks: 2,
        },
        {
          content: `TypeScript 泛型实战指南

泛型是 TS 的精华，掌握泛型写出的代码更灵活、更安全。

\`\`\`typescript
// 基础泛型函数
function identity<T>(arg: T): T {
  return arg;
}

// 泛型约束
interface HasLength {
  length: number;
}
function logLength<T extends HasLength>(arg: T): void {
  console.log(arg.length);
}
logLength("hello");   // OK
logLength([1, 2, 3]); // OK
// logLength(123);    // Error: number 没有 length

// 实用工具类型
type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
};

// 使用
interface User { id: string; name: string; }
const response: ApiResponse<User[]> = {
  data: [{ id: "1", name: "Cathy" }],
  success: true,
};
\`\`\`

泛型让你写一次代码，适配多种类型，是大型项目的必备技能。`,
          codeBlocks: 1,
        },
        {
          content: `闭包原理与实际应用

闭包是 JS 面试必问的知识点，理解了它很多问题迎刃而解：

\`\`\`javascript
// 闭包的本质：函数能"记住"定义时的作用域
function createCounter() {
  let count = 0;
  return {
    increment() { return ++count; },
    decrement() { return --count; },
    getCount() { return count; },
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.getCount()); // 2

// 实际应用：防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const handleSearch = debounce((query) => {
  console.log("搜索:", query);
}, 300);
\`\`\`

闭包的核心价值：实现数据私有化和状态持久化。`,
          codeBlocks: 1,
        },
      ];
    } else {
      return [
        {
          content: `手写简易版 React Hooks 原理

深入理解 React Hooks 的底层实现原理，手写一个简化版：

\`\`\`javascript
let state = [];
let stateIndex = 0;

function useState(initialValue) {
  const currentIndex = stateIndex;
  state[currentIndex] = state[currentIndex] ?? initialValue;

  function setState(newValue) {
    if (typeof newValue === "function") {
      state[currentIndex] = newValue(state[currentIndex]);
    } else {
      state[currentIndex] = newValue;
    }
    render(); // 触发重新渲染
  }

  stateIndex++;
  return [state[currentIndex], setState];
}

function useEffect(callback, deps) {
  const currentIndex = stateIndex;
  const prevDeps = state[currentIndex];
  const hasChanged = !prevDeps ||
    deps.some((dep, i) => !Object.is(dep, prevDeps[i]));

  if (hasChanged) {
    callback();
    state[currentIndex] = deps;
  }
  stateIndex++;
}
\`\`\`

这解释了为什么 Hooks 不能在条件语句中使用——它们依赖调用顺序来匹配 state 数组索引。`,
          codeBlocks: 1,
        },
        {
          content: `JavaScript 事件循环机制详解

理解事件循环是写好异步代码的基础，来看这道经典面试题：

\`\`\`javascript
console.log("1");

setTimeout(() => {
  console.log("2");
  Promise.resolve().then(() => console.log("3"));
}, 0);

Promise.resolve().then(() => {
  console.log("4");
  setTimeout(() => console.log("5"), 0);
});

console.log("6");

// 输出顺序：1 -> 6 -> 4 -> 2 -> 3 -> 5
\`\`\`

执行顺序解析：
1. 同步代码先执行：打印 1、6
2. 微任务队列：Promise 回调打印 4
3. 宏任务队列：第一个 setTimeout 打印 2，其中的 Promise 打印 3
4. 宏任务队列：第二个 setTimeout 打印 5

记住优先级：同步代码 > 微任务(Promise) > 宏任务(setTimeout)`,
          codeBlocks: 1,
        },
      ];
    }
  }

  // ========== React / Next.js ==========
  if (tag === "React" || tag === "Next.js") {
    if (difficulty <= 2) {
      return [
        {
          content: `React 组件基础：函数组件与 Props

React 的核心就是组件化，来看最基础的函数组件写法：

\`\`\`javascript
// 定义组件，接收 props
function UserCard({ name, avatar, bio }) {
  return (
    <div className="card">
      <img src={avatar} alt={name} />
      <h3>{name}</h3>
      <p>{bio}</p>
    </div>
  );
}

// 使用组件
function App() {
  return (
    <UserCard
      name="Cathy"
      avatar="/avatar.jpg"
      bio="全栈开发者"
    />
  );
}
\`\`\`

组件就像乐高积木，把 UI 拆成小块，各自管理自己的逻辑。`,
          codeBlocks: 1,
        },
        {
          content: `useState 和 useEffect 入门

React 最常用的两个 Hook，学会它们就能写大部分功能：

\`\`\`javascript
import { useState, useEffect } from "react";

function Counter() {
  // useState 管理状态
  const [count, setCount] = useState(0);
  const [name, setName] = useState("CodeHub");

  // useEffect 处理副作用
  useEffect(() => {
    document.title = "点击了 " + count + " 次";
  }, [count]); // 依赖数组：count 变化时执行

  return (
    <div>
      <p>{name} 的计数器：{count}</p>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
      <button onClick={() => setCount(prev => prev - 1)}>
        -1
      </button>
    </div>
  );
}
\`\`\`

useState 返回 [值, 修改函数]，useEffect 在依赖变化时执行副作用。`,
          codeBlocks: 1,
        },
      ];
    } else {
      return [
        {
          content: `Next.js 15 Server Actions 实战

Server Actions 是 Next.js 的杀手特性，直接在服务端处理表单：

\`\`\`typescript
// app/actions/post.ts
"use server";

import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const { user } = await validateRequest();
  if (!user) throw new Error("未登录");

  const content = formData.get("content") as string;

  const post = await prisma.post.create({
    data: {
      content,
      userId: user.id,
    },
  });

  revalidatePath("/");
  return post;
}
\`\`\`

\`\`\`typescript
// app/components/PostForm.tsx
"use client";

import { createPost } from "@/actions/post";
import { useTransition } from "react";

export function PostForm() {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={(formData) =>
      startTransition(() => createPost(formData))
    }>
      <textarea name="content" required />
      <button disabled={isPending}>
        {isPending ? "发布中..." : "发布"}
      </button>
    </form>
  );
}
\`\`\`

不需要写 API route，不需要 fetch，一个 "use server" 搞定！`,
          codeBlocks: 2,
        },
        {
          content: `React TanStack Query 数据请求管理

比 useEffect + fetch 优雅 100 倍的数据请求方案：

\`\`\`typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 查询数据
function PostList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts").then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
  });

  if (isLoading) return <p>加载中...</p>;
  if (error) return <p>加载失败</p>;

  return data.map(post => <PostCard key={post.id} post={post} />);
}

// 修改数据 + 自动刷新列表
function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
\`\`\`

TanStack Query 自动处理缓存、去重、重试、失效刷新，强烈推荐。`,
          codeBlocks: 1,
        },
      ];
    }
  }

  // ========== Java / Spring Boot ==========
  if (tag === "Java" || tag === "Spring Boot") {
    if (difficulty <= 2) {
      return [
        {
          content: `Java 面向对象基础：类与继承

OOP 是 Java 的核心，来看最基础的类定义和继承：

\`\`\`java
// 基类
public abstract class Animal {
    protected String name;
    protected int age;

    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }

    // 抽象方法，子类必须实现
    public abstract void speak();

    public String getInfo() {
        return name + ", 年龄: " + age;
    }
}

// 子类
public class Dog extends Animal {
    private String breed;

    public Dog(String name, int age, String breed) {
        super(name, age);
        this.breed = breed;
    }

    @Override
    public void speak() {
        System.out.println(name + " 说：汪汪！");
    }
}
\`\`\`

记住：abstract 类不能直接实例化，子类必须实现所有抽象方法。`,
          codeBlocks: 1,
        },
        {
          content: `Java 集合框架入门

ArrayList 和 HashMap 是 Java 中最常用的两个集合类：

\`\`\`java
import java.util.*;

public class CollectionDemo {
    public static void main(String[] args) {
        // ArrayList - 动态数组
        List<String> names = new ArrayList<>();
        names.add("张三");
        names.add("李四");
        names.add("王五");

        // 遍历
        for (String name : names) {
            System.out.println(name);
        }

        // Stream API（Java 8+）
        names.stream()
             .filter(n -> n.startsWith("张"))
             .forEach(System.out::println);

        // HashMap - 键值对
        Map<String, Integer> scores = new HashMap<>();
        scores.put("数学", 95);
        scores.put("英语", 88);
        scores.put("编程", 100);

        // 遍历 Map
        scores.forEach((subject, score) ->
            System.out.println(subject + ": " + score)
        );
    }
}
\`\`\`

ArrayList 底层是数组，查询快；LinkedList 底层是链表，增删快。`,
          codeBlocks: 1,
        },
      ];
    } else {
      return [
        {
          content: `Spring Boot RESTful API 最佳实践

分享一下我在实习中学到的 Spring Boot 开发规范：

\`\`\`java
@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<PageResult<PostVO>> getPosts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(postService.getPosts(page, size));
    }

    @PostMapping
    public ResponseEntity<PostVO> createPost(
            @Valid @RequestBody CreatePostDTO dto,
            @AuthenticationPrincipal UserDetails user) {
        PostVO post = postService.createPost(dto, user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(post);
    }

    @ExceptionHandler(PostNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            PostNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(404, e.getMessage()));
    }
}
\`\`\`

关键点：统一响应格式、参数校验、全局异常处理、分页支持。`,
          codeBlocks: 1,
        },
      ];
    }
  }

  // ========== Python ==========
  if (tag === "Python" || tag === "Django") {
    return [
      {
        content: `Python 列表推导式与生成器

列表推导式是 Python 最优雅的语法之一：

\`\`\`python
# 基础列表推导式
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# 带条件的推导式
evens = [x for x in range(20) if x % 2 == 0]

# 嵌套推导式（矩阵转置）
matrix = [[1,2,3], [4,5,6], [7,8,9]]
transposed = [[row[i] for row in matrix] for i in range(3)]

# 生成器表达式（惰性计算，节省内存）
sum_of_squares = sum(x**2 for x in range(1000000))

# 字典推导式
word_lengths = {word: len(word) for word in ["hello", "world", "python"]}
\`\`\`

当数据量大时，用生成器替代列表推导式可以大幅减少内存使用。`,
        codeBlocks: 1,
      },
      {
        content: `Python 装饰器从入门到实战

装饰器是 Python 的高级特性，理解了它能让代码更优雅：

\`\`\`python
import time
from functools import wraps

# 基础装饰器：计时器
def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} 耗时: {end - start:.4f}秒")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "完成"

# 带参数的装饰器：重试机制
def retry(max_attempts=3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    print(f"第{attempt+1}次失败，重试...")
        return wrapper
    return decorator

@retry(max_attempts=3)
def fetch_data(url):
    # 可能会失败的网络请求
    pass
\`\`\`

Flask 和 Django 里大量使用装饰器，比如 @app.route、@login_required。`,
        codeBlocks: 1,
      },
    ];
  }

  // ========== Docker / DevOps ==========
  if (tag === "Docker" || tag === "Linux" || tag === "CI/CD" || tag === "Nginx") {
    return [
      {
        content: `Docker Compose 多服务部署实战

分享一下我部署 Next.js + PostgreSQL 项目的 Docker Compose 配置：

\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/codehub
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: codehub
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
\`\`\`

\`\`\`dockerfile
# Dockerfile（多阶段构建）
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

多阶段构建让镜像从 1.2GB 缩小到 200MB 左右！`,
        codeBlocks: 2,
      },
      {
        content: `Linux 常用命令速查手册

整理了开发中最常用的 Linux 命令：

\`\`\`bash
# 文件操作
ls -la              # 列出所有文件（含隐藏）
find . -name "*.ts" # 递归查找文件
grep -r "TODO" ./src # 递归搜索内容

# 进程管理
ps aux | grep node  # 查找 node 进程
kill -9 <PID>       # 强制终止进程
top                 # 实时查看系统资源

# 网络调试
curl -X GET http://localhost:3000/api/health
netstat -tlnp       # 查看端口占用
ping google.com     # 测试网络连通性

# 磁盘管理
df -h               # 查看磁盘使用
du -sh ./node_modules # 查看目录大小

# 文本处理
cat file.log | tail -100    # 查看最后100行
cat file.log | grep "ERROR" # 过滤错误日志
wc -l src/**/*.ts           # 统计代码行数
\`\`\`

建议把常用的命令设置成 alias，效率提升很多。`,
        codeBlocks: 1,
      },
    ];
  }

  // ========== 算法 / 数据结构 ==========
  if (tag === "算法" || tag === "数据结构") {
    return [
      {
        content: `二叉树遍历的三种方式（递归 + 迭代）

面试高频题，必须掌握！

\`\`\`javascript
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// 前序遍历（根-左-右）
function preorder(root) {
  if (!root) return [];
  return [root.val, ...preorder(root.left), ...preorder(root.right)];
}

// 中序遍历（左-根-右）- 迭代版
function inorder(root) {
  const result = [], stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) {
      stack.push(curr);
      curr = curr.left;
    }
    curr = stack.pop();
    result.push(curr.val);
    curr = curr.right;
  }
  return result;
}

// 层序遍历（BFS）
function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length) {
    const level = [];
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
\`\`\`

前序用于复制树，中序用于BST排序输出，层序用于逐层处理。`,
        codeBlocks: 1,
      },
      {
        content: `排序算法对比：快速排序 vs 归并排序

两个最重要的 O(n log n) 排序算法：

\`\`\`javascript
// 快速排序 - 原地排序，平均O(nlogn)
function quickSort(arr, left = 0, right = arr.length - 1) {
  if (left >= right) return arr;

  const pivot = arr[Math.floor((left + right) / 2)];
  let i = left, j = right;

  while (i <= j) {
    while (arr[i] < pivot) i++;
    while (arr[j] > pivot) j--;
    if (i <= j) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
      j--;
    }
  }

  quickSort(arr, left, j);
  quickSort(arr, i, right);
  return arr;
}

// 归并排序 - 稳定排序，始终O(nlogn)
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    result.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}
\`\`\`

快排空间O(1)但不稳定，归并稳定但空间O(n)，根据场景选择。`,
        codeBlocks: 1,
      },
    ];
  }

  // ========== CSS / Tailwind ==========
  if (tag === "CSS" || tag === "Tailwind") {
    return [
      {
        content: `Tailwind CSS 常用布局技巧

整理了几个 Tailwind 中最实用的布局写法：

\`\`\`html
<!-- Flex 居中（最常用） -->
<div class="flex items-center justify-center h-screen">
  <p>完美居中</p>
</div>

<!-- 响应式网格 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="rounded-xl bg-card p-4">卡片1</div>
  <div class="rounded-xl bg-card p-4">卡片2</div>
  <div class="rounded-xl bg-card p-4">卡片3</div>
</div>

<!-- 文字截断 -->
<p class="truncate w-48">这段很长的文字会被截断...</p>

<!-- 悬停动画 -->
<button class="transition-all duration-300 hover:scale-105 hover:shadow-lg">
  悬停放大
</button>

<!-- 暗色模式适配 -->
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
  自动适配暗色模式
</div>
\`\`\`

Tailwind 的核心理念是"原子化 CSS"，每个 class 只做一件事。`,
        codeBlocks: 1,
      },
    ];
  }

  // ========== Prisma / 数据库 ==========
  if (tag === "Prisma" || tag === "PostgreSQL" || tag === "MySQL" || tag === "MongoDB" || tag === "Redis") {
    return [
      {
        content: `Prisma ORM 常用查询技巧

Prisma 让数据库操作变得像写 JS 对象一样简单：

\`\`\`typescript
import { prisma } from "@/lib/prisma";

// 基础 CRUD
const user = await prisma.user.create({
  data: { username: "cathy", displayName: "Cathy" },
});

// 关联查询（include）
const posts = await prisma.post.findMany({
  where: { userId: user.id },
  include: {
    user: { select: { displayName: true, avatarUrl: true } },
    _count: { select: { likes: true, comments: true } },
  },
  orderBy: { createAt: "desc" },
  take: 20,
});

// 事务操作
const [post, notification] = await prisma.$transaction([
  prisma.post.create({ data: { content: "Hello", userId: "1" } }),
  prisma.notification.create({
    data: { type: "NEW_POST", userId: "2" },
  }),
]);

// 聚合查询
const stats = await prisma.post.aggregate({
  _count: true,
  _avg: { difficulty: true },
  where: { tags: { has: "JavaScript" } },
});
\`\`\`

Prisma 的类型提示是真的好用，查询结果自动推断类型。`,
        codeBlocks: 1,
      },
    ];
  }

  // ========== Git ==========
  if (tag === "Git") {
    return [
      {
        content: `Git 工作流和常用命令

不管是个人项目还是团队协作，Git 都是必备技能：

\`\`\`bash
# 日常工作流
git checkout -b feature/add-login   # 创建功能分支
git add .                            # 暂存修改
git commit -m "feat: 添加登录功能"    # 提交
git push origin feature/add-login    # 推送

# 同步远程
git fetch origin          # 获取远程更新
git rebase origin/main    # 变基到最新 main

# 撤销操作
git stash                 # 暂存当前修改
git stash pop             # 恢复暂存
git reset --soft HEAD~1   # 撤销上次提交（保留修改）
git checkout -- file.ts   # 丢弃文件修改

# 查看历史
git log --oneline --graph # 图形化日志
git blame file.ts         # 查看每行谁改的
git diff main..feature    # 对比分支差异
\`\`\`

提交信息规范：feat(新功能)、fix(修复)、docs(文档)、refactor(重构)。`,
        codeBlocks: 1,
      },
    ];
  }

  // ========== 通用默认模板 ==========
  const genericTemplates = [
    {
      content: `${tag} 学习笔记分享

最近在学习 ${tag}，记录一些心得体会。

${tag} 是一个非常${difficulty > 3 ? "有深度" : "实用"}的技术方向，适合${difficulty > 3 ? "有一定基础" : "入门"}的同学学习。

推荐学习路线：
1. 先看官方文档，了解基本概念
2. 跟着教程做一个小项目
3. 尝试在实际项目中应用
4. 阅读源码，深入理解原理

如果大家有相关问题，欢迎在评论区讨论！`,
      codeBlocks: 0,
    },
    {
      content: `我的 ${tag} 项目踩坑记录

在最近的项目中使用了 ${tag}，总结几个容易踩的坑：

1. 环境配置要仔细，版本兼容性很重要
2. 遇到问题先看官方文档，再搜 StackOverflow
3. 写好注释和文档，方便团队协作
4. 定期代码重构，保持代码质量
5. 一定要写测试，别等 bug 出了才后悔

最大的教训是：不要跳过文档直接上手写代码，磨刀不误砍柴工。

希望对大家有所帮助，少走弯路！`,
      codeBlocks: 0,
    },
    {
      content: `${tag} 面试常见问题总结

整理了 ${tag} 方向面试中经常被问到的问题：

1. ${tag} 的核心概念是什么？
2. 你在项目中是怎么使用 ${tag} 的？
3. ${tag} 有哪些优缺点？
4. 与同类技术相比，${tag} 的优势在哪？
5. 遇到过哪些问题，怎么解决的？

面试技巧：回答时结合实际项目经验，不要只背概念。能说出"我在 xx 项目中用 ${tag} 解决了 xx 问题"比背定义强 100 倍。`,
      codeBlocks: 0,
    },
  ];

  return genericTemplates;
}

// ==================== 评论模板 ====================
const COMMENT_TEMPLATES = [
  "写得很好，收藏了！",
  "正好在学这个，感谢分享",
  "请问这个方法在生产环境中性能怎么样？",
  "代码写得很清晰，新手友好！",
  "踩过同样的坑，感谢楼主总结。",
  "能出一个进阶版吗？想深入了解。",
  "这个方法我之前不知道，学到了！",
  "面试刚好被问到这个知识点，感谢！",
  "建议可以加上错误处理的部分。",
  "实际项目中用过，确实很好用。",
  "请问有配套的 GitHub 仓库吗？",
  "终于搞懂了！之前看了好几篇都没看明白。",
  "代码风格很规范，值得学习。",
  "楼主能详细说说这里的实现原理吗？",
  "分享给了同学，大家都觉得写得好！",
  "收藏 + 关注，期待更多分享！",
  "跟着代码敲了一遍，加深了理解。",
  "补充一点：还可以用 try-catch 包裹一下更安全。",
  "这个写法比我之前用的简洁多了。",
  "请问这个支持 TypeScript 吗？",
];

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

function randomProfile(): (typeof USER_PROFILES)[number] {
  const rand = Math.random();
  let cumulative = 0;
  for (const profile of USER_PROFILES) {
    cumulative += profile.weight;
    if (rand < cumulative) return profile;
  }
  return USER_PROFILES[0];
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

// ==================== 主生成逻辑 ====================

async function main() {
  console.log("🌱 开始生成推荐算法测试数据...\n");

  // ===== 1. 清除旧的 seed 数据 =====
  console.log("🗑️  清除旧数据...");
  await prisma.comment.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.like.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.bookmark.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.follow.deleteMany({ where: { follower: { email: { endsWith: "@example.com" } } } });
  await prisma.post.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@example.com" } } });
  console.log("  ✅ 旧数据已清除\n");

  // ===== 2. 生成用户 =====
  console.log(`📝 生成 ${CONFIG.userCount} 个模拟用户...`);

  interface UserData {
    id: string;
    username: string;
    displayName: string;
    email: string;
    passwordHash: string;
    avatarUrl: string | null;
    bio: string;
    skillLevel: number;
    interests: string[];
    createAt: Date;
  }

  const users: UserData[] = [];
  const usedUsernames = new Set<string>();

  for (let i = 0; i < CONFIG.userCount; i++) {
    const profile = randomProfile();
    const skillLevel = randomInt(1, 5);

    let username: string;
    do {
      username = `coder_${randomInt(10000, 99999)}`;
    } while (usedUsernames.has(username));
    usedUsernames.add(username);

    const surname = randomItem(SURNAMES);
    const givenName = randomItem(GIVEN_NAMES);

    const interestCount = randomInt(2, 5);
    const directionTags = randomItems(profile.tags, Math.ceil(interestCount * 0.7));
    const randomTags = randomItems(ALL_TAGS, Math.floor(interestCount * 0.3));
    const interests = [...new Set([...directionTags, ...randomTags])];

    users.push({
      id: generateId(),
      username,
      displayName: `${surname}${givenName}`,
      email: `${username}@example.com`,
      passwordHash: "$2a$10$fakehashforseeding" + i.toString().padStart(4, "0"),
      avatarUrl: null,
      bio: `${profile.direction}方向 | ${skillLevel > 3 ? "资深" : "成长中的"}开发者 | 热爱编程，热爱分享`,
      skillLevel,
      interests,
      createAt: randomDate(180),
    });
  }

  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log(`  ✅ ${users.length} 个用户已创建`);

  // ===== 3. 生成帖子 =====
  console.log(`\n📝 生成 ${CONFIG.postCount} 篇模拟帖子...`);

  interface PostData {
    id: string;
    content: string;
    userId: string;
    tags: string[];
    difficulty: number;
    codeBlocks: number;
    createAt: Date;
  }

  const posts: PostData[] = [];

  for (let i = 0; i < CONFIG.postCount; i++) {
    const author = randomItem(users);

    let postTags: string[];
    if (Math.random() < 0.7 && author.interests.length > 0) {
      const mainTag = randomItem(author.interests);
      const extraTags = randomItems(ALL_TAGS, randomInt(0, 2));
      postTags = [...new Set([mainTag, ...extraTags])];
    } else {
      postTags = randomItems(ALL_TAGS, randomInt(1, 3));
    }

    const baseDifficulty = author.skillLevel;
    const diffOffset = randomInt(-1, 1);
    const difficulty = Math.max(1, Math.min(5, baseDifficulty + diffOffset));

    const { content, codeBlocks } = generatePostContent(postTags, difficulty);

    posts.push({
      id: generateId(),
      content,
      userId: author.id,
      tags: postTags,
      difficulty,
      codeBlocks,
      createAt: randomDate(90),
    });
  }

  for (const post of posts) {
    await prisma.post.create({ data: post });
  }
  console.log(`  ✅ ${posts.length} 篇帖子已创建`);

  // ===== 4. 生成点赞 =====
  console.log(`\n📝 生成点赞数据...`);

  let likeCount = 0;
  const likeSet = new Set<string>();

  for (const user of users) {
    const numLikes = randomInt(CONFIG.likesPerUser.min, CONFIG.likesPerUser.max);
    const matchingPosts = posts.filter((p) => p.tags.some((t) => user.interests.includes(t)));
    const otherPosts = posts.filter((p) => !p.tags.some((t) => user.interests.includes(t)));

    for (let j = 0; j < numLikes; j++) {
      const targetPost =
        Math.random() < 0.7 && matchingPosts.length > 0
          ? randomItem(matchingPosts)
          : randomItem(otherPosts.length > 0 ? otherPosts : posts);

      const key = `${user.id}-${targetPost.id}`;
      if (likeSet.has(key) || targetPost.userId === user.id) continue;
      likeSet.add(key);

      await prisma.like.create({ data: { userId: user.id, postId: targetPost.id } });
      likeCount++;
    }
  }
  console.log(`  ✅ ${likeCount} 条点赞已创建`);

  // ===== 5. 生成收藏 =====
  console.log(`\n📝 生成收藏数据...`);

  let bookmarkCount = 0;
  const bookmarkSet = new Set<string>();

  for (const user of users) {
    const numBookmarks = randomInt(CONFIG.bookmarksPerUser.min, CONFIG.bookmarksPerUser.max);
    const goodPosts = posts.filter(
      (p) => p.codeBlocks > 0 && p.tags.some((t) => user.interests.includes(t))
    );

    for (let j = 0; j < numBookmarks; j++) {
      const targetPost =
        Math.random() < 0.8 && goodPosts.length > 0
          ? randomItem(goodPosts)
          : randomItem(posts);

      const key = `${user.id}-${targetPost.id}`;
      if (bookmarkSet.has(key) || targetPost.userId === user.id) continue;
      bookmarkSet.add(key);

      await prisma.bookmark.create({ data: { userId: user.id, postId: targetPost.id } });
      bookmarkCount++;
    }
  }
  console.log(`  ✅ ${bookmarkCount} 条收藏已创建`);

  // ===== 6. 生成评论 =====
  console.log(`\n📝 生成 ${CONFIG.commentsCount} 条评论...`);

  let commentCount = 0;
  for (let i = 0; i < CONFIG.commentsCount; i++) {
    const commenter = randomItem(users);
    const targetPost = randomItem(posts);
    if (commenter.id === targetPost.userId && Math.random() < 0.5) continue;

    const commentContent = randomItem(COMMENT_TEMPLATES);

    await prisma.comment.create({
      data: {
        content: commentContent,
        userId: commenter.id,
        postId: targetPost.id,
        createAt: new Date(targetPost.createAt.getTime() + randomInt(1, 72) * 60 * 60 * 1000),
      },
    });
    commentCount++;
  }
  console.log(`  ✅ ${commentCount} 条评论已创建`);

  // ===== 7. 生成关注关系 =====
  console.log(`\n📝 生成关注关系...`);

  let followCount = 0;
  const followSet = new Set<string>();

  for (const user of users) {
    const numFollows = randomInt(CONFIG.followsPerUser.min, CONFIG.followsPerUser.max);
    const sameInterestUsers = users.filter(
      (u) => u.id !== user.id && u.interests.some((t) => user.interests.includes(t))
    );

    for (let j = 0; j < numFollows; j++) {
      const target =
        Math.random() < 0.6 && sameInterestUsers.length > 0
          ? randomItem(sameInterestUsers)
          : randomItem(users);

      if (target.id === user.id) continue;
      const key = `${user.id}-${target.id}`;
      if (followSet.has(key)) continue;
      followSet.add(key);

      await prisma.follow.create({ data: { followerId: user.id, followingId: target.id } });
      followCount++;
    }
  }
  console.log(`  ✅ ${followCount} 条关注关系已创建`);

  // ===== 统计 =====
  console.log("\n" + "=".repeat(50));
  console.log("🎉 种子数据生成完成！统计：");
  console.log(`   👤 用户: ${users.length}`);
  console.log(`   📄 帖子: ${posts.length}`);
  console.log(`   ❤️  点赞: ${likeCount}`);
  console.log(`   🔖 收藏: ${bookmarkCount}`);
  console.log(`   💬 评论: ${commentCount}`);
  console.log(`   👥 关注: ${followCount}`);
  console.log("=".repeat(50));

  console.log("\n📊 数据分布（可用于论文图表）：");
  const skillDist = [1, 2, 3, 4, 5].map(
    (level) => `Lv${level}: ${users.filter((u) => u.skillLevel === level).length}人`
  );
  console.log(`   技能等级分布: ${skillDist.join(", ")}`);

  const diffDist = [1, 2, 3, 4, 5].map(
    (d) => `D${d}: ${posts.filter((p) => p.difficulty === d).length}篇`
  );
  console.log(`   帖子难度分布: ${diffDist.join(", ")}`);

  const topTags = ALL_TAGS.map((tag) => ({
    tag,
    count: posts.filter((p) => p.tags.includes(tag)).length,
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  console.log(`   热门标签 Top10:`);
  topTags.forEach((t, i) => console.log(`     ${i + 1}. ${t.tag}: ${t.count}篇`));
}

main()
  .catch((e) => {
    console.error("❌ 种子数据生成失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });