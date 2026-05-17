-- Migration 017: Announcements system

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'normal' CHECK (level IN ('normal', 'info', 'important')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published_created
ON public.announcements(created_at DESC) WHERE is_published = true;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published announcements"
ON public.announcements FOR SELECT TO authenticated
USING (is_published = true);

-- announcement_reads: per-user read status

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcement_reads_unique UNIQUE(user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
ON public.announcement_reads(user_id);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own read records"
ON public.announcement_reads FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read records"
ON public.announcement_reads FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own read records"
ON public.announcement_reads FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Seed initial announcements

INSERT INTO public.announcements (title, summary, content, level, created_at) VALUES
(
  '欢迎使用 Give a Chance!',
  '这是你的第一个公告，了解如何使用这个工具。',
  '欢迎来到 Give a Chance!

这里是你的个人知识管理空间。你可以通过截图、拖拽、粘贴等方式快速记录灵感和资料。

核心功能：
• 📸 截图整理 — 上传截图，AI 自动识别文字并生成摘要
• 📋 看板管理 — 拖拽卡片管理任务状态
• 📚 资料库 — 搜索和筛选所有卡片
• 🤖 AI 工作台 — 与 AI 对话，生成行动方案

开始使用：点击左侧「新建卡片」或直接粘贴截图试试吧！',
  'info',
  '2026-05-16 00:00:00+08'
),
(
  '小技巧：快速粘贴截图',
  '使用 Cmd+V / Ctrl+V 可以一键粘贴截图到卡片中。',
  '你知道吗？在新建卡片页面，你可以直接使用 Cmd+V（Mac）或 Ctrl+V（Windows）粘贴截图。

无需先保存文件，无需拖拽，只需：
1. 截图到剪贴板
2. 打开新建卡片页面
3. 按 Cmd+V / Ctrl+V

截图会自动出现在输入区域，点击「创建卡片」即可保存。简单快捷！

另外，你也可以拖拽图片文件到输入区域，或点击加号按钮选择文件上传。',
  'normal',
  '2026-05-16 00:00:00+08'
),
(
  '使用 AI 工作台处理复杂任务',
  '在 AI 工作台中，你可以与 AI 对话，获取针对当前卡片的行动建议。',
  'AI 工作台是处理复杂卡片的好帮手。

使用方法：
1. 打开任意卡片详情页
2. 点击「工作台」按钮
3. 在 AI 工作台中，AI 会读取卡片内容并给出建议
4. 你可以与 AI 对话，细化行动方案
5. 生成的方案可以保存并设为下一步行动

这使得处理长文截图、复杂资料变得非常高效。试试看吧！',
  'normal',
  '2026-05-15 00:00:00+08'
),
(
  '即将推出的功能',
  '展望未来，我们计划加入更多实用功能。',
  '以下是近期计划上线的功能：

📅 近期计划：
• 公告邮箱系统（就是你现在看到的功能！）
• 每日打卡增强 — 连续打卡统计和徽章
• 标签分组 — 更灵活的卡片组织方式
• 导出功能 — 将卡片导出为 Markdown 或 PDF

💡 远期愿景：
• 团队协作 — 共享卡片和看板
• 移动端适配 — 随时随地记录灵感
• API 开放 — 与其他工具集成

如果你有任何建议，欢迎在设置页面提交反馈！',
  'normal',
  '2026-05-15 00:00:00+08'
),
(
  '更新日志：分类系统重构',
  '卡片标签系统已统一为分类系统，支持多选筛选和看板拖拽。',
  '本次更新内容：

✨ 新增功能：
• 分类系统重构 — 统一的卡片分类管理
• 资料库多选筛选 — 可同时按多个分类筛选
• 看板拖拽 — 直接在看板中拖拽卡片改变状态
• 卡片详情 UI 优化 — 更清晰的布局和操作入口

🔧 改进：
• 性能优化 — 列表加载速度提升
• 视觉调整 — 米色/草青/棕色配色更加协调

如有疑问，请查看帮助文档或联系管理员。',
  'important',
  '2026-05-14 00:00:00+08'
);
