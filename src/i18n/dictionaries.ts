export type Locale = "zh-CN" | "en" | "ja"

export const locales: { value: Locale; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
]

export interface Dictionary {
  app: { title: string }
  nav: { home: string; inbox: string; board: string; library: string; newCard: string }
  home: {
    greeting: string; subtitle: string; inProgress: string; pending: string
    total: string; unfinishedTodos: string; boardView: string
    noUnfinished: string; createCard: string; organizeInbox: string; browseLibrary: string
  }
  inbox: { title: string; subtitle: string }
  board: { title: string; subtitle: string }
  library: {
    title: string; subtitle: string; searchPlaceholder: string
    loading: string; filterByType: string; filterByStatus: string
  }
  card: {
    unnamed: string; newTitle: string; newSubtitle: string; editTitle: string
    editSubtitle: string; notFound: string; back: string; edit: string
    delete: string; confirmDelete: string; deleted: string; deleteFailed: string
    saveFailed: string; saved: string; created: string; loading: string
    nextStep: string; ocrText: string; note: string; createdAt: string
    updatedAt: string; tags: string; summary: string; title: string
    action: string; type: string; status: string; uploadScreenshot: string
    ocrAiButton: string; processing: string; ocrDone: string; aiDone: string
    processFailed: string; ocrResult: string; tagPlaceholder: string
    addTag: string; create: string; update: string; cancel: string
    saving: string; uploadHint: string
  }
  upload: {
    click: string; drag: string; paste: string; formats: string
    reupload: string; uploading: string
  }
  boardColumn: { dragHere: string }
  status: {
    inbox: string; planned: string; doing: string; done: string; archived: string
  }
  type: { learn: string; todo: string; reference: string; idea: string }
  moveFailed: string
  noCards: string
  noCardsHint: string
}

export const zhCN = {
  app: { title: "截图整理工作台" },
  nav: {
    home: "首页",
    inbox: "收集箱",
    board: "看板",
    library: "资料库",
    newCard: "新建卡片",
  },
  home: {
    greeting: "你好",
    subtitle: "看看今天需要做什么",
    inProgress: "进行中",
    pending: "待整理",
    total: "全部卡片",
    unfinishedTodos: "想做但未完成",
    boardView: "看板视图",
    noUnfinished: "没有进行中的待办事项",
    createCard: "创建新卡片",
    organizeInbox: "整理收集箱",
    browseLibrary: "浏览资料库",
  },
  inbox: {
    title: "收集箱",
    subtitle: "待分类整理的卡片",
  },
  board: {
    title: "看板",
    subtitle: "拖拽卡片更改状态",
  },
  library: {
    title: "资料库",
    subtitle: "搜索和筛选所有卡片",
    searchPlaceholder: "搜索标题、摘要、标签...",
    loading: "加载中...",
    filterByType: "分类",
    filterByStatus: "状态",
  },
  card: {
    unnamed: "未命名卡片",
    newTitle: "新建卡片",
    newSubtitle: "上传截图或手动填写信息",
    editTitle: "编辑卡片",
    editSubtitle: "修改卡片信息",
    notFound: "卡片不存在",
    back: "返回",
    edit: "编辑",
    delete: "删除",
    confirmDelete: "确定要删除这张卡片吗？",
    deleted: "已删除",
    deleteFailed: "删除失败",
    saveFailed: "保存失败",
    saved: "卡片已更新",
    created: "卡片已创建",
    loading: "加载中...",
    nextStep: "下一步",
    ocrText: "OCR 识别文字",
    note: "笔记",
    createdAt: "创建时间",
    updatedAt: "更新时间",
    tags: "标签",
    summary: "摘要",
    title: "标题",
    action: "下一步行动",
    type: "分类",
    status: "状态",
    uploadScreenshot: "截图上传",
    ocrAiButton: "OCR + AI 识别",
    processing: "处理中...",
    ocrDone: "OCR 识别完成",
    aiDone: "AI 分析完成",
    processFailed: "处理失败，请稍后重试",
    ocrResult: "OCR 识别结果",
    tagPlaceholder: "输入标签后回车",
    addTag: "添加",
    create: "创建卡片",
    update: "更新卡片",
    cancel: "取消",
    saving: "保存中...",
    uploadHint: "截图已上传，点击「OCR + AI 识别」自动提取信息",
  },
  upload: {
    click: "点击上传",
    drag: "拖拽上传",
    paste: "粘贴上传",
    formats: "支持 PNG、JPG、WebP 格式",
    reupload: "点击重新上传",
    uploading: "上传中...",
  },
  boardColumn: {
    dragHere: "拖拽卡片到此处",
  },
  status: {
    inbox: "收集箱",
    planned: "计划中",
    doing: "进行中",
    done: "已完成",
    archived: "已归档",
  },
  type: {
    learn: "想学",
    todo: "想做",
    reference: "资料",
    idea: "灵感",
  },
  moveFailed: "移动失败",
  noCards: "暂无卡片",
  noCardsHint: "上传截图或创建新卡片开始整理",
} as const

