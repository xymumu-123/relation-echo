# RelationEcho

> 情感陪伴 AI Agent · 记忆永不遗忘，关系自然生长

![Platform](https://img.shields.io/badge/Platform-Android-green)
![Framework](https://img.shields.io/badge/Framework-React%20Native%200.76-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-测试预览版-orange)

RelationEcho 是一个能记住你、理解你、随相处而成长的 AI 陪伴伙伴。与传统聊天机器人不同，它通过**长期记忆**、**关系演化**和**人格一致性**，提供真正有温度的陪伴体验——你提过的事它都记得，相处越久它越懂你。

---

## ✨ 核心亮点

| 亮点 | 说明 |
|------|------|
| 🧠 永不遗忘的记忆 | 每句对话都可能被提取为记忆，权重随时间衰减但永不为零，旧事被提起时依然有反应 |
| 💗 自然生长的关系 | 从陌生到挚友共 5 个等级，等级越高 AI 越主动、称呼越亲密、边界越灵活 |
| 👤 一致的人格 | 50+ 字段三层人格结构（Part A/B/C），角色性格始终如一，不会"精神分裂" |
| 🔗 可视化记忆图谱 | d3-force 力导向图直观展示记忆关联，按角色隔离，支持编辑与删除 |

---

## 📱 功能特性

### 聊天核心
- **双通道 Agent 循环** — 快速通道（情感/闲聊即时回复）+ 完整通道（工具调用 + 反思），兼顾响应速度与智能深度
- **行为化 Prompt** — 声明式档案改为行为指令，减少 AI 味，回复更像真人
- **时间感知** — AI 知道当前时间和消息时间戳，能说"昨晚你说的事"
- **多气泡分段发送** — 长回复按空行分段，段间延迟 800-1500ms，像微信聊天的节奏

### 长期记忆系统
- **LLM 驱动提取** — 每轮对话后由 LLM 判断"是否值得记住"并提取内容
- **两层标签体系** — 据实标签（关于什么：人物/地点/活动…）+ 记忆分类（什么性质：事实/偏好/情绪…）
- **混合检索** — 向量相似度 50% + 标签匹配 30% + 权重流行度 20%，不纯依赖向量
- **权重动态** — 被命中时 +0.05 回升，未命中时按 `weight × e^(-0.002 × 天数)` 衰减
- **三来源分类** — user / ai / cross，区分记忆来源

### 角色与关系
- **50+ 字段三层人格** — Part A（自我记忆）/ Part B（人格）/ Part C（思维框架）
- **双默认角色** — 小雨（女/ISFJ）和阿泽（男/ISTP），开箱即用
- **三种创建方式** — 文本描述 / 引导问答 / 手动编辑，均支持 LLM 辅助
- **角色导入导出** — JSON 格式，方便分享
- **关系 0-4 级** — 陌生 → 熟悉 → 信任 → 亲密 → 挚友，行为指令影响回复风格
- **情绪共鸣** — 用户情绪触发角色情绪，影响接下来 3 轮对话语气

### 用户画像
- **三层结构** — 与角色对称的 Part A/B/C，全局共享（所有角色对话贡献同一画像）
- **LLM 自动提取** — 每隔一定轮数自动分析对话，增量更新画像
- **可导出为角色** — 把对用户的理解反过来创建一个 AI 角色

### 工具与扩展
- **Web 搜索** — `web_search` 工具，AI 可主动搜索实时信息
- **网页内容提取** — `web_fetch` 工具，读取并总结网页内容
- **Tool Registry** — 统一工具注册与管理
- **记忆图谱** — d3-force 力导向图，SVG 渲染，按角色隔离
- **多会话管理** — 微信式会话列表，每个角色独立会话，记忆按角色隔离

---

## 🛠 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Expo SDK 52 + React Native 0.76 | 跨平台移动应用框架 |
| 语言 | TypeScript | 全量类型安全 |
| 数据库 | expo-sqlite | 本地 SQLite，17 张表，v1→v6 迁移机制 |
| 导航 | @react-navigation | Bottom Tabs + Stack 混合导航 |
| 图表 | react-native-svg + d3-force | 记忆图谱力导向布局 |
| 网络 | axios | HTTP 请求 |
| API | OpenAI 兼容 | 多配置管理，向量/聊天模型解耦 |

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- Java JDK 17
- Android Studio（含 Android SDK）
- 一台 Android 设备或模拟器（最低 Android 7.0 / API 24）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/xymumu-123/relation-echo.git
cd relation-echo

# 安装依赖
npm install

# 启动 Expo 开发服务器
npx expo start
```

按 `a` 在 Android 模拟器或连接的真机上运行。

### 首次使用

1. 启动后进入 **Onboarding 引导页**
2. 选择角色创建方式（文本描述 / 引导问答 / 手动编辑）
3. 进入「设置」页面配置 API：
   - **LLM 模型**：任意 OpenAI 兼容 API（GPT-4o、DeepSeek、通义千问等）
   - **Embedding 模型**：可独立配置，留空则与聊天模型共用
4. 回到对话页面，开始聊天

> 支持多套 API 配置，一键切换，内置连通性测试。

### 构建 APK

```bash
cd android
./gradlew assembleDebug
```

生成的 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 📂 项目结构

```
relation-echo/
├── App.tsx                      # 应用入口（初始化数据库、迁移、加载配置）
├── src/
│   ├── api/                     # API 层
│   │   ├── llm-client.ts        #   OpenAI 兼容客户端（多配置/重试/解耦）
│   │   └── token-tracker.ts     #   Token 用量追踪
│   ├── core/                    # Agent 核心
│   │   ├── agent-loop.ts        #   双通道循环（fastPath + fullPath）
│   │   ├── context-builder.ts   #   上下文组装（人格+记忆+关系+情绪）
│   │   ├── core-system.ts       #   CORE 系统提示词（只读底线）
│   │   ├── session-manager.ts   #   会话管理 + 后台任务触发
│   │   └── session-summary.ts   #   会话摘要生成
│   ├── memory/                  # 记忆系统
│   │   ├── memory-extractor.ts  #   LLM 驱动记忆提取
│   │   ├── memory-system.ts     #   记忆 CRUD（按角色隔离）
│   │   ├── vector-store.ts      #   向量存储 + 混合检索
│   │   ├── memory-lifecycle.ts  #   权重衰减与回升
│   │   ├── graph-data.ts        #   记忆图谱数据
│   │   └── graph-layout.ts      #   d3-force 布局
│   ├── personality/             # 角色人格
│   │   ├── character.ts         #   50+ 字段三层人格 + 双默认角色
│   │   └── character-creator.ts #   LLM 辅助创建（文本解析/问答）
│   ├── relationship/            # 关系系统
│   │   └── relationship-engine.ts # 0-4 级 + 行为指令 + 初始等级推断
│   ├── mood/                    # 情绪系统
│   │   └── character-mood.ts    #   情绪共鸣（3 轮影响）
│   ├── profile/                 # 用户画像
│   │   └── user-profile.ts      #   三层结构 + LLM 自动提取
│   ├── crisis/                  # 危机识别
│   │   └── crisis-detector.ts   #   规则词库 + 危机响应
│   ├── tools/                   # 工具系统
│   │   ├── tool-registry.ts     #   工具注册中心
│   │   ├── web-search.ts        #   Web 搜索
│   │   └── web-fetch.ts         #   网页内容提取
│   ├── database/                # 数据层
│   │   ├── schema.ts            #   17 张表定义
│   │   ├── migrations.ts        #   v1→v6 迁移
│   │   └── db.ts                #   连接管理
│   ├── screens/                 # 页面
│   │   ├── ChatScreen.tsx       #   对话页（分段/时间戳/关系徽章）
│   │   ├── ConversationListScreen.tsx # 会话列表
│   │   ├── MemoryScreen.tsx     #   记忆浏览（标签筛选/编辑/删除）
│   │   ├── MemoryGraphScreen.tsx#   记忆图谱
│   │   ├── CharacterScreen.tsx  #   角色管理
│   │   ├── SettingsScreen.tsx   #   设置（API/用量）
│   │   └── OnboardingScreen.tsx #   首次引导
│   ├── components/              # 通用组件
│   └── navigation/              # 导航配置
├── ARCHITECTURE_新版.md          # 架构设计文档 v2
├── DEVELOPMENT_LOG.md            # 开发日志（16 次迭代详情）
└── 项目分析_20260630.md          # 项目完成度分析
```

---

## 🏗 架构概览

### 核心流程：Agent 双通道循环

```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────┐
│              Agent Loop（agent-loop.ts）          │
│                                                   │
│  1. 危机检测 → 命中则走危机响应，直接陪伴          │
│                                                   │
│  2. 快速意图判断（规则，非 LLM）                   │
│     ├─ 情感倾诉 → emotion 模式（快速通道）         │
│     ├─ 闲聊     → chat 模式（快速通道）            │
│     └─ 其他     → 完整通道                        │
│                                                   │
│  3. 完整通道（fullPath）                          │
│     ├─ 上下文组装（人格 + 记忆 + 关系 + 情绪）     │
│     ├─ LLM 生成回复                               │
│     ├─ 检查 tool_calls → 执行工具 → 再次 LLM       │
│     └─ reflect 阶段：记忆提取 / 摘要 / 画像更新    │
└─────────────────────────────────────────────────┘
    │
    ▼
  回复 + 记忆 + 摘要 → 本地存储
```

### 上下文组装优先级

Context Builder 按以下优先级组装 Prompt，超出 Token 预算时裁剪低优先级：

| 优先级 | 内容 |
|--------|------|
| 1 | CORE 系统提示（只读底线） |
| 2 | 角色人格（Part A/B/C） |
| 3 | 关系状态 + 行为指令 |
| 4 | 角色即时情绪 |
| 5 | 用户当前消息 |
| 6 | 工作记忆（最近 N 轮） |
| 7 | 相关记忆（混合检索 Top N） |
| 8 | 用户画像摘要 |
| 9 | 会话摘要（滚动队列） |

### 数据库 ER 概览

17 张表覆盖：`characters` / `sessions` / `messages` / `session_summaries` / `memory_nodes` / `memory_vectors` / `memory_relations` / `tags` / `user_profiles` / `profile_updates` / `relationships` / `character_moods` / `api_configs` / `tool_configs` / `token_usage` / `backups`。全部数据本地存储，不上传服务器。

---

## 🎯 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 记忆遗忘策略 | 永不遗忘，权重衰减 | 陪伴型 AI 不应遗忘旧事，用户提起时应有反应 |
| 标签体系 | 两层（据实 + 分类） | 兼顾"关于什么"和"什么性质"两个维度 |
| 混合检索 | 向量 50% + 标签 30% + 权重 20% | 不纯依赖向量，引入语义分类和流行度 |
| 角色结构 | Part A/B/C 三层（50+ 字段） | 与用户画像对称，数据结构统一 |
| Prompt 风格 | 行为指令式（非声明式档案） | 减少 AI 味，LLM 更自然模仿人格 |
| 后台任务触发 | 数据库差值（非内存 modulo） | 重启后状态不丢失，更可靠 |
| 用户画像 | 全局共享（characterId = -1） | 所有角色对话贡献到同一画像 |
| 聊天 UI | Inverted FlatList | 标准聊天模式，无需滚动 hack |

---

## 📈 开发历程

RelationEcho 在 **3 天（72 小时）** 内完成 16 次迭代，从初始骨架发展为完整的陪伴 AI 系统。

| 版本 | 主要内容 |
|------|----------|
| v0.1 | 项目初始化，32 源文件骨架 |
| v0.2 | 记忆系统完整实现：LLM 提取、两层标签、混合检索、权重动态 |
| v0.4 | 角色系统完整实现：人格加载/编辑、关系行为指令、情绪注入 |
| v0.6 | 人格 13→50+ 字段、双默认角色、微信式会话列表、记忆隔离 |
| v0.8 | Prompt 行为化改造：去 AI 味，声明式档案 → 行为指令 |
| v1.0 | 记忆来源三分类 + 摘要滚动队列 |
| v1.2 | 记忆系统全面优化：非重叠窗口、去重、编辑删除、RAG 多样性 |
| v1.6 | 工具调用接入（function calling）+ 记忆图谱（d3-force） |

完整迭代日志见 [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md)。

---

## 🗺 路线图

### 已完成（约 70%）
- ✅ 聊天核心闭环（双通道 Agent + 上下文组装 + 分段显示）
- ✅ 长期记忆系统（提取 + 混合检索 + 权重动态 + 去重）
- ✅ 角色与关系系统（50+ 字段人格 + 0-4 级关系 + 情绪共鸣）
- ✅ 用户画像（三层结构 + LLM 自动提取）
- ✅ 工具系统（web_search + web_fetch + Tool Registry）
- ✅ 记忆图谱（d3-force 可视化）

### 进行中 / 待开发
- 🔴 数据备份与恢复（表已建，缺 UI 与逻辑）
- 🔴 Token 预算管理（架构已设计，未集成到 ContextBuilder）
- 🔴 API Key 加密存储（当前明文，存在隐私风险）
- 🟡 关系 LLM 语义评估（当前仅按对话次数升级）
- 🟡 AI 主动输出（日记 / 总结 / 文章）
- 🟡 自动化测试覆盖
- 🟢 任务系统（定时 / 事件触发）
- 🟢 插件化工具市场
- 🟢 iOS 端构建

详细分析见 [`项目分析_20260630.md`](项目分析_20260630.md)。

---

## 📦 下载体验

最新测试预览版 APK 可从 [GitHub Releases](https://github.com/xymumu-123/relation-echo/releases/latest) 下载。

> 当前为测试预览版，不建议用于生产环境。数据备份功能开发中，请注意手动备份。

---

## 📄 许可证

MIT License — 详见 [LICENSE](LICENSE)。

---

## 🙏 致谢

本项目架构设计参考了陪伴型 AI 的前沿理念，感谢所有开源社区的贡献者。
