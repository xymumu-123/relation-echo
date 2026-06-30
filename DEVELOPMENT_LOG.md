# Echo 开发日志

## 2026-06-27 20:00

### 项目初始化
- 创建 Expo 项目（SDK 52）
- 技术栈：React Native + TypeScript + expo-sqlite + axios
- 搭建完整项目骨架（32个源文件）

### 已实现功能

#### 核心系统
- CORE 系统提示词（只读）
- 双通道 Agent 循环（快速通道 + 完整通道）
- 会话管理器
- 上下文组装器

#### 数据库
- SQLite 数据库（14张表）
- 表结构：characters, sessions, messages, memory_nodes, memory_vectors, relationships, character_moods, user_profiles, api_configs, token_usage 等
- 数据库迁移机制

#### API 层
- OpenAI 兼容 API 调用
- Token 用量追踪

#### 功能模块
- 记忆系统（基础 CRUD，尚未完整）
- 向量存储骨架
- 关系系统（等级 0-4）
- 角色情绪系统
- 用户画像
- 危机识别（规则词库）
- 工具系统（web_search, web_fetch）

#### UI 页面
- 对话页面（可正常聊天）
- 记忆浏览页面
- 设置页面（API 配置、用量统计）
- 角色管理页面
- 底部导航

---

## 2026-06-28 00:30

### 记忆系统增强（完整实现）

#### Step 1: 记忆提取（LLM 驱动）- 00:35
- 状态：✅ 已完成
- 新增 `src/memory/memory-extractor.ts`
- 在 agent-loop.ts 的 reflect 阶段调用 LLM 从对话中提取记忆
- LLM 返回：shouldRemember、content、factualTags、natureTags、weight

#### Step 2: 两层标签系统 - 00:40
- 状态：✅ 已完成
- 更新 `src/database/schema.ts`：tags 表增加 tag_type 字段
- 更新 `src/memory/memory-system.ts`：支持两层标签（据实标签 + 记忆分类）
- 更新 `MemoryNode` 接口：tags 改为 { factual: string[], nature: string[] }

**据实标签（第一层 - 关于什么）：**
- 人物与关系：家人、朋友、同事、伴侣、陌生人、亲情、友情、爱情等
- 物品与消费：食物、电子产品、衣物、书籍、礼物等
- 空间与地点：旅游目的地、家里、公司、学校、某条街道、餐厅等
- 活动与事件：旅游、聚餐、工作、学习、运动、睡眠等
- 时间与节点：童年、去年、上周、节日、生日、早晨/深夜等
- 自然与文化：天气、季节、电影、音乐、历史事件等

**记忆分类（第二层 - 什么性质）：**
- 事实信息：客观存在的属性或发生过的事情
- 个人偏好：主观的喜好、厌恶、习惯倾向
- 事件经历：有起止时间、有情节的完整或片段化故事
- 情绪感受：某个瞬间的主观心理状态或情感共鸣
- 知识技能：学到的规律、经验总结或掌握的方法
- 人际动态：关于他人性格、人际交往规则或互动模式的认知
- 目标计划：面向未来的意图、愿望或待办事项

#### Step 3: 权重动态机制 - 00:45
- 状态：✅ 已完成
- LLM 决定初始权重（0.1-1.0）
- 被命中时权重 +0.05（上限 1.0）
- 指数衰减公式：weight × e^(-0.002 × 天数)
- 权重永不为零

**设计决策：**
- 原架构设计：记忆有 fading/archived 状态，60天后遗忘
- 实际实现：记忆永不遗忘，权重永不为零
- 原因：陪伴型 AI 不应遗忘旧事，用户提起时应能有反应

#### Step 4: 向量存储与混合检索 - 00:50
- 状态：✅ 已完成
- 更新 `src/memory/vector-store.ts`：实现混合检索
- 检索公式：向量 50% + 标签 30% + 权重 20%
- 更新 `src/core/context-builder.ts`：使用混合检索获取相关记忆
- 更新 `src/screens/ChatScreen.tsx`：使用混合检索

#### Step 5: 会话摘要 - 00:55
- 状态：✅ 已完成
- 新增 `src/core/session-summary.ts`
- 每5轮对话触发 LLM 压缩摘要
- 摘要存入 session_summaries 表

#### Step 6: 记忆生命周期 - 01:00
- 状态：✅ 已完成
- 更新 `src/memory/memory-lifecycle.ts`
- 去掉 fading/archived 状态
- 权重随时间指数衰减，永不为零

#### Step 7: 记忆页面增强 - 01:05
- 状态：✅ 已完成
- 更新 `src/components/MemoryCard.tsx`：显示两层标签、权重、最后访问时间
- 更新 `src/screens/MemoryScreen.tsx`：支持按标签筛选

### 改动文件清单
- `src/memory/memory-extractor.ts`（新增）
- `src/memory/memory-system.ts`（重写）
- `src/memory/vector-store.ts`（重写）
- `src/memory/memory-lifecycle.ts`（重写）
- `src/core/agent-loop.ts`（更新）
- `src/core/context-builder.ts`（更新）
- `src/core/session-summary.ts`（新增）
- `src/database/schema.ts`（更新）
- `src/screens/ChatScreen.tsx`（更新）
- `src/screens/MemoryScreen.tsx`（重写）
- `src/components/MemoryCard.tsx`（重写）

### 设计决策
- 记忆永不遗忘，权重永不为零
- 两层标签体系：据实标签（6类）+ 记忆分类（7类）
- 权重衰减公式：weight × e^(-0.002 × 天数)
- 混合检索：向量 50% + 标签 30% + 权重 20%

---

## 与原架构设计的差异

### 技术栈变更
| 原设计 | 实际实现 |
|--------|----------|
| Flutter（Dart） | React Native（TypeScript） |
| sqflite | expo-sqlite |
| http 库 | axios |

### 记忆系统差异
| 原设计 | 实际实现 |
|--------|----------|
| 记忆有 fading/archived 状态 | 记忆永不遗忘，只有 active 状态 |
| 60天后遗忘低权重记忆 | 权重指数衰减，永不为零 |
| 标签为单一数组 | 两层标签体系（据实标签 + 记忆分类） |
| 混合检索：向量 50% + 标签 50% | 混合检索：向量 50% + 标签 30% + 权重 20% |

### 后台任务差异
| 原设计 | 实际实现 |
|--------|----------|
| 每10轮触发记忆提取 | 每轮都尝试提取记忆 |
| 每20轮触发画像更新 | 尚未实现 |
| 每30轮触发关系评估 | 尚未实现 |

---

## 待开发功能

### 第二阶段：关系成长
- 用户画像更新（每20轮触发）
- 关系评估（每30轮触发）
- AI输出管理（日记等）

### 第三阶段：高级功能
- 任务系统（定时、事件触发）
- 记忆图谱（2D/3D可视化）
- 插件化工具生态
- 更多工具（日历、提醒、图片生成等）

---

## 测试状态

### 已测试功能
- ✅ 页面导航（对话/记忆/设置）
- ✅ API 配置
- ✅ 对话功能（可正常聊天）
- ✅ 记忆页面显示

### 待测试功能
- ⏳ 记忆提取（LLM 驱动）
- ⏳ 两层标签系统
- ⏳ 权重动态机制
- ⏳ 混合检索
- ⏳ 会话摘要
- ⏳ 标签筛选

---

## 2026-06-28 01:10

### 下一步计划

1. 重启 Expo 服务器测试新功能
2. 验证记忆提取是否正常工作
3. 验证两层标签系统是否正常显示
4. 验证权重衰减和回升机制
5. 开发第二阶段功能（用户画像更新、关系评估）

---

## 2026-06-28 03:00

### Bug 修复与系统增强

#### 1. 标签提取优化 - 03:05
- 状态：✅ 已完成
- 重写 `src/memory/memory-extractor.ts` 提取提示词
- 问题：标签过于笼统（"人物与关系"），应为具体关键词（"宠物"、"猫"、"美短"）
- 修复：要求 LLM 从用户消息中提取具体关键词，每条记忆 2-4 个精确标签
- 新增：明确区分【用户消息】和【AI回复】，只从用户消息提取记忆