export const en: Dictionary = {
  app: { title: "Screenshot Workbench" },
  nav: {
    home: "Home",
    inbox: "Inbox",
    board: "Board",
    library: "Library",
    newCard: "New Card",
  },
  home: {
    greeting: "Hello",
    subtitle: "See what needs to be done today",
    inProgress: "In Progress",
    pending: "Pending",
    total: "Total Cards",
    unfinishedTodos: "Unfinished Todos",
    boardView: "Board View",
    noUnfinished: "No todos in progress",
    createCard: "Create Card",
    organizeInbox: "Organize Inbox",
    browseLibrary: "Browse Library",
  },
  inbox: {
    title: "Inbox",
    subtitle: "Cards to be organized",
  },
  board: {
    title: "Board",
    subtitle: "Drag cards to change status",
  },
  library: {
    title: "Library",
    subtitle: "Search and filter all cards",
    searchPlaceholder: "Search title, summary, tags...",
    loading: "Loading...",
    filterByType: "Type",
    filterByStatus: "Status",
  },
  card: {
    unnamed: "Untitled Card",
    newTitle: "New Card",
    newSubtitle: "Upload a screenshot or fill in manually",
    editTitle: "Edit Card",
    editSubtitle: "Modify card information",
    notFound: "Card not found",
    back: "Back",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this card?",
    deleted: "Deleted",
    deleteFailed: "Delete failed",
    saveFailed: "Save failed",
    saved: "Card updated",
    created: "Card created",
    loading: "Loading...",
    nextStep: "Next",
    ocrText: "OCR Text",
    note: "Note",
    createdAt: "Created",
    updatedAt: "Updated",
    tags: "Tags",
    summary: "Summary",
    title: "Title",
    action: "Next Action",
    type: "Type",
    status: "Status",
    uploadScreenshot: "Screenshot Upload",
    ocrAiButton: "OCR + AI Analyze",
    processing: "Processing...",
    ocrDone: "OCR completed",
    aiDone: "AI analysis completed",
    processFailed: "Processing failed, please retry",
    ocrResult: "OCR Result",
    tagPlaceholder: "Type tag and press Enter",
    addTag: "Add",
    create: "Create Card",
    update: "Update Card",
    cancel: "Cancel",
    saving: "Saving...",
    uploadHint: "Screenshot uploaded, click 'OCR + AI Analyze' to extract info",
  },
  upload: {
    click: "Click to Upload",
    drag: "Drag & Drop",
    paste: "Paste to Upload",
    formats: "Supports PNG, JPG, WebP",
    reupload: "Click to Re-upload",
    uploading: "Uploading...",
  },
  boardColumn: {
    dragHere: "Drag cards here",
  },
  status: {
    inbox: "Inbox",
    planned: "Planned",
    doing: "Doing",
    done: "Done",
    archived: "Archived",
  },
  type: {
    learn: "Learn",
    todo: "Todo",
    reference: "Reference",
    idea: "Idea",
  },
  moveFailed: "Move failed",
  noCards: "No cards yet",
  noCardsHint: "Upload a screenshot or create a new card",
} as const

