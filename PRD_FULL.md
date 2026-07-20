# ChatStory 应用PRD文档

## 一、产品概述

ChatStory 是一款AI辅助写作工具，集成了对话式AI聊天、书籍工程管理、作家分析（低级/高级）、长期记忆、世界观数据管理等功能。支持多模型API切换，数据云端同步。

## 二、技术架构

### 2.1 前端
- 单页应用（SPA），纯HTML/CSS/JavaScript
- 无前端框架，原生DOM操作
- Markdown渲染：marked.js + highlight.js
- 本地存储：localStorage + SQLite数据库
- 深色/浅色主题切换

### 2.2 后端
- Node.js HTTP服务器
- SQLite数据库（sql.js WASM）
- 密码保护登录（硬编码密码：chatstory888）
- 会话管理：Cookie-based
- 云端同步：Gitee/GitHub API

### 2.3 数据存储
- 双重存储：localStorage + 服务端SQLite
- 数据同步：localStorage -> 服务端（500ms防抖）
- 云端同步：服务端 -> Gitee/GitHub仓库
- 数据库文件：chatstory.db

## 三、核心功能模块

### A. 登录系统
**UI**: 居中卡片式密码输入框
**逻辑**:
- 页面加载时检查会话Cookie
- 未登录则显示密码输入页面
- 提交密码到 /login POST表单
- 密码验证通过则设置会话Cookie并重定向到首页
- 密码错误则重定向到 /?e=1

### B. 对话系统

#### B.1 对话列表（左侧边栏）
**UI**: 可折叠区域"💬 对话"
**控件**:
- 对话项：点击切换对话，显示标题
- 保存按钮：📚 保存当前对话到书籍工程
- 删除按钮：✕ 删除对话
- 新对话按钮：＋ 新对话
**逻辑**:
- 对话按创建时间倒序排列
- 右键对话项弹出上下文菜单
- 上下文菜单项：标记到低级作家、标记到高级作家、复制、全选、添加至长期记忆

#### B.2 对话聊天区域
**UI**: 消息列表（气泡式）+ 输入区域
**控件**:
- 消息气泡：用户消息（右对齐）、AI回复（左对齐）
- 消息操作：🧠 添加至长期记忆、✏️ 编辑、📋 复制、↩️ 重做、🔄 版本切换、🗑️ 删除
- 输入框：多行文本框，支持Ctrl+Enter发送
- 发送按钮：含加载中状态
- 模型选择下拉框：顶部显示当前模型名
- 附件上传按钮：📎

**逻辑**:
- 消息流式渲染（SSE格式）
- 消息版本管理（prevVer/nextVer/redoMsg）
- 输入框自动调整高度
- 发送时禁用按钮，显示加载动画
- 流式响应中止支持（stopStream）
- 对话标题自动生成（取第一条消息前50字符）

### C. 快捷提示词系统

**UI**: 可折叠区域"💡 快捷提示词"
**控件**:
- 提示词列表：标题+内容，点击发送到输入框
- 新建表单：标题（可选）+ 内容输入
- 新建/保存按钮：＋ 新建并保存
- 取消编辑按钮：✕ 取消
- 编辑提示词：点击列表项进入编辑模式
- 删除提示词：✕ 按钮

**逻辑**:
- 提示词保存在 st.qps 数组
- 点击提示词列表项：填充内容到输入框（useQP）
- 点击提示词列表项右键：发送到对话（sendQP）
- 编辑模式：原新建按钮变为保存按钮

### D. 书籍工程系统

#### D.1 工程列表
**UI**: 可折叠区域"📁 书籍工程"
**控件**:
- 新建工程按钮：＋ 新建书籍工程
- 工程列表：每个工程为可展开项
- 工程头部：📁 工程名 + 各子模块数量徽标 + ✏️ 重命名 + ✕ 删除
- 展开/折叠：▶/▼ 箭头

**逻辑**:
- 工程数据保存在 st.projects 数组
- 每个工程包含：id, name, rvEntries[], rvReasons[], gvEntries[], gvReasons[], memories[], lorebooks[], lorebook, conversations[]
- 展开状态通过 st.expandedProjects 数组跟踪
- 展开后显示子模块列表