#### 2. 数据库迁移修复 - 03:10
- 状态：✅ 已完成
- 问题：tags 表缺少 tag_type 列（CREATE TABLE IF NOT EXISTS 不修改已有表）
- 修复：`src/database/migrations.ts` 增加 v1→v2 迁移（ALTER TABLE tags ADD COLUMN tag_type）
- 新增：`src/database/db.ts` 增加 `resetDatabase()` 函数用于调试

#### 3. RAG 日志系统 - 03:15
- 状态：✅ 已完成
- 更新 `src/memory/vector-store.ts`：添加 `[RAG]` 前缀日志
- 日志点：embedding API 调用、向量存储、向量搜索、混合搜索、关键词回退
- 目的：诊断 RAG 检索流程，确认向量搜索是否正常工作

#### 4. 设置页面重构 - 03:20
- 状态：✅ 已完成
- 支持多个 API 配置（列表展示、切换、编辑、删除）
- 向量模型与大语言模型解耦（独立 URL/Key 配置）
- 新增 `testChat()` 和 `testEmbed()` 连通性测试
- 更新 `src/database/schema.ts`：api_configs 表增加 description/embedding_base_url/embedding_api_key
- 更新 `src/database/migrations.ts`：增加 v2→v3 迁移

#### 5. 记忆检索优化 - 03:25
- 状态：✅ 已完成
- 问题：LIKE 回退使用完整用户消息，过于宽泛
- 修复：新增 `extractKeywords()` 函数，提取 2-6 字中文词段，过滤停用词，最多 5 个关键词
- 修复：`touchMemory` 从 vector-store 移至 context-builder，只标记实际注入 LLM 上下文的记忆

#### 6. Context Builder 增强 - 03:30
- 状态：✅ 已完成
- 关系状态注入：等级名称、亲密度、信任度、行为指导（0-4 级各有不同指令）
- 情绪状态注入：情绪名称、触发原因、说话方式指导、剩余影响轮数

---

## 2026-06-28 04:00

### 角色系统完整实现

#### 1. 角色加载与编辑 - 04:05
- 状态：✅ 已完成
- 更新 `src/personality/character.ts`：增加 `getActiveCharacter()`、`saveCharacter()`、`exportCharacter()`、`importCharacter()`
- 重写 `src/screens/CharacterScreen.tsx`：角色列表 + 内联编辑器（Part A/B/C）
- 支持从 JSON 文件导入/导出角色（expo-document-picker + expo-sharing）

#### 2. 关系行为注入 - 04:10
- 状态：✅ 已完成
- 更新 `src/relationship/relationship-engine.ts`：增加 `LEVEL_BEHAVIORS` 数组（0-4 级行为指令）
- 新增 `getLevelName()`、`getLevelBehavior()` 方法
- `recordInteraction()` 返回 `_levelUp` 标志用于 UI 提示

#### 3. 情绪注入增强 - 04:15
- 状态：✅ 已完成
- 更新 `src/mood/character-mood.ts`：增加 `MoodInfo` 接口和 `getMoodInfo()` 方法
- `MOOD_RESPONSE_MAP` 包含 responseStyle 字段（说话方式描述）

#### 4. 关系 UI 显示 - 04:20
- 状态：✅ 已完成
- 重写 `src/screens/ChatScreen.tsx`：
  - 顶部关系状态栏：角色名 + 等级徽章（颜色编码）+ 对话次数
  - 关系升级通知（Alert.alert）
  - 从数据库加载角色（不再硬编码 CHARACTER_ID=1）
- 更新 `src/navigation/AppNavigator.tsx`：增加角色 Tab（👤 图标）

### 改动文件清单
- `src/memory/memory-extractor.ts`（重写提示词）
- `src/memory/vector-store.ts`（RAG 日志 + 检索优化）
- `src/database/schema.ts`（api_configs 扩展）
- `src/database/migrations.ts`（v2→v3 迁移）
- `src/database/db.ts`（resetDatabase）
- `src/api/llm-client.ts`（多配置管理 + 连通性测试）
- `src/core/context-builder.ts`（关系/情绪注入增强）
- `src/personality/character.ts`（角色 CRUD + 导入导出）
- `src/relationship/relationship-engine.ts`（行为指令）
- `src/mood/character-mood.ts`（情绪信息增强）
- `src/screens/ChatScreen.tsx`（关系 UI + 角色加载）
- `src/screens/CharacterScreen.tsx`（完整重写）
- `src/screens/SettingsScreen.tsx`（完整重写）
- `src/screens/MemoryScreen.tsx`（搜索框）
- `src/navigation/AppNavigator.tsx`（角色 Tab）
- `App.tsx`（RESET_DB 标志）

### 设计决策
- 角色 Part A/B/C 结构：基础信息 / 性格行为 / 与用户关系
- 关系 0-4 级各有行为指令，影响 LLM 回复风格
- 情绪系统：用户情绪 → 角色情绪共鸣（3 轮影响）
- 角色可导入导出为 JSON 文件，便于分享

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要重启 Expo 测试所有功能

---

## 2026-06-28 04:30

### 当前状态

**已完成：**
- 核心系统（Agent Loop、Session Manager、Context Builder）
- 记忆系统（三层架构、向量存储、混合检索、LLM 提取）
- 角色系统（人格定义、编辑、导入导出）
- 关系系统（等级 0-4、行为指令、UI 显示）
- 情绪系统（用户情绪分析、角色情绪共鸣）
- API 管理（多配置、解耦向量/聊天模型）
- 数据库（14 张表、迁移机制）

**待开发：**
- 工具调用（web_search/web_fetch 接入 agent-loop）
- Token 预算管理
- 后台任务频率修正（记忆每 10 轮、画像每 20 轮、关系每 30 轮）
- 数据备份/恢复
- 用户画像自动更新
- 关系 LLM 评估
- 记忆去重
- AI 输出管理（日记等）
- 第三阶段：任务系统、记忆图谱、插件生态

---

## 2026-06-28 06:00

### 五项问题修复（用户测试反馈）

#### 1. API 配置保留 - 06:05
- 状态：✅ 已完成
- 问题：`resetDatabase()` 删除整个数据库文件，每次调试都要重新录入 API 配置
- 修复：`src/database/db.ts` — 重写 `resetDatabase()`，删除前备份 api_configs 到内存，重建后恢复
- 修复：`src/api/llm-client.ts` — `chat()` 方法增加可选参数 `opts?: { temperature?; max_tokens? }`，返回类型改为直接返回 `ChatCompletion`

#### 2. AI 回复去除语气标注 - 06:10
- 状态：✅ 已完成
- 问题：AI 回复中出现 `(语气温和)`、`(微笑)` 等括号标注，不像真人
- 修复：`src/core/core-system.ts` — CORE_SYSTEM_PROMPT 新增"六、回复格式规范"
  - 禁止使用括号/星号包裹的动作/情绪描述
  - 要求通过措辞、句式、标点表达语气
  - 要求口语化、简洁自然，像朋友发微信

#### 3. 角色切换后 ChatScreen 刷新 - 06:15
- 状态：✅ 已完成
- 问题：ChatScreen 用 `useEffect([], [])` 只在挂载时加载角色，切换角色后返回不更新
- 修复：`src/screens/ChatScreen.tsx` — `useEffect` 替换为 `useFocusEffect(useCallback)`，每次页面聚焦时重新加载

#### 4. AI 回复分段显示 - 06:20
- 状态：✅ 已完成
- 问题：AI 回复是一整块文字，不像真人分条发消息
- 修复：
  - `src/core/core-system.ts` — 追加第5条指令：长回复用空行（\n\n）分段，每段像一条独立消息
  - `src/screens/ChatScreen.tsx` — 收到回复后按 `\n\n+` 分割，逐段添加到消息列表，段间延迟 800-1500ms
  - 数据库仍保存完整回复（一条消息），只在显示时分段

#### 5. 引导式角色创建 + LLM 文本解析 - 06:30
- 状态：✅ 已完成
- 问题：无首次引导，角色创建只能手动填表，入手难度高
- 新增文件：
  - `src/personality/character-creator.ts` — LLM 角色解析工具
    - `parseCharacterFromText()`：从自由文本提取 CharacterPersona JSON
    - `generateCharacterFromQA()`：从问答对综合生成角色
    - `generateOnboardingQuestion()`：LLM 生成引导式追问
  - `src/screens/OnboardingScreen.tsx` — 首次引导页面
    - 欢迎页 → 三种创建方式（文本描述/引导问答/手动编辑）→ 预览确认
    - AsyncStorage `onboarding_complete` 标记，只显示一次
  - `src/components/CharacterEditor.tsx` — 从 CharacterScreen 提取的共享编辑器组件