export const ja: Dictionary = {
  app: { title: "スクリーンショット整理" },
  nav: {
    home: "ホーム",
    inbox: "受信箱",
    board: "ボード",
    library: "ライブラリ",
    newCard: "新規カード",
  },
  home: {
    greeting: "こんにちは",
    subtitle: "今日やることを確認しましょう",
    inProgress: "進行中",
    pending: "未整理",
    total: "全カード",
    unfinishedTodos: "未完了のTODO",
    boardView: "ボード表示",
    noUnfinished: "進行中のTODOはありません",
    createCard: "カードを作成",
    organizeInbox: "受信箱を整理",
    browseLibrary: "ライブラリを閲覧",
  },
  inbox: {
    title: "受信箱",
    subtitle: "整理待ちのカード",
  },
  board: {
    title: "ボード",
    subtitle: "カードをドラッグしてステータス変更",
  },
  library: {
    title: "ライブラリ",
    subtitle: "すべてのカードを検索・絞り込み",
    searchPlaceholder: "タイトル、概要、タグを検索...",
    loading: "読み込み中...",
    filterByType: "種類",
    filterByStatus: "ステータス",
  },
  card: {
    unnamed: "無題のカード",
    newTitle: "新規カード",
    newSubtitle: "スクリーンショットをアップロードするか手動で入力",
    editTitle: "カード編集",
    editSubtitle: "カード情報を変更",
    notFound: "カードが見つかりません",
    back: "戻る",
    edit: "編集",
    delete: "削除",
    confirmDelete: "このカードを削除してもよろしいですか？",
    deleted: "削除しました",
    deleteFailed: "削除に失敗しました",
    saveFailed: "保存に失敗しました",
    saved: "カードを更新しました",
    created: "カードを作成しました",
    loading: "読み込み中...",
    nextStep: "次へ",
    ocrText: "OCRテキスト",
    note: "メモ",
    createdAt: "作成日時",
    updatedAt: "更新日時",
    tags: "タグ",
    summary: "概要",
    title: "タイトル",
    action: "次のアクション",
    type: "種類",
    status: "ステータス",
    uploadScreenshot: "スクリーンショット",
    ocrAiButton: "OCR + AI 分析",
    processing: "処理中...",
    ocrDone: "OCRが完了しました",
    aiDone: "AI分析が完了しました",
    processFailed: "処理に失敗しました。再試行してください",
    ocrResult: "OCR結果",
    tagPlaceholder: "タグを入力してEnter",
    addTag: "追加",
    create: "カード作成",
    update: "カード更新",
    cancel: "キャンセル",
    saving: "保存中...",
    uploadHint: "スクリーンショットがアップロードされました。「OCR + AI 分析」をクリックして情報を抽出",
  },
  upload: {
    click: "クリックでアップロード",
    drag: "ドラッグ＆ドロップ",
    paste: "貼り付け",
    formats: "PNG、JPG、WebP対応",
    reupload: "クリックで再アップロード",
    uploading: "アップロード中...",
  },
  boardColumn: {
    dragHere: "カードをここにドラッグ",
  },
  status: {
    inbox: "受信箱",
    planned: "計画中",
    doing: "進行中",
    done: "完了",
    archived: "アーカイブ",
  },
  type: {
    learn: "学習",
    todo: "TODO",
    reference: "参考",
    idea: "アイデア",
  },
  moveFailed: "移動に失敗しました",
  noCards: "カードがありません",
  noCardsHint: "スクリーンショットをアップロードするか、新規カードを作成してください",
} as const

export const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  en,
  ja,
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? zhCN
}