#### D.2 工程子模块
每个展开的工程显示以下子模块：

**💬 历史对话**
- 显示已保存到该工程的对话列表
- 点击对话加载其副本到当前对话
- ✕ 删除已保存的对话

**✍️ 低级作家**
- 记录列表：编号 + 文本 + ✕ 删除
- ＋ 新增分析按钮：打开作家分析弹窗
- 右键选中文本 → "标记到低级作家" → 打开作家分析弹窗

**🏆 高级作家**
- 同低级作家，数据独立存储

**🧠 长期记忆**
- 记忆项目列表：可展开/折叠
- 每个记忆项目显示名称 + 条目数
- 添加记忆条目
- 删除记忆条目
- 新建记忆项目按钮

**🌍 世界观数据**
- 压缩上下文按钮
- 编辑Prompt按钮
- 打开提取列表按钮
- 已保存的世界观数据列表

#### D.3 新建工程弹窗
**UI**: 模态弹窗
**控件**: 名称输入框 + 创建/取消按钮
**逻辑**: 按Enter键或点击创建按钮提交

### E. 作家分析系统

#### E.1 作家分析弹窗（Writer Modal）
**UI**: 全屏模态弹窗，紧凑布局
**控件**:
- 标题：✍️ 低级作家 / 🏆 高级作家 · 分析并保存
- 选择书籍工程下拉框
- 选择原因标签（多选下拉框）
- 输入原因文本框 + 添加按钮
- 当前描写文本域
- 前文/后文文本域
- AI分析结果文本域（只读）
- 记录并分析按钮（保存时调用AI分析）
- 正Prompt/负Prompt按钮（复制到剪贴板）
- 关闭按钮

**逻辑**:
- 右键标记文本：自动填充"当前描写"字段
- 自动获取前文/后文上下文
- 选择原因标签（支持多选）+ 手动输入新原因
- 原因标签按工程隔离存储（project.rvReasons / project.gvReasons）
- AI分析请求：POST到配置的API端点
- 分析结果保存到对应工程的 rvEntries / gvEntries 数组
- 记录编号自动递增（按工程）

#### E.2 右键上下文菜单
**触发**: 选中文本后右键
**菜单项**:
- 🏴 标记到低级作家 → 打开作家分析弹窗（review模式）
- 🏆 标记到高级作家 → 打开作家分析弹窗（good模式）
- 分隔线
- 📋 复制
- 📄 全选
- 分隔线
- 🧠 添加至长期记忆 → 子菜单显示工程列表

**逻辑**:
- 选中文本通过 window.getSelection() 获取
- 子菜单渲染：enderCtxSub() 显示所有工程的记忆项目
- 点击记忆项目：ddToMem(memId) 将选中文本添加到记忆

### F. 长期记忆系统

**UI**: 可折叠区域"🧠 长期记忆"
**控件**:
- 记忆项目列表（可展开/折叠）
- 每个项目：📁 名称 + 条目数 + ✕ 删除
- 添加条目：输入框 + 按钮
- 删除条目：✕ 按钮
- 新建记忆项目：输入框 + 按钮

**逻辑**:
- 记忆数据保存在 st.memories 数组（全局，或按工程）
- 每个记忆项目包含：id, name, items[]
- 每个条目包含：id, content, date
- 右键文本 → "添加至长期记忆" → 选择或新建记忆项目

### G. 模型设置与API配置

**UI**: 设置弹窗（⚙️ 设置）
**控件**:
- 提供商选择下拉框（预设列表 + 自定义）
- 自定义URL输入框（当选择"自定义"时显示）
- API Key输入框
- 模型名称输入框
- 获取模型列表按钮（自动获取可用模型）
- 模型列表选择下拉框
- 最大Token数输入框 + 无限制复选框
- 温度滑块
- 系统提示词文本域
- Gitee/GitHub配置（Token + 仓库 + 分支）
- 保存/取消按钮

**预设提供商**:
- OpenAI, DeepSeek, Moonshot, Ollama, OpenRouter, Anthropic, 智谱AI, 阿里云, SiliconFlow, Together, Groq, Google Gemini, Mistral

### H. 备份与同步系统