- 更新文件：
  - `src/screens/CharacterScreen.tsx` — 新增"文本创建"按钮+Modal，支持文本解析补充角色信息（合并策略：字符串非空覆盖，数组合并去重）
  - `src/navigation/AppNavigator.tsx` — 条件渲染：首次启动显示 OnboardingScreen，完成后显示主导航
  - `src/relationship/relationship-engine.ts` — 新增 `getInitialLevel()` 方法，根据角色关系描述（青梅竹马→3、朋友→1、伴侣→3 等）自动设定初始关系等级
  - `src/screens/ChatScreen.tsx` — 创建关系时传入初始等级

### 改动文件清单
- `src/database/db.ts`（resetDatabase 备份恢复）
- `src/core/core-system.ts`（回复格式规范）
- `src/screens/ChatScreen.tsx`（useFocusEffect + 分段显示 + 初始关系等级）
- `src/api/llm-client.ts`（chat 参数扩展）
- `src/personality/character-creator.ts`（新增：LLM 角色解析）
- `src/screens/OnboardingScreen.tsx`（新增：引导创建流程）
- `src/components/CharacterEditor.tsx`（新增：共享编辑器）
- `src/screens/CharacterScreen.tsx`（文本创建入口 + 导入共享编辑器）
- `src/navigation/AppNavigator.tsx`（条件渲染导航）
- `src/relationship/relationship-engine.ts`（初始关系等级推断）

### 设计决策
- 引导式创建：三种方式并行（文本/问答/手动），用户自选
- 文本解析：LLM 提取 persona JSON，temperature 0.3 保证结构化输出
- 角色信息合并：字符串字段非空覆盖，数组字段合并去重，需用户确认
- 分段显示：数据库存完整回复，UI 层按 `\n\n` 分割，保证数据完整性
- 关系初始等级：正则匹配关系描述关键词，自动映射到 0-3 级
- LLM JSON 解析：先剥离 markdown 代码块，再尝试提取 `{...}` 子串

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要测试：引导流程、文本解析、角色切换刷新、分段消息、API 配置保留

---

## 2026-06-28 10:00

### 五项系统升级

#### 1. AI 回复自然度加强 - 10:05
- 状态：✅ 已完成
- 文件：`src/core/core-system.ts`
- 问题：prompt 只禁止了语气标注，没禁止动作描写如 `(微微一愣)`
- 修复：加强"回复格式规范"，严禁所有括号内容（语气标注、动作描写、场景描述）

#### 2. 角色人格结构升级（13字段→50+字段）- 10:15
- 状态：✅ 已完成
- 文件：`src/personality/character.ts`（重写）、`src/personality/character-creator.ts`（重写）、`src/components/CharacterEditor.tsx`（重写）、`src/database/schema.ts`、`src/database/migrations.ts`
- 升级 CharacterPersona 接口为三层结构：
  - Part A（自我记忆）：identity(5), values(5), habits(5), important_memories[], relationships[], growth_trajectory(4)
  - Part B（人格）：hard_rules[], identity(含MBTI/zodiac), speaking_style(6子字段), emotion_decision(4), interpersonal(5)
  - Part C（思维框架）：mental_models[], decision_heuristics[], expression_dna(6), values_and_anti_patterns(3), honesty_boundaries[], relationship_to_user, call_user_as
- 新增双默认角色：小雨（女/ISFJ）和阿泽（男/ISTP），填充完整三层结构
- formatPersonaForPrompt 按架构文档优先级组装（硬规则→身份→说话风格→情感→人际→价值观→思维框架）
- 向后兼容迁移：v4→v5 自动检测旧格式并转换

#### 3. CharacterScreen 角色创建流程重构 - 10:30
- 状态：✅ 已完成
- 文件：`src/screens/CharacterScreen.tsx`（重写）
- 移除"文本创建"按钮，改为"+ 新建"弹出选择 Modal（文本描述 / 默认女 / 默认男）
- 每个角色卡片新增"快速编辑"按钮：输入文本 → LLM 解析 → 深度合并到已有角色
- mergePersona 升级为深度递归合并（支持新三层结构）

#### 4. 微信式多会话对话列表 - 10:45
- 状态：✅ 已完成
- 新增文件：`src/screens/ConversationListScreen.tsx`
- 修改文件：`src/screens/ChatScreen.tsx`（接收 characterId params）、`src/navigation/AppNavigator.tsx`（Chat 改为 Stack）
- 安装 `@react-navigation/native-stack`
- 结构：Tab → ChatTab(StackNavigator) → ConversationList / ChatDetail
- 会话列表：头像(首字母) + 角色名 + 最新消息预览 + 时间 + 关系等级徽章
- ChatScreen：从数据库加载角色（不再用 getActiveCharacter），加载该角色的历史消息，支持返回

#### 5. 记忆按角色隔离 - 11:00
- 状态：✅ 已完成
- 文件：`src/database/schema.ts`（memory_nodes 增加 character_id）、`src/memory/memory-system.ts`（所有查询增加 characterId 过滤）、`src/memory/vector-store.ts`（hybridSearch/vectorSearch 增加 characterId）、`src/memory/memory-extractor.ts`（接收并存储 characterId）、`src/core/agent-loop.ts`（转发 characterId 到 reflect）、`src/screens/ChatScreen.tsx`（传递 characterId）、`src/screens/MemoryScreen.tsx`（增加角色选择器）
- 写入路径：memoryExtractor → memorySystem.createMemory 记录 character_id
- 读取路径：所有查询方法支持可选 characterId 过滤
- MemoryScreen：顶部增加横向滚动角色选择器，选中角色后只显示该角色的记忆

### 改动文件清单
- `src/core/core-system.ts`（加强回复格式规范）
- `src/personality/character.ts`（完整重写：接口升级 + 双默认角色 + formatPersonaForPrompt + 迁移函数）
- `src/personality/character-creator.ts`（完整重写：新 prompt + validatePersona + 向后兼容）
- `src/components/CharacterEditor.tsx`（完整重写：可折叠多区块 UI）
- `src/screens/CharacterScreen.tsx`（完整重写：创建流程 + 快速编辑 + 深度合并）
- `src/screens/OnboardingScreen.tsx`（重写：去掉手动编辑，增加性别选择）
- `src/screens/ConversationListScreen.tsx`（新增：会话列表）
- `src/screens/ChatScreen.tsx`（重写：接收 characterId params，加载历史消息）
- `src/navigation/AppNavigator.tsx`（Chat 改为 Stack Navigator）
- `src/database/schema.ts`（DB_VERSION=5, memory_nodes 增加 character_id）
- `src/database/migrations.ts`（v3→v4 记忆隔离 + v4→v5 人格迁移）
- `src/memory/memory-system.ts`（所有查询增加 characterId 过滤）
- `src/memory/vector-store.ts`（hybridSearch/vectorSearch 增加 characterId）
- `src/memory/memory-extractor.ts`（接收 characterId 并传递）
- `src/core/agent-loop.ts`（转发 characterId 到 reflect）
- `src/screens/MemoryScreen.tsx`（增加角色选择器）

### 设计决策
- 引导式问答不问细节字段（MBTI、表达DNA），只问宏观描述，由 LLM 推断填充
- 首次引导去掉手动编辑，降低上手门槛
- 双默认角色（女/男），填充完整三层结构
- 会话列表按最新消息时间排序
- 记忆隔离通过 character_id 实现，查询方法支持可选过滤
- 向后兼容：旧格式 persona 自动迁移为新格式

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要重启 Expo 测试所有功能

---

## 2026-06-28 12:00

### 全面项目审计 + 10 项修复

对整个项目进行了系统性审计，覆盖数据库/API 层、屏幕/导航、核心系统三个维度，发现并修复 10 个问题。

#### 会导致崩溃的问题（高优先级）

##### 1. importCharacter 缺少 partC 验证 - 12:05
- 状态：✅ 已完成
- 文件：`src/personality/character.ts`
- 问题：导入角色 JSON 时只检查 `partA.identity.name` 和 `partB.identity`，不检查 `partC`。如果 partC 缺失，`formatPersonaForPrompt()` 访问 `partC.relationship_to_user` 会崩溃
- 修复：增加 `data.partC?.relationship_to_user !== undefined` 检查

