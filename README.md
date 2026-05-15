# Give a Chance! — 截图整理工作台

AI 驱动的个人截图管理与知识整理工具。将截图转化为可管理的卡片，支持标签分类、看板拖拽、每日打卡、个性化设置。

## 技术栈

- **前端框架**: Next.js 16 + TypeScript + React 19
- **样式**: Tailwind CSS 4 + shadcn/ui
- **后端服务**: Supabase（Auth、Database、Storage）
- **拖拽**: @dnd-kit
- **图标**: Lucide React

## 功能总览

### 核心功能
- **截图上传**: 点击/拖拽/粘贴上传，支持多图（最多 9 张），客户端压缩
- **OCR + AI 识别**: 图片识别文字后自动生成标题、摘要、标签（mock 接口，预留真实接入）
- **卡片管理**: 创建/编辑/删除/查看，支持富文本笔记
- **标签系统**: 统一标签分类，无标签卡片进入收集箱

### 多用户与安全
- **Supabase Auth**: 邮箱密码注册/登录，OTP 验证码验证
- **数据隔离**: cards 表 RLS + Storage 用户目录隔离
- **API 鉴权**: Bearer Token + `auth.uid()` 策略

### 核心页面
| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | `/` | 统计面板 + 未完成待办列表 |
| 收集箱 | `/inbox` | 无标签卡片，支持批量分类 |
| 看板 | `/board` | 拖拽卡片切换状态（收集箱→计划中→进行中→已完成→已归档） |
| 资料库 | `/library` | 搜索 + 标签筛选 + 状态筛选 |
| 卡片详情 | `/cards/[id]` | 查看/编辑/删除，标签编辑，多图展示 |
| 新建卡片 | `/cards/new` | 多图上传，标签选择，OCR+AI |

### 用户功能
- **个人设置** `/settings/profile`: 昵称、头像上传、个性签名（40 字符 + 字体/加粗/斜体 + emoji/颜文字选择器）
- **应用设置** `/settings/app`: 4 种背景主题（浅色/深色/草青色/棕色）+ 4 种字体 + 数据清理
- **每日打卡**: 随机金句（古诗文/编程/英语谚语，105 条）+ 签到日历 + 当日任务回顾
- **多语言**: 简体中文 / English / 日本語

## 项目结构

```
src/
├── app/                        # Next.js App Router 页面
│   ├── layout.tsx              # 根布局（I18n + Auth Provider）
│   ├── page.tsx                # 首页
│   ├── auth/                   # 登录/注册
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── inbox/page.tsx          # 收集箱（批量分类）
│   ├── board/page.tsx          # 看板
│   ├── library/page.tsx        # 资料库（搜索筛选）
│   ├── cards/                  # 卡片
│   │   ├── new/page.tsx        # 新建
│   │   └── [id]/page.tsx       # 详情（编辑/删除）
│   ├── settings/               # 设置
│   │   ├── profile/page.tsx    # 个人资料
│   │   └── app/page.tsx        # 应用设置
│   └── api/                    # API 路由
│       ├── cards/              # 卡片 CRUD + 批量分类
│       ├── upload/             # 图片上传
│       ├── ocr/                # OCR（mock）
│       └── ai/summarize/       # AI 摘要（mock）
├── components/                 # React 组件
│   ├── layout/                 # 布局（Sidebar、MainLayout、ProtectedPage）
│   ├── auth/                   # AuthProvider
│   ├── cards/                  # CardItem、CardGrid、CardForm
│   ├── board/                  # KanbanBoard、KanbanColumn、KanbanCard
│   ├── checkin/                # 每日打卡按钮、日历、Toast
│   ├── library/                # SearchBar、FilterPanel
│   ├── settings/               # 表情选择器
│   └── upload/                 # ImageUpload（多图）
├── lib/                        # 工具库
│   ├── supabase.ts             # 服务端 Supabase client
│   ├── supabase-browser.ts     # 浏览器 Supabase client（单例）
│   ├── supabase-store.ts       # Supabase CRUD
│   ├── data-store.ts           # 本地文件 fallback
│   ├── auth.ts                 # API 鉴权
│   ├── api-client.ts           # authFetch（自动带 token）
│   └── date.ts                 # 日期工具
├── types/card.ts               # Card 类型定义
├── data/                       # 静态数据
│   ├── daily-quotes.ts         # 每日金句（105 条）
│   ├── card-labels.ts          # 标签列表
│   └── signature-expressions.ts# emoji + 颜文字
├── i18n/dictionaries.ts        # 三语翻译
└── middleware.ts                # 路由中间件
supabase/migrations/            # 数据库迁移 SQL
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Supabase

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 初始化数据库

在 Supabase SQL Editor 中按顺序执行 `supabase/migrations/` 下的 SQL 文件。

在 Supabase Dashboard 创建 Storage buckets：
- `screenshots`（不勾选 Public）
- `avatars`（不勾选 Public）

在 Supabase Dashboard 启用 Email Auth Provider。

### 4. 配置邮件模板

Supabase → Authentication → Email Templates → Confirm signup：

```html
<h2><strong><em>Give a chance!</em></strong> - 邮箱验证</h2>
<p>你的验证码是：</p>
<h1>{{ .Token }}</h1>
<p>该验证码短时间内有效，请勿泄露给他人。</p>
```

### 5. 启动

```bash
npm run dev
```

打开 http://localhost:3000

## 关键技术决策

- **图片上传**: 浏览器直传 Supabase Storage（不经 Next.js API 中转），客户端压缩为 JPEG
- **API 鉴权**: Bearer Token 从 Authorization header 提取，API 服务端调用 `supabase.auth.getUser(token)` 验证
- **RLS**: 所有 cards 操作通过 `auth.uid() = user_id` 策略保护
- **跨页同步**: `cards-updated` 自定义事件通知各页面刷新
- **标签系统**: `label` 字段，空标签进入收集箱
- **主题系统**: CSS 变量覆盖 `--background`/`--foreground`，4 主题 + 4 字体

## Mock 服务

OCR 和 AI 接口当前为 mock 实现（`src/services/ocr.ts`、`src/services/ai.ts`）。预留了 PaddleOCR 和 DeepSeek 真实接入的接口签名，切换时只需替换实现类。