**UI**: 可折叠区域"💾 备份"
**控件**:
- 导出数据按钮（JSON文件下载）
- 导入数据按钮（JSON文件上传）
- 上传到Gitee按钮
- 从Gitee下载按钮
- 上传到GitHub按钮
- 从GitHub下载按钮
- 进度显示弹窗

**API端点**:
- /api/sync/upload - POST 上传数据库到Gitee
- /api/sync/download - POST 从Gitee下载数据库
- /api/github/push - POST 上传到GitHub
- /api/data/download - GET 从GitHub下载
- /api/data/export - POST 导出JSON
- /api/data/import - POST 导入JSON

### I. 世界观数据系统

**UI**: 可折叠区域"🌍 世界观数据"
**控件**:
- 压缩上下文按钮
- 编辑Prompt按钮（打开Prompt编辑器）
- 打开提取列表按钮
- 已保存的世界观数据列表
- 每条数据：名称 + 时间 + 统计信息（角色/场景/情节/规则卡片数）
- ✕ 删除按钮

**逻辑**:
- 数据保存在 st.lorebooks 数组（或按工程）
- 每条包含：id, name, timestamp, data（characters/settings/plotPoints/worldRules）, stats

### J. 导出/导入功能
- 导出：JSON格式，包含所有数据
- 导入：从JSON文件恢复数据
- 导出对话：可选择导出哪些对话
- 备份对话弹窗：复选框选择对话 + 全选/取消全选

## 四、数据模型

### 4.1 全局状态对象（st）
`javascript
{
  version: Number,
  convs: [
    {
      id: String,
      title: String,
      msgs: [
        {
          role: 'user'|'assistant'|'system',
          content: String|Array,
          versions: [{ content: String, ts: Number }],
          vIdx: Number
        }
      ],
      createdAt: Number,
      model: String,
      sourceProjectId: String,
      sourceConversationId: String
    }
  ],
  activeCid: String|null,
  settings: {
    apiBaseUrl: String,
    apiKey: String,
    modelName: String,
    maxTokens: Number,
    maxUnlimited: Boolean,
    temperature: Number,
    systemPrompt: String,
    availModels: [String],
    giteeToken: String,
    giteeRepo: String,
    giteeBranch: String,
    githubToken: String,
    githubRepo: String,
    githubBranch: String
  },
  activeProject: String|null,
  expandedProjects: [String],
  projects: [
    {
      id: String,
      name: String,
      rvEntries: [{ id, num, text, reason: [String], date, aiAnalysis, before, after, projectId }],
      rvReasons: [String],
      gvEntries: [{ id, num, text, reason: [String], date, aiAnalysis, before, after, projectId }],
      gvReasons: [String],
      memories: [{ id, name, items: [{ id, content, date }] }],
      lorebooks: [{ id, name, timestamp, data: { characters: [], settings: [], plotPoints: [], worldRules: [] }, stats }],
      lorebook: Object|null,
      conversations: [{ id, title, msgs, createdAt }]
    }
  ],
  qps: [{ id, title, content }],
  memories: [{ id, name, items: [{ id, content, date }] }],
  theme: 'dark'|'light'
}
`

### 4.2 数据库结构
- 单表 pp_state：key-value存储
- key: 'app_state'
- value: JSON字符串（包含完整st对象）

## 五、UI/UX设计规范

### 5.1 布局
- 左侧边栏（可折叠）：对话列表、快捷提示词、书籍工程、备份、设置
- 右侧主区域：聊天界面
- 响应式：移动端侧边栏全屏覆盖

### 5.2 主题
- 深色模式（默认）：--bg: #1a1a2e, --sidebar-bg: #16213e, --accent: #4f6ef7
- 浅色模式：通过 .dark 类切换

### 5.3 动画与过渡
- 侧边栏展开/折叠：transition 0.3s
- 弹窗：fade in/out
- 消息渲染：无动画，即时渲染

### 5.4 交互反馈
- Toast通知：底部居中，自动消失
- 确认对话框：confirm() 原生
- 加载状态：按钮禁用 + 文本变化

## 六、API接口文档

### 6.1 登录
- POST /login - 表单提交密码
- 密码: chatstory888