##### 2. validatePersona 缺少 partB 检查 - 12:05
- 状态：✅ 已完成
- 文件：`src/personality/character-creator.ts`
- 问题：LLM 返回的 JSON 如果缺少 `partB`，`fillDefaults()` 访问 `partB.hard_rules` 等字段会抛异常
- 修复：增加 `if (!data.partB) return null` 检查

##### 3. user-profile.ts 无保护 JSON.parse - 12:05
- 状态：✅ 已完成
- 文件：`src/profile/user-profile.ts`
- 问题：数据库中 `user_profiles.data` 如果存了非 JSON 内容（空字符串、损坏数据），`JSON.parse` 直接崩溃，每次打开对话都闪退且无法自恢复
- 修复：try/catch 包裹，损坏数据时自动重建空画像

#### 数据完整性问题

##### 4. createMemory 没用事务 - 12:10
- 状态：✅ 已完成
- 文件：`src/database/db.ts` + `src/memory/memory-system.ts`
- 问题：写入 `memory_nodes` 和 `memory_tables` 两张表不是原子操作，app 被杀时会产生只有节点没有标签的孤立记忆
- 修复：`db.ts` 新增 `withTransaction()` 函数（封装 `database.withTransactionAsync`），`createMemory()` 整体包裹在事务中

##### 5. vectorSearch N+1 查询 - 12:10
- 状态：✅ 已完成
- 文件：`src/memory/vector-store.ts`
- 问题：搜索记忆时先查到 N 个向量 ID，再逐个 `SELECT * FROM memory_nodes WHERE id = ?`，20 个向量就是 20 次数据库查询
- 修复：改为单次 `SELECT * FROM memory_nodes WHERE id IN (?, ?, ...)` 批量查询 + Map 映射，N+1 降为 2 次查询

##### 6. 删除活跃角色不激活其他角色 - 12:10
- 状态：✅ 已完成
- 文件：`src/screens/CharacterScreen.tsx`
- 问题：删除 `is_active=1` 的角色后，没有任何角色被标记为活跃，`getActiveCharacter()` 自动创建默认角色，用户发现删掉的角色"复活"
- 修复：删除后检查是否删的是活跃角色，如果是则自动激活第一个剩余角色，无角色则创建默认角色

#### 死代码清理

##### 7. context-builder.ts 死代码 - 12:15
- 状态：✅ 已完成
- 文件：`src/core/context-builder.ts`
- 问题：第 49 行 `const info = Object.values({...}).includes(moodName) ? '' : ''` 永远返回空字符串，赋值后未使用
- 修复：删除该行

##### 8. character.ts 死代码 - 12:15
- 状态：✅ 已完成
- 文件：`src/personality/character.ts`
- 问题：`formatPersonaForPrompt()` 第 215 行 `const ai_ = persona.partA.identity` 赋值后未使用
- 修复：删除该行

#### 体验优化

##### 9. useFocusEffect 内存泄漏 - 12:20
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx` + `src/screens/ConversationListScreen.tsx`
- 问题：useFocusEffect 中的异步操作没有 cleanup，用户快速进出页面时，旧回调仍会 `setState` 更新已卸载的组件，导致 React 警告和数据错乱
- 修复：添加 `cancelled` 标志 + `return () => { cancelled = true; }` cleanup 函数，每个异步操作前检查 cancelled

##### 10. LLM API 无重试 + 动态 require - 12:20
- 状态：✅ 已完成
- 文件：`src/api/llm-client.ts`
- 问题：网络抖动或 API 限流时一次请求失败就直接报错；`setActiveConfig`/`saveConfig`/`deleteConfig` 使用动态 `require()` 绕过 TypeScript 类型检查
- 修复：
  - 新增 `withRetry()` 私有方法，指数退避重试（1s → 2s），429/5xx 自动重试，4xx 客户端错误立即抛出
  - `chat()` 方法改为通过 `withRetry()` 调用
  - 移除所有动态 `require()`，改为文件顶部静态导入 `execute`

### 改动文件清单
- `src/database/db.ts`（新增 `withTransaction()`）
- `src/memory/memory-system.ts`（createMemory 使用事务）
- `src/memory/vector-store.ts`（vectorSearch 批量查询消除 N+1）
- `src/profile/user-profile.ts`（JSON.parse 保护）
- `src/core/context-builder.ts`（删除死代码）
- `src/personality/character.ts`（删除死代码 + importCharacter 验证加强）
- `src/personality/character-creator.ts`（validatePersona 增加 partB 检查）
- `src/screens/CharacterScreen.tsx`（删除活跃角色后自动激活其他）
- `src/screens/ConversationListScreen.tsx`（useFocusEffect cleanup）
- `src/screens/ChatScreen.tsx`（useFocusEffect cleanup）
- `src/api/llm-client.ts`（重试机制 + 移除动态 require）

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ✅ Expo 重启成功（port 8082）

---

## 2026-06-28 13:00

### Prompt 行为化改造（去 AI 味）

#### 1. formatPersonaForPrompt 重写 - 13:05
- 状态：✅ 已完成
- 文件：`src/personality/character.ts`
- 问题：原实现输出声明式 key-value 档案（`名字：小雨`、`口头禅：诶`），LLM 把它当角色简介来"播报"，产生 AI 味
- 修复：改为行为指令格式，每个字段转为"你会怎么做"的自然语言指令
  - 身份：`你叫小雨，22岁，大学生。如果对方问起，就这么说。不要主动自我介绍。`
  - 说话方式：`你说话经常用"诶"、"嘛"这样的词。`
  - 情绪：`你在被忽视、不被理解的时候容易不舒服。`
  - 和人相处：`你不太主动找人聊天，但会默默关心。`
  - 你的想法：心智模型、决策启发、表达DNA 合并为自然语言段落
  - 你的价值观：追求/拒绝/内在矛盾合为一段
  - MBTI/星座不再输出（可从行为指令中体现）
- 重要记忆和人际关系保持列表格式不变（事实性上下文）

#### 2. CORE_SYSTEM_PROMPT 重写 - 13:10
- 状态：✅ 已完成
- 文件：`src/core/core-system.ts`
- 改动点：
  - 系统身份从"你是一个情感陪伴AI"改为"你是一个真实存在的人"
  - 回复格式规范：增加"不用感叹号"、"不要排比句/修辞/散文"、"可以说一半改口"
  - 新增"不要做这些"章节：
    - 第一次说话不要自我介绍
    - 不要主动问"你呢？"来延续对话
    - 不要总结式发言
    - 不要问对方是否需要帮助
  - 危机识别保留（移入"不要做这些"末尾）

#### 3. 情绪指令具体化 - 13:10
- 状态：✅ 已完成
- 文件：`src/core/context-builder.ts`
- 问题：情绪 styleMap 使用抽象描述（"语气温柔、体贴"），LLM 不知道具体怎么做
- 修复：改为具体行为示例
  - gentle: `你现在很温柔，会多听对方说，回应简短但温暖，比如"嗯嗯"、"我在听"。`
  - concerned: `你现在有点担心对方，会主动问"你还好吗"，语气会轻一些。`

### UI 修复

#### 4. 底部 Tab 高亮 - 13:15
- 状态：✅ 已完成
- 文件：`src/navigation/AppNavigator.tsx`
- 问题：选中/未选中 tab 无明显视觉区分
- 修复：选中 tab 图标 opacity 1 + 放大，未选中 opacity 0.5

#### 5. ChatScreen 顶部栏安全区域 - 13:15
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx`
- 问题：返回按钮和角色名与手机状态栏重叠，点不到
- 修复：使用 `useSafeAreaInsets()` 获取状态栏高度，topBar paddingTop = 状态栏高度 + 8px

#### 6. ConversationListScreen 安全区域 - 13:15
- 状态：✅ 已完成
- 文件：`src/screens/ConversationListScreen.tsx`
- 问题：列表顶部被状态栏遮挡
- 修复：使用 `useSafeAreaInsets()` 给容器加 paddingTop

