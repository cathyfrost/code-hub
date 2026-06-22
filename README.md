# CodeHub

> 面向程序员的一站式技术社区平台 —— 集成 **AI 助手、代码执行、编程竞赛、智能推荐、问答悬赏、笔记系统** 等功能。

基于 **Next.js 15 (App Router)** + **React 19** + **Prisma + PostgreSQL** 构建，配套 Python **FastAPI 机器学习服务**实现智能标签推荐。

---

## 目录

- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [数据库初始化](#数据库初始化)
- [启动 ML 服务](#启动-ml-服务)
- [常用脚本](#常用脚本)
- [部署](#部署)
- [License](#license)

---

## 核心功能

| 模块 | 说明 |
| --- | --- |
| 信息流 | 三栏 Tab：**推荐 / 关注 / 智能流（多因子推荐）** |
| 帖子系统 | TipTap 富文本编辑器、图片上传、代码块、行级注释 |
| 问答悬赏 | 提问 + 积分悬赏 + 最佳答案接纳 + 通知联动 |
| 编程题库 | 多语言题目、测试用例、提交判分（Judge0） |
| 编程竞赛 | 限时竞赛、多题分值、实时排行榜、**1v1 实时对战** |
| 代码运行器 | Monaco Editor + Judge0 在线编译运行多种语言 |
| AI 助手 | Claude / Doubao API 多轮对话、代码分析与生成 |
| 笔记系统 | Markdown 笔记、文件夹分类、标签、Pin 功能 |
| 实时消息 | 基于 Stream Chat 的私信、群聊、代码片段分享 |
| 通知中心 | 点赞 / 评论 / 关注 / 悬赏采纳事件提醒 |
| 智能标签 | Python ML 服务：垃圾过滤分类器 + TF-IDF + SVD 降维 + KMeans 聚类 + 同义词映射自动打标 |
| 用户体系 | Lucia Auth + Google OAuth + 技能等级 LV1~LV5 + 积分签到 |
| 管理后台 | 用户 / 帖子 / 评论 / 竞赛管理（仅 ADMIN） |

---

## 技术栈

**Web 应用**

- [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) (RC)
- [TypeScript](https://www.typescriptlang.org/) + [TailwindCSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- [Prisma 5](https://www.prisma.io/) + PostgreSQL
- [Lucia Auth 3](https://lucia-auth.com/) + Argon2 + Google OAuth (Arctic)
- [TanStack Query](https://tanstack.com/query) + [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- [TipTap](https://tiptap.dev/) (富文本) + [Monaco Editor](https://microsoft.github.io/monaco-editor/) (代码编辑)
- [Stream Chat](https://getstream.io/chat/) + [UploadThing](https://uploadthing.com/) + [Recharts](https://recharts.org/)

**ML 微服务**

- [FastAPI](https://fastapi.tiangolo.com/) + scikit-learn (TF-IDF / 分类器 / SVD / KMeans) + joblib

**外部服务**

- [Judge0](https://judge0.com/) —— 代码沙箱执行
- [Neon](https://neon.tech/) —— 托管 PostgreSQL（也可用本地 PG）

---

## 项目结构

```
code-hub/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # 登录 / 注册 / Google OAuth
│   │   ├── (main)/           # 主应用：首页、问答、竞赛、笔记、AI 等
│   │   └── api/              # 60+ REST API 路由
│   ├── components/           # 通用组件（ui/、posts/、comments/、…）
│   ├── hooks/                # 自定义 Hook
│   ├── lib/                  # prisma、recommendation、validation、utils
│   └── auth.ts               # Lucia 认证主入口
├── prisma/
│   └── schema.prisma         # 20+ 数据模型
├── ml-service/               # Python 智能标签服务
│   ├── main.py               # FastAPI 入口
│   ├── training_v2/          # 模型训练流水线（编号脚本 + run_all.sh）
│   ├── models/               # 已训练模型文件（pkl）
│   └── requirements.txt
├── scripts/                  # 数据库种子 / 维护脚本（tsx 执行）
│   ├── seed-quiz.ts
│   ├── seed-contest.ts
│   ├── seed-recommendation.ts
│   ├── set-admin.ts
│   └── update-skill-levels.ts
├── public/                   # 静态资源
├── docker-compose.yml
└── next.config.ts
```

详细目录与算法说明见 [src/lib/recommendation.ts](src/lib/recommendation.ts)（多因子推荐：协同过滤 + 内容相似度 + 技能匹配 + 质量评分）。

---

## 快速开始

### 环境要求

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14（或使用 Neon 云数据库）
- **Python** ≥ 3.10（仅启动 ML 服务时需要）
- **Judge0** 实例（用于代码运行；可使用公开 Judge0 节点）

### 1. 克隆并安装依赖

```bash
git clone <repository-url> code-hub
cd code-hub
npm install
```

### 2. 配置环境变量

在项目根目录创建 [.env](.env) 文件，参考下方 [环境变量](#环境变量) 章节。

### 3. 初始化数据库

```bash
npx prisma generate          # 生成 Prisma Client
npx prisma db push           # 同步 schema 到数据库
```

### 4. （可选）灌入示例数据

```bash
npx tsx scripts/seed-quiz.ts            # 种子题库
npx tsx scripts/seed-contest.ts         # 种子竞赛
npx tsx scripts/seed-recommendation.ts  # 推荐冷启动数据
npx tsx scripts/set-admin.ts <username> # 将指定用户设为管理员
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

> 智能推荐 / 自动标签功能依赖 ML 服务，请额外参考 [启动 ML 服务](#启动-ml-服务)。

---

## 环境变量

复制以下模板到项目根目录的 `.env`，并替换为你自己的密钥：

```env
# ── 数据库 ──────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"

# ── 文件上传（UploadThing）──────────────────────
UPLOADTHING_TOKEN="your-uploadthing-token"

# ── AI 服务（豆包 / Claude）─────────────────────
DOUBAO_API_KEY="your-doubao-or-anthropic-api-key"

# ── 代码执行（Judge0）───────────────────────────
JUDGE0_URL="http://your-judge0-host:2358"

# ── 实时消息（Stream Chat）──────────────────────
NEXT_PUBLIC_STREAM_KEY="your-stream-public-key"
STREAM_SECRET="your-stream-secret"

# ── Google OAuth ────────────────────────────────
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# ── 应用配置 ────────────────────────────────────
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
CRON_SECRET="any-random-string"

# ── ML 微服务 ───────────────────────────────────
ML_SERVICE_URL="http://localhost:8000"     # 本地开发
# ML_SERVICE_URL="http://ml-service:8000"  # Docker 部署
```

> ⚠️ **不要提交 `.env` 到仓库**。请确认它已被 `.gitignore` 忽略。

---

## 数据库初始化

```bash
# 修改 prisma/schema.prisma 后重新生成
npx prisma generate

# 推送 schema 到数据库（开发环境推荐）
npx prisma db push

# 或使用迁移工作流
npx prisma migrate dev --name init

# 可视化查看数据
npx prisma studio
```

主要表：`User`、`Post`、`Comment`、`InlineComment`、`Like`、`Bookmark`、`Follow`、`Quiz`、`QuizSubmission`、`Contest`、`Challenge`、`Notification`、`Notebook`、`AiConversation`、`PointTransaction`、`Tag` 等共 20+ 张。

---

## 启动 ML 服务

ML 服务负责自动给帖子打技术标签，主应用通过 `ML_SERVICE_URL` 调用。

```bash
cd ml-service

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动 FastAPI 服务（默认端口 8000）
uvicorn main:app --reload --port 8000
```

访问 `http://localhost:8000/docs` 查看交互式 API 文档。

如需重新训练模型，训练流水线在 `training_v2/`（预处理 → 垃圾/技术二分类 → SVD 降维 + KMeans 聚类 → 评估）：

```bash
# 在 ml-service 目录下，一键跑完整流水线
bash training_v2/run_all.sh

# 或按编号单步执行
python training_v2/02_preprocess.py              # 预处理
python training_v2/03_train_junk_classifier.py   # 垃圾过滤分类器（NB / LogReg / LinearSVC 选最优）
python training_v2/04_train_kmeans.py            # 仅技术帖 TF-IDF + SVD + KMeans 聚类
python training_v2/05_evaluate.py               # 端到端评估 + 图表
```

---

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（热重载） |
| `npm run build` | `prisma generate` + Next.js 生产构建 |
| `npm run start` | 启动生产服务（先 build） |
| `npm run lint` | ESLint 检查 |
| `npx prisma studio` | 打开数据库可视化界面 |
| `npx tsx scripts/cleanup.ts` | 清理过期数据 |
| `npx tsx scripts/cleanup-stream-chats.ts` | 清理 Stream Chat 频道 |
| `npx tsx scripts/update-skill-levels.ts` | 重新计算用户技能等级 |
| `npx tsx scripts/analyze-recommendation.ts` | 分析推荐系统效果 |

---

## 部署

### Vercel（推荐用于 Next.js 端）

1. 将仓库推送到 GitHub。
2. 在 Vercel 导入项目。
3. 在 **Project Settings → Environment Variables** 中配置全部环境变量。
4. ML 服务建议单独部署到支持 Python 的平台（Render、Fly.io、自建 Docker 主机）。

### Docker Compose

仓库根目录提供了 [docker-compose.yml](docker-compose.yml)，可一并启动 web + ml-service。注意此时需将 `ML_SERVICE_URL` 改为 `http://ml-service:8000`。

```bash
docker compose up -d
```

### 自托管 Judge0

代码运行依赖 Judge0。可参考 [Judge0 官方文档](https://github.com/judge0/judge0) 自建实例，将地址写入 `JUDGE0_URL`。

---

## License

本项目仅供学习与交流使用。