### 6.2 数据管理
- GET /api/data/load - 加载数据
- POST /api/data/save - 保存数据
- GET /api/data/info - 获取数据库信息

### 6.3 云端同步（Gitee）
- POST /api/sync/upload - 上传数据库到Gitee
- POST /api/sync/download - 从Gitee下载数据库

### 6.4 云端同步（GitHub）
- POST /api/github/push - 上传到GitHub
- POST /api/git/pull - 从Git拉取
- POST /api/git/push - 推送到Git
- GET /api/git/log - 获取Git日志

### 6.5 数据导出导入
- POST /api/data/export - 导出数据
- POST /api/data/import - 导入数据
- POST /api/data/upload - 上传文件
- GET /api/data/download - 下载文件

## 七、完整测试用例

### TC.1 登录测试
**TC1.1**: 正确密码登录
- 步骤：访问页面 → 输入chatstory888 → 点击登录
- 预期：成功进入首页

**TC1.2**: 错误密码登录
- 步骤：输入错误密码
- 预期：页面刷新，URL带?e=1

### TC.2 对话功能测试
**TC2.1**: 新建对话
- 步骤：点击"＋ 新对话"
- 预期：创建新对话，标题显示"新对话"

**TC2.2**: 发送消息
- 步骤：输入文本 → 点击发送 / Ctrl+Enter
- 预期：消息显示在对话区域，AI开始回复

**TC2.3**: 切换对话
- 步骤：点击侧边栏不同对话项
- 预期：切换显示对应对话内容

**TC2.4**: 删除对话
- 步骤：点击对话项的✕按钮
- 预期：确认后删除

**TC2.5**: 消息操作
- 步骤：鼠标悬停消息 → 点击操作按钮
- 预期：编辑/复制/删除/版本切换功能正常

### TC.3 快捷提示词测试
**TC3.1**: 新建提示词
- 步骤：输入标题和内容 → 点击"新建并保存"
- 预期：提示词出现在列表中

**TC3.2**: 使用提示词
- 步骤：点击提示词列表项
- 预期：内容填充到输入框

**TC3.3**: 编辑提示词
- 步骤：点击列表项 → 修改内容 → 保存
- 预期：提示词更新

**TC3.4**: 删除提示词
- 步骤：点击提示词的✕按钮
- 预期：确认后删除

### TC.4 书籍工程测试
**TC4.1**: 新建工程
- 步骤：点击"＋ 新建书籍工程" → 输入名称 → 创建
- 预期：工程出现在列表中

**TC4.2**: 展开/折叠工程
- 步骤：点击工程头部
- 预期：展开显示子模块，再次点击折叠

**TC4.3**: 重命名工程
- 步骤：点击工程的✏️按钮 → 输入新名称
- 预期：工程名称更新

**TC4.4**: 删除工程
- 步骤：点击工程的✕按钮 → 确认
- 预期：工程被删除

**TC4.5**: 保存对话到工程
- 步骤：在对话上点击📚按钮 → 选择工程
- 预期：对话保存到工程的历史对话中

### TC.5 作家分析测试
**TC5.1**: 打开分析弹窗
- 步骤：选中文本 → 右键 → "标记到低级作家"
- 预期：打开分析弹窗，文本自动填充

**TC5.2**: 选择原因标签
- 步骤：在弹窗中选择原因标签（多选）
- 预期：标签被选中

**TC5.3**: 添加新原因标签
- 步骤：输入新原因名称 → 点击添加
- 预期：新标签出现在选项中

**TC5.4**: 记录并分析
- 步骤：填写文本和标签 → 点击"记录并分析"
- 预期：AI分析完成，记录保存到对应工程

**TC5.5**: 高级作家分析
- 步骤：右键 → "标记到高级作家"
- 预期：同低级作家，但数据保存到高级作家

### TC.6 长期记忆测试
**TC6.1**: 新建记忆项目
- 步骤：输入记忆项目名称 → 点击"新建项目"
- 预期：项目出现在列表中

**TC6.2**: 添加记忆条目
- 步骤：输入记忆内容 → 点击添加
- 预期：条目添加到项目中

**TC6.3**: 右键添加记忆
- 步骤：选中文本 → 右键 → "添加至长期记忆" → 选择项目
- 预期：文本添加到对应记忆项目