### 改动文件清单
- `src/personality/character.ts`（重写 formatPersonaForPrompt 为行为式）
- `src/core/core-system.ts`（重写 CORE_SYSTEM_PROMPT）
- `src/core/context-builder.ts`（情绪 styleMap 具体化）
- `src/navigation/AppNavigator.tsx`（Tab 高亮）
- `src/screens/ChatScreen.tsx`（安全区域）
- `src/screens/ConversationListScreen.tsx`（安全区域）

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要重启 Expo 测试

---

## 2026-06-28 14:00

### 角色创建 Prompt 行为化

#### PARSE_PROMPT 重写 - 14:00
- 状态：✅ 已完成
- 文件：`src/personality/character-creator.ts`
- 问题：原 PARSE_PROMPT 的 JSON schema 用短标签作为示例（`"口头禅"`、`"正式程度"`），LLM 输出也是短标签（`"含蓄"`、`"被动"`），导致生成的角色不像真人
- 修复：
  - 每个字段的示例改为行为描述指引
  - 新增明确规则：每个字段必须写成完整的行为描述句子，不要短标签
  - 提供好坏对比示例（好："她不太会拒绝别人" / 坏："不善拒绝"）
  - QA_PROMPT 同步更新

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要在 app 中测试"文本创建"功能

---

## 2026-06-28 15:00

### 会话摘要去重 + 用户画像系统重写

#### 1. session-summary 去重 - 15:05
- 状态：✅ 已完成
- 文件：`src/core/session-summary.ts`
- 问题：`generateSummary` 每次调用都 INSERT 新行，同一 session 产生多条摘要
- 修复：INSERT 前查询是否已有该 session 的摘要，有则 UPDATE，无则 INSERT

#### 2. 用户画像三层结构重写 - 15:15
- 状态：✅ 已完成
- 文件：`src/profile/user-profile.ts`（完整重写）
- 改动：
  - 新增 `UserPersona` 接口，与 `CharacterPersona` 对称的 Part A/B/C 三层结构
  - `getOrCreate` / `updateProfile` 适配新结构
  - `getProfileSummary` 按三层结构生成摘要
  - 新增 `extractFromConversation`：LLM 从对话中提取用户信息，自动更新画像
  - 新增 `exportProfile` / `importProfile`：JSON 导入导出
  - 新增 `exportAsCharacter`：将用户画像导出为可导入的角色 JSON
  - `deepMerge` 函数：深度递归合并画像数据

#### 3. agent-loop 接入画像自动更新 - 15:20
- 状态：✅ 已完成
- 文件：`src/core/agent-loop.ts`
- 改动：reflect 阶段每20轮触发 `userProfileManager.extractFromConversation`
- 用户画像为全局数据（characterId = -1），所有角色共享

#### 4. session-manager 新增方法 - 15:20
- 状态：✅ 已完成
- 文件：`src/core/session-manager.ts`
- 新增 `getRecentMessages(sessionId, count)`：获取指定数量的最近消息

#### 5. CharacterScreen 用户画像管理 - 15:30
- 状态：✅ 已完成
- 文件：`src/screens/CharacterScreen.tsx`
- 新增"我的画像"section：
  - 显示画像摘要（名字、年龄、职业、MBTI、核心矛盾）
  - 导出画像 JSON
  - 导出为角色 JSON（可直接导入为新角色）
  - 从画像创建角色
  - 导入画像 JSON
- 画像为空时显示"暂无画像，对话20轮后自动生成"

#### 6. ChatScreen 画像查询修正 - 15:30
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx`
- 改动：`getProfileSummary(characterId)` → `getProfileSummary(-1)` 使用全局用户画像

### 改动文件清单
- `src/core/session-summary.ts`（去重逻辑）
- `src/profile/user-profile.ts`（完整重写：三层结构 + LLM提取 + 导入导出）
- `src/core/agent-loop.ts`（画像自动更新接入）
- `src/core/session-manager.ts`（新增 getRecentMessages）
- `src/screens/CharacterScreen.tsx`（画像管理 UI）
- `src/screens/ChatScreen.tsx`（画像查询修正）

### 设计决策
- 用户画像与角色人格对称（Part A/B/C 三层结构），数据格式统一
- 用户画像是全局的（characterId = -1），不按角色隔离
- 画像可导出为角色 JSON，实现"用户画像 → 新角色"的转换
- 画像自动更新频率：每20轮对话触发一次 LLM 提取
- 会话摘要每个 session 最多一条，有则更新

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要测试：画像自动更新、导出为角色、摘要去重

---

## 2026-06-28 18:00

### 记忆系统重写 + 会话摘要滚动队列

#### 1. 记忆来源分类（user/ai/cross） - 18:05
- 状态：✅ 已完成
- 文件：`src/memory/memory-extractor.ts`（重写）、`src/memory/memory-system.ts`、`src/database/schema.ts`
- 问题：原记忆提取只从用户消息中提取信息，AI 角色自己说的话（编的故事、表达的偏好）没有被记录，导致用户再次问到时前言不搭后语
- 修复：
  - `MemoryTags` 接口新增 `source?: 'user' | 'ai' | 'cross'` 字段
  - `MemoryNode.tags` 同步更新
  - `memory-extractor.ts` 完全重写提取 prompt，从用户和 AI 双方消息中提取记忆
  - 每条记忆标注来源：`user`（用户事实/偏好）、`ai`（角色自己的陈述/故事）、`cross`（双方互动产生的共识/评价）
- 设计决策：source 存储在 tags JSON 字段中，向后兼容，旧记忆 tags 为数组格式时 `parseMemory` 自动转换

#### 2. 记忆提取输入优化 - 18:05
- 状态：✅ 已完成
- 文件：`src/memory/memory-extractor.ts`
- 问题：原实现只传入当前轮次的用户消息+AI回复，信息不完整（用户可能在回应上一轮 AI 的内容）
- 修复：`extractFromConversation` 签名从 `(userMessage, aiResponse, sessionId, characterId)` 改为 `(recentMessages: Message[], sessionId, characterId)`
  - 传入最近 3 轮（6 条消息）作为上下文
  - 每 2 轮触发一次（agent-loop 中每 4 条消息触发）
  - 支持单次提取多条记忆（prompt 要求返回 JSON 数组）

#### 3. 会话摘要滚动队列 - 18:10
- 状态：✅ 已完成
- 文件：`src/core/session-summary.ts`
- 问题：原实现每个 session 只保留一条摘要（有则覆盖），丢失了更早轮次的压缩信息
- 修复：
  - 改为滚动队列，最多保留 10 条摘要（每条覆盖 5 轮，可追溯 50 轮）
  - 每次 INSERT 新摘要，然后 DELETE 超过 10 条的旧记录（FIFO 淘汰）
  - 新增 `getSummaries(sessionId, limit)` 方法，返回按时间倒序的摘要列表
  - `getLatestSummary` 保持不变，向后兼容

#### 4. agent-loop 反思频率修正 - 18:15
- 状态：✅ 已完成
- 文件：`src/core/agent-loop.ts`、`src/core/session-manager.ts`
- 问题：原实现记忆提取每轮都触发（浪费 token），会话摘要每 5 条消息触发（而非 5 轮）
- 修复：
  - 记忆提取：每 4 条消息（2 轮）触发，传入最近 6 条消息（3 轮）
  - 会话摘要：每 10 条消息（5 轮）触发，传入最近 10 条消息（5 轮）
  - 用户画像：每 20 轮触发（不变）
  - `session-manager.ts` 触发标志同步更新：`memoryTrigger=4`、`summaryTrigger=10`

#### 5. 上下文组装器适配 - 18:15
- 状态：✅ 已完成
- 文件：`src/core/context-builder.ts`
- 改动：
  - `WorkingMemory.summary: string | null` → `summaries: SessionSummary[]`
  - 会话摘要注入改为遍历数组，按编号排列显示
  - 导入 `SessionSummary` 类型

#### 6. MemoryCard 来源标签 - 18:20
- 状态：✅ 已完成
- 文件：`src/components/MemoryCard.tsx`
- 改动：新增来源标签显示（用户/AI/交叉），颜色区分：
  - 用户（绿色 #E8F5E9）
  - AI（橙色 #FFF3E0）
  - 交叉（蓝色 #E3F2FD）
- 标签位于 header 区域权重文字旁

### 改动文件清单
- `src/memory/memory-extractor.ts`（重写：来源分类 + 多轮输入 + 多条提取）
- `src/memory/memory-system.ts`（MemoryTags 新增 source 字段）
- `src/database/schema.ts`（MemoryNode.tags 新增 source 字段）
- `src/core/session-summary.ts`（滚动队列 + getSummaries 方法）
- `src/core/session-manager.ts`（WorkingMemory.summaries + 触发频率修正）
- `src/core/agent-loop.ts`（reflect 方法重写：频率 + Message[] 传参）
- `src/core/context-builder.ts`（摘要数组适配）
- `src/components/MemoryCard.tsx`（来源标签显示）

### 设计决策
- 记忆来源三分类：user（用户事实）、ai（角色陈述）、cross（互动共识）
- 记忆提取每 2 轮触发，传入 3 轮上下文（多覆盖 1 轮保证信息完整性）
- 会话摘要改为滚动队列（最多 10 条），而非单条覆盖
- 来源信息存储在 tags JSON 中，不新增数据库列，向后兼容

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ⏳ 需要重启 Expo 测试：记忆来源标签、摘要滚动队列、提取频率

## 2026-06-28 20:00

### 记忆提取触发逻辑修复 + 死代码清理

#### 1. 记忆提取永不触发 bug 修复（严重） - 20:00
- 状态：✅ 已完成
- 文件：`src/core/agent-loop.ts`、`src/core/session-manager.ts`
- 问题：记忆提取、会话摘要、用户画像三个后台任务从未触发，导致对话 10+ 轮后记忆数仍为 0
- 根因分析：
  - `turnCount` 是消息总数（user+AI），reflect 在 AI 回复后、保存 AI 消息前调用
  - 此时 turnCount 为奇数（1, 3, 5, 7...），而 `turnCount % 4 === 0` 永远不匹配奇数
  - 中间尝试过 `round = Math.floor(turnCount/2)` + `round % 2 === 0`，但 floor(奇数/2) 仍为奇数
  - 最终方案：彻底抛弃 modulo 逻辑，改为查询数据库判断距上次操作的用户消息数
- 修复：
  - 新增 `sessionManager.getMessagesSinceLastMemory(sessionId, characterId)` — 查询 memory_nodes 表最新记录时间
  - 新增 `sessionManager.getMessagesSinceLastSummary(sessionId)` — 查询 session_summaries 表最新记录时间
  - 新增 `sessionManager.getMessagesSinceLastProfileUpdate()` — 查询 user_profiles 表最新更新时间
  - agent-loop reflect 方法改为基于数据库差值判断触发：>= 2 条用户消息提取记忆，>= 5 条生成摘要，>= 20 条更新画像
- 优势：不受重启影响，不依赖内存状态，每次从数据库读取真实进度

#### 2. 重启后重复触发 bug 修复 - 20:00
- 状态：✅ 已完成
- 文件：`src/core/agent-loop.ts`
- 问题：前一版修复使用 `lastMemoryExtractAt` 等内存变量，app 重启后变量归零，第一条消息会同时触发三个后台任务
- 修复：改用数据库查询代替内存变量，重启后自动恢复正确状态

#### 3. session-manager.ts 死代码清理 - 20:05
- 状态：✅ 已完成
- 文件：`src/core/session-manager.ts`
- 移除：
  - `lastMemoryExtractAt`、`lastSummaryAt`、`lastProfileUpdateAt` 内联变量（已废弃）
  - `getBackgroundTaskFlags()` 方法（返回的字段全部未使用）
  - `WorkingMemory` 接口中废弃的触发标志字段

#### 4. session-summary.ts 死代码清理 - 20:05
- 状态：✅ 已完成
- 文件：`src/core/session-summary.ts`
- 移除：
  - `getSummaries(sessionId, limit)` 方法（滚动队列改用 context-builder 直接查询）
  - `getLatestSummary(sessionId)` 方法（已无调用方）

#### 5. context-builder.ts 未使用导入清理 - 20:05
- 状态：✅ 已完成
- 文件：`src/core/context-builder.ts`
- 移除：`SessionSummary` 类型导入（未使用）

### 改动文件清单
- `src/core/agent-loop.ts`（reflect 方法重写：数据库查询替代 modulo + 内存变量）
- `src/core/session-manager.ts`（新增 3 个查询方法 + 清理死代码）
- `src/core/session-summary.ts`（移除未使用的方法）
- `src/core/context-builder.ts`（移除未使用的导入）

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ✅ Expo 重启成功（localhost:8081）
- ⏳ 需要用户测试：对话 2 轮后检查 memory_nodes 是否有新记录

## 2026-06-28 22:00

### 记忆系统全面优化 + 画像修复 + 编辑删除

#### 1. 用户画像生成修复 - 22:00
- 状态：✅ 已完成
- 文件：`src/profile/user-profile.ts`
- 问题：画像从未生成——INSERT 未设置 updated_at 导致查询返回 NULL，LLM 输出 max_tokens 2048 不够导致 JSON 截断
- 修复：
  - INSERT 加 `updated_at = datetime('now')`
  - max_tokens 2048 → 8000
  - prompt 加规则：没有信息的字段输出空字符串/空数组，不要编造

#### 2. 非重叠窗口记忆提取 - 22:05
- 状态：✅ 已完成
- 文件：`src/core/session-manager.ts`、`src/core/agent-loop.ts`
- 问题：每次提取传入最近 6 条消息，相邻两次提取窗口重叠 4 条，导致同一段对话被反复提取产生重复记忆
- 修复：
  - 新增 `getMessagesForExtraction(sessionId, characterId)` 方法
  - 查最后一条记忆的 created_at，返回之后的消息 + 2 条上下文重叠
  - 效果：1-6 → 5-8 → 7-12，不再全量重叠

#### 3. 记忆去重（事前 + 事后） - 22:10
- 状态：✅ 已完成
- 文件：`src/memory/memory-system.ts`、`src/memory/memory-extractor.ts`
- 修复：
  - 事前：非重叠窗口（根源解决）
  - 事后：提取后调 `dedupMemory` 检查——同角色 + 标签 100% 匹配 → 内容相似度 > 80% 合并，60-80% 降权
  - 新增 `contentSimilarity` 辅助函数（关键词重合率）

#### 4. touchMemory 动态增量 - 22:10
- 状态：✅ 已完成
- 文件：`src/memory/memory-system.ts`
- 问题：每次访问 +0.05，高频记忆权重涨到 1.0 后永远占位
- 修复：
  - > 7 天未访问 → 增量 0.05（正常奖励）
  - <= 7 天 → 增量 = 0.05 × e^(-0.3 × access_count)，指数递减
  - 最低保底 0.005

#### 5. RAG 去重惩罚因子 - 22:15
- 状态：✅ 已完成
- 文件：`src/memory/vector-store.ts`
- 问题：同标签组的记忆永远霸占 RAG 结果
- 修复：
  - 返回数量 10 → 15
  - 选择过程中检测标签重合度 > 50%，对后续同组记忆 finalScore × 0.85
  - 非硬限制，真正重要的同组记忆仍可入选

#### 6. 记忆编辑功能 - 22:20
- 状态：✅ 已完成
- 文件：`src/components/MemoryCard.tsx`、`src/screens/MemoryScreen.tsx`
- 功能：
  - 点击卡片弹出编辑 Modal
  - 可修改内容、据实标签、记忆分类
  - 保存时更新 memory_nodes + tags 表
  - 内容变化时自动调 vectorStore.embedAndStore 重算向量

#### 7. 记忆删除功能 - 22:20
- 状态：✅ 已完成
- 文件：`src/components/MemoryCard.tsx`、`src/memory/memory-system.ts`
- 功能：
  - 卡片右侧显示删除按钮
  - 点击弹出确认弹窗（防误触）
  - 删除时清理 memory_nodes + tags + memory_vectors + memory_relations 四张表
  - 新增 `memorySystem.deleteMemory(id)` 方法

### 改动文件清单
- `src/profile/user-profile.ts`（INSERT updated_at + max_tokens + prompt 规则）
- `src/core/session-manager.ts`（新增 getMessagesForExtraction）
- `src/core/agent-loop.ts`（reflect 改用非重叠窗口）
- `src/memory/memory-system.ts`（动态增量 + dedupMemory + updateMemory + deleteMemory）
- `src/memory/memory-extractor.ts`（提取后去重检查）
- `src/memory/vector-store.ts`（RAG 去重惩罚 + 返回 15 条）
- `src/components/MemoryCard.tsx`（编辑删除 UI）
- `src/screens/MemoryScreen.tsx`（传入 onUpdate/onDelete 回调）

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ✅ Expo 重启成功（localhost:8081）
- ⏳ 需要测试：画像生成、记忆去重、编辑删除、RAG 多样性

## 2026-06-28 23:00

### 记忆提取触发逻辑修正

#### 1. 触发条件改为总消息数 - 23:00
- 状态：✅ 已完成
- 文件：`src/core/session-manager.ts`、`src/core/agent-loop.ts`
- 问题：之前用用户消息数判断触发，但 AI 可能一次回复多条消息，用户消息数不能准确反映对话进度
- 修复：
  - `getMessagesSinceLastMemory` SQL 去掉 `AND role = 'user'`，改为统计所有消息
  - 阈值从 `>= 2` 改为 `>= 5`（每 5 条总消息触发一次）

#### 2. 首次会话不再立即触发 - 23:00
- 状态：✅ 已完成
- 文件：`src/core/session-manager.ts`
- 问题：无记忆时返回 999，导致首次 reflect 就触发提取（此时只有 1-2 条消息）
- 修复：无记忆时返回该 session 的实际消息数，攒够 5 条才触发

#### 3. 提取窗口简化 - 23:00
- 状态：✅ 已完成
- 文件：`src/core/session-manager.ts`
- 问题：之前用 created_at 时间戳做复杂的索引计算，逻辑混乱且窗口大小不固定
- 修复：`getMessagesForExtraction` 简化为直接调 `getRecentMessages(sessionId, 6)`，固定 6 条

### 改动文件清单
- `src/core/session-manager.ts`（触发改为总消息数 + 首次不立即触发 + 窗口简化）
- `src/core/agent-loop.ts`（阈值 >= 2 改为 >= 5）

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ✅ Expo 重启成功（localhost:8081）
- ⏳ 需要测试：首次会话 5 条消息后触发提取、后续每 5 条触发一次

## 2026-06-28 23:30

### AI 时间感知

#### 1. 当前时间注入 - 23:30
- 状态：✅ 已完成
- 文件：`src/core/context-builder.ts`
- 改动：在角色人格之后注入当前时间 system message
- 格式：`[当前时间]\n2026年6月28日 星期六 23:30`

#### 2. 工作记忆带时间戳 - 23:30
- 状态：✅ 已完成
- 文件：`src/core/context-builder.ts`
- 改动：工作记忆每条消息前加发送时间
- 格式：`[22:30] 用户：今天好累啊` 或 `[6/27 22:30] AI：怎么了`
- 今天的消息只显示时分，非今天的加日期
- AI 可以通过时间戳判断两次对话间隔多久

#### 3. 系统提示加时间规则 - 23:30
- 状态：✅ 已完成
- 文件：`src/core/core-system.ts`
- 改动：新增"时间感知"段落，指导 AI：
  - 根据时段调整打招呼方式
  - 对话间隔长时自然提及
  - 不在错误的时间说不匹配的话

### 改动文件清单
- `src/core/context-builder.ts`（注入当前时间 + 工作记忆加时间戳 + formatMessageTime 函数）
- `src/core/core-system.ts`（系统提示新增时间感知规则）

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ✅ Expo 重启成功（localhost:8081）
- ⏳ 需要测试：AI 是否根据时间调整问候、是否能感知对话间隔

---

## 2026-06-29 00:00

### 聊天体验优化 + 画像/摘要 UI 修复

#### 1. 解除输入锁定 - 00:05
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx`
- 问题：AI 回复期间输入框被禁用（isLoading 锁），用户不能连续发消息
- 修复：移除 `isLoading` 对 handleSend 的守卫，移除 InputBar 的 `disabled={isLoading}` 属性