**TC6.4**: 删除记忆条目
- 步骤：点击条目✕按钮
- 预期：条目被删除

**TC6.5**: 删除记忆项目
- 步骤：点击项目✕按钮
- 预期：项目及其所有条目被删除

### TC.7 模型设置测试
**TC7.1**: 打开设置
- 步骤：点击"⚙️ 设置"
- 预期：设置弹窗打开

**TC7.2**: 选择提供商
- 步骤：从下拉框选择提供商
- 预期：URL自动填充，模型名自动填充

**TC7.3**: 自定义提供商
- 步骤：选择"自定义" → 输入URL和模型名
- 预期：保存后生效

**TC7.4**: 获取模型列表
- 步骤：填写API Key → 点击获取模型列表
- 预期：模型列表填充到下拉框

**TC7.5**: 保存设置
- 步骤：修改任意设置 → 点击保存
- 预期：设置生效，弹窗关闭

### TC.8 备份同步测试
**TC8.1**: 导出数据
- 步骤：点击"导出数据"
- 预期：JSON文件下载

**TC8.2**: 导入数据
- 步骤：选择JSON文件 → 导入
- 预期：数据恢复

**TC8.3**: 上传到Gitee
- 步骤：配置Gitee Token和仓库 → 点击上传
- 预期：数据库上传到Gitee

**TC8.4**: 从Gitee下载
- 步骤：点击从Gitee下载
- 预期：数据库从Gitee恢复

### TC.9 UI测试
**TC9.1**: 侧边栏折叠
- 步骤：点击☰按钮
- 预期：侧边栏折叠/展开

**TC9.2**: 主题切换
- 步骤：点击🌙/☀️按钮
- 预期：深色/浅色主题切换

**TC9.3**: 响应式布局
- 步骤：调整浏览器宽度
- 预期：移动端侧边栏全屏覆盖

**TC9.4**: 各区域折叠
- 步骤：点击各区域头部
- 预期：展开/折叠对应内容

### TC.10 数据持久化测试
**TC10.1**: 页面刷新数据保留
- 步骤：操作后刷新页面
- 预期：所有数据保留

**TC10.2**: 服务端数据同步
- 步骤：修改数据 → 等待500ms → 关闭页面 → 重新打开
- 预期：数据从服务端同步

## 八、文件结构
`
ChatStory/
├── index.html           # 主页面（SPA）
├── server.js            # Node.js HTTP服务器
├── database.js          # SQLite数据库模块
├── package.json         # 项目配置
├── css/
│   └── style.css        # 样式文件
├── js/
│   ├── main.js          # 核心逻辑（对话、工程、设置等）
│   ├── review.js        # 作家分析系统
│   └── lorebook.js      # 世界观数据系统
├── chatstory.db         # SQLite数据库文件（运行时生成）
├── manifest.json        # PWA配置
├── sw.js                # Service Worker
└── icon-*.png           # PWA图标
`

## 九、关键交互流程

### 9.1 右键标记流程
1. 用户在对话中选中文本
2. 右键弹出上下文菜单
3. 选择"标记到低级作家"或"标记到高级作家"
4. 打开作家分析弹窗，选中文本自动填充到"当前描写"
5. 选择原因标签（可多选），或输入新原因
6. 填写前文/后文（可选，自动获取上下文）
7. 点击"记录并分析" → 调用AI分析 → 保存到工程
8. 或选择"添加到长期记忆" → 子菜单选择工程 → 直接添加

### 9.2 数据保存流程
1. 用户操作 → 调用save()函数
2. save()更新localStorage
3. 500ms防抖后，POST到 /api/data/save
4. 服务端更新SQLite数据库

### 9.3 数据加载流程
1. 页面加载 → load()函数
2. 从localStorage加载状态
3. 异步从 /api/data/load 获取服务端数据
4. 比较版本号，取最新版本
5. 调用renderAll()渲染UI

### 9.4 云端同步流程
1. 点击"上传到Gitee" → POST /api/sync/upload
2. 服务端读取SQLite数据库文件
3. Base64编码 → 通过Gitee API上传
4. 下载流程相反：从Gitee下载 → 解码 → 恢复数据库