#### 2. 消息可复制 - 00:05
- 状态：✅ 已完成
- 文件：`src/components/MessageBubble.tsx`
- 问题：消息文字无法选中复制
- 修复：Text 组件添加 `selectable` 属性

#### 3. 多气泡分段发送优化（三次迭代） - 00:10
- 状态：✅ 已完成
- 文件：`src/core/core-system.ts`
- 问题 1：AI 用单换行 `\n` 分隔内容，不触发分气泡
- 问题 2：改为"两句一段"后太机械，10 轮对话没有一次多气泡
- 问题 3：空行分段规则不明确，AI 不知道什么时候该分
- 最终方案：规则 #3 改为"想多说就多说，想少说就少说，需要分段时用空行隔开，每段作为独立消息气泡。不要用单换行，要么连着写，要么用空行分段。"

#### 4. AI 主动话题规则 - 00:15
- 状态：✅ 已完成
- 文件：`src/core/core-system.ts`
- 问题：AI 永远顺着用户话题，不会主动提新话题，太机械
- 修复：新增规则 #9："不要永远只接对方的话。像真人聊天一样，有时候突然想起什么就说了，岔开话题、分享自己的事、提到你生活里的细节，都可以。聊天不是问答，是你来我往。"

#### 5. 对话摘要前端展示 - 00:20
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx`
- 问题：对话摘要在后台生成但用户完全看不到
- 修复：
  - 在顶部栏下方新增可折叠摘要区域（默认收起）
  - 点击展开显示最近 10 条摘要（按时间倒序）
  - 无摘要时不显示该区域
  - 新增状态：`summaries`（SessionSummary[]）、`showSummary`（boolean）
  - useFocusEffect 中查询 session_summaries 表
  - FlatList 添加 `style={{ flex: 1 }}` 修复与摘要区域的重叠问题

#### 6. 用户画像前端显示修复 - 00:25
- 状态：✅ 已完成
- 文件：`src/screens/CharacterScreen.tsx`
- 问题：画像已在后台成功生成（日志确认），但 UI 始终显示"暂无画像"
- 根因：
  1. 显示条件只检查 `userProfile.partA.identity.name`，用户未说名字时条件为 false
  2. `useEffect` 只在组件挂载时加载一次，画像异步生成后 UI 不刷新
- 修复：
  - 显示条件改为检查 name/age/occupation/city 四个字段中任意一个
  - `useEffect` 改为 `useFocusEffect`，每次页面聚焦时重新从数据库读取画像
  - 显示内容增加 fallback：名字为空时显示"未知名字"

#### 7. RESET_DB 关闭 - 00:30
- 状态：✅ 已完成
- 文件：`App.tsx`
- 改动：`RESET_DB = true` → `RESET_DB = false`
- 效果：每次启动不再清空数据库，用户数据（对话、画像、记忆）持久保留

### 改动文件清单
- `src/screens/ChatScreen.tsx`（解除输入锁 + 摘要展示 + FlatList 修复）
- `src/components/MessageBubble.tsx`（selectable 属性）
- `src/core/core-system.ts`（分段规则优化 + AI 主动话题）
- `src/screens/CharacterScreen.tsx`（useFocusEffect + 显示条件修复）
- `App.tsx`（RESET_DB = false）

### 设计决策
- 输入不锁定：用户可以连续发消息，AI 逐条处理，体验更自然
- 分段规则：不强制字数/句数，让 AI 自然判断何时分段，只规定"用空行分段"的格式
- 摘要可折叠：默认收起不干扰聊天，需要时可展开回顾
- 画像全局共享：characterId = -1，所有角色对话都贡献到同一个用户画像
- useFocusEffect：异步后台数据的 UI 展示标准模式，每次页面聚焦时刷新

### 测试状态
- ✅ TypeScript 编译通过（零错误）
- ✅ 画像生成全链路验证（日志确认：Extracting → LLM → Parsed → updateProfile → Auto-updated）
- ✅ 摘要生成正常（日志确认：SessionSummary Generated）
- ⏳ 需要用户验证：画像 UI 是否正常显示、摘要折叠交互

---

## 2026-06-29 01:00

### 聊天列表改为反转列表（inverted FlatList）

#### 1. 进入聊天直接在底部 - 01:00
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx`
- 问题：进入聊天页面时有滚动动画，历史消息长时要滚很久才到底部
- 修复：
  - FlatList 添加 `inverted={true}`，从底部开始渲染
  - 历史消息数组加载后 `reverse()`，最新消息排在数组首位
  - 新消息用 `[msg, ...prev]` 插入数组头部（视觉上在底部）
  - 删除 `setTimeout(() => scrollToEnd)` hack
  - 删除 `initialScrollDone` ref 等无用逻辑

#### 2. 历史消息无入场动画 - 01:00
- 状态：✅ 已完成
- 文件：`src/components/MessageBubble.tsx`
- 问题：每次进入聊天，所有气泡都有弹出动画（淡入+滑动）
- 修复：
  - 新增 `animate` prop，默认 `false`
  - 历史消息直接渲染，无动画
  - 新消息（`isNew: true`）才有入场动画

#### 3. 清理无用状态 - 01:00
- 状态：✅ 已完成
- 文件：`src/screens/ChatScreen.tsx`
- 移除 `isLoading` 状态（之前解除输入锁后未清理，成为死代码）

### 改动文件清单
- `src/screens/ChatScreen.tsx`（inverted FlatList + 数据倒序 + 清理死代码）
- `src/components/MessageBubble.tsx`（animate prop）

### 设计决策
- 标准聊天 UI 模式：inverted FlatList 从底部渲染，无需任何滚动 hack
- 数据倒序：最新消息在数组首位，新消息插入头部
- 历史消息无动画：直接渲染，避免长列表的弹出效果
- 新消息保留动画：仅当前会话的消息有入场动效

---

## 2026-06-29 02:00

### 工具调用 + UI 升级 + 记忆图谱（三阶段实施）

#### Phase 1: 工具调用接入 - 02:00
- 状态：✅ 已完成

##### 1. llm-client.ts 类型扩展 - 02:05
- 文件：`src/api/llm-client.ts`
- 新增 `ToolCall`、`ToolDefinition` 接口
- `ChatMessage` 改为联合类型，支持 `tool` role 和 `tool_calls` 字段
- `chat()` 增加可选 `tools?: ToolDefinition[]` 参数，自动设置 `tool_choice: 'auto'`

##### 2. tool-registry.ts 新增 getToolDefinitions - 02:05
- 文件：`src/tools/tool-registry.ts`
- 新增 `getToolDefinitions()` 方法，将注册工具转为 OpenAI function calling 格式
- 导入 `ToolDefinition` 类型

##### 3. web-search / web-fetch 参数描述 - 02:10
- 文件：`src/tools/web-search.ts`、`src/tools/web-fetch.ts`
- parameters 增加 `description` 字段，让 LLM 知道何时使用哪个工具

##### 4. agent-loop.ts 工具调用循环 - 02:15
- 文件：`src/core/agent-loop.ts`
- `fullPath` 方法重写：LLM → 检查 tool_calls → 执行工具 → 追加结果 → 再次 LLM（最多 3 轮）
- `fastPath` 不变（情感/闲聊不走工具）
- 工具执行日志：`[AgentLoop] Tool call round N: tool_name`

##### 5. core-system.ts 工具使用说明 - 02:20
- 文件：`src/core/core-system.ts`
- 系统提示新增"工具使用"段落：指导 AI 何时搜索/抓取，不要主动搜索

#### Phase 2: UI 升级 - 02:25
- 状态：✅ 已完成

##### 1. 卡片阴影 - 02:25
- 文件：`src/components/MemoryCard.tsx`、`src/screens/ConversationListScreen.tsx`、`src/screens/SettingsScreen.tsx`
- 所有卡片替换 `borderWidth/borderColor` 为 `shadowColor/shadowOffset/shadowOpacity/shadowRadius/elevation`
- 视觉效果更立体，仿 iOS/Android 原生卡片风格

##### 2. 记忆权重可视化条 - 02:30
- 文件：`src/components/MemoryCard.tsx`
- 内容下方新增细色条，宽度按 `decayedWeight` 比例（最低 5%）
- 颜色：紫色 `#6C63FF`

##### 3. 记忆排序 - 02:35
- 文件：`src/screens/MemoryScreen.tsx`、`src/memory/memory-system.ts`
- 筛选区新增排序选项：最近创建 / 权重最高 / 访问最多
- 新增 `memorySystem.getMemoriesSorted(sortBy)` 方法，支持三种排序字段

#### Phase 3: 记忆图谱 - 02:40
- 状态：✅ 已完成

##### 1. 图谱数据服务 - 02:40
- 新增文件：`src/memory/graph-data.ts`
- 从 tags 表查询 factual 标签，计算共享标签作为边
- 节点上限 100 个，按权重排序
- 接口：`GraphNode`、`GraphEdge`、`GraphData`

##### 2. d3-force 力导向布局 - 02:45
- 新增文件：`src/memory/graph-layout.ts`
- 使用 d3-force 模拟：forceLink + forceManyBody + forceCenter + forceCollide
- 同步运行 120 次迭代，坐标钳制到画布范围
- 节点半径按权重动态计算：`6 + weight * 16`

##### 3. MemoryGraph SVG 渲染 - 02:50
- 新增文件：`src/components/MemoryGraph.tsx`
- react-native-svg 渲染：节点圆（颜色按记忆分类）+ 虚线边 + 文字标签
- 点击节点显示详情卡片（内容 + 权重 + 分类标签）
- 底部颜色图例（7 种记忆分类）

##### 4. MemoryGraphScreen + 导航集成 - 02:55
- 新增文件：`src/screens/MemoryGraphScreen.tsx`
- 角色筛选器 + 节点/连接数统计
- 返回按钮（紫色顶栏，与 ChatScreen 一致）
- `AppNavigator.tsx`：Memory Tab 改为 Stack（MemoryList → MemoryGraph）
- `MemoryScreen.tsx`：顶部新增"图谱"按钮

##### 依赖安装
- `react-native-svg`（Expo 原生支持）
- `d3-force` + `@types/d3-force`（纯 JS 力导向布局）

#### 审计修复 - 03:00

##### 1. graph-data.ts 未使用导入清理
- 文件：`src/memory/graph-data.ts`
- 移除未使用的 `MemoryNode` 和 `memorySystem` 导入

##### 2. MemoryGraphScreen useFocusEffect 清理
- 文件：`src/screens/MemoryGraphScreen.tsx`
- 第一个 useFocusEffect 补齐 `cancelled` 清理标志

##### 3. MemoryGraphScreen 返回按钮
- 文件：`src/screens/MemoryGraphScreen.tsx`
- 新增紫色顶栏 + "返回"按钮 + "记忆图谱"标题

### 改动文件清单

**修改的文件（7 个）：**
- `src/api/llm-client.ts`（ToolCall/ToolDefinition 类型 + tools 参数）
- `src/tools/tool-registry.ts`（getToolDefinitions 方法）
- `src/tools/web-search.ts`（参数 description）
- `src/tools/web-fetch.ts`（参数 description）
- `src/core/agent-loop.ts`（fullPath 工具调用循环）
- `src/core/core-system.ts`（工具使用段落）
- `src/memory/memory-system.ts`（getMemoriesSorted 方法）

**修改的 UI 文件（4 个）：**
- `src/components/MemoryCard.tsx`（阴影 + 权重条）
- `src/screens/ConversationListScreen.tsx`（卡片阴影）
- `src/screens/SettingsScreen.tsx`（卡片阴影）
- `src/screens/MemoryScreen.tsx`（排序 + 图谱按钮）

**新增文件（4 个）：**
- `src/memory/graph-data.ts`（图谱数据计算）
- `src/memory/graph-layout.ts`（d3-force 布局）
- `src/components/MemoryGraph.tsx`（SVG 渲染组件）
- `src/screens/MemoryGraphScreen.tsx`（图谱页面）

**导航改动（1 个）：**
- `src/navigation/AppNavigator.tsx`（Memory Tab → Stack Navigator）

### 设计决策
- 工具调用只在 fullPath（task 意图）中启用，fastPath（emotion/chat）不走工具
- MAX_TOOL_ROUNDS = 3，防止工具调用死循环
- 记忆图谱边来源于共享 factual 标签（实时计算，不存储），避免 memory_relations 表未填充的问题
- 图谱节点上限 100 个，防止大记忆库导致渲染卡顿
- d3-force 同步运行 120 次迭代，不依赖 requestAnimationFrame
- 卡片阴影替代边框，视觉更现代

### 测试状态
- ✅ 审计通过（无阻断性问题）
- ⏳ 需要测试：AI 联网搜索、卡片阴影视觉、权重条显示、排序切换、图谱渲染和交互
