# 情感陪伴AI - 系统架构设计文档 v2

## 一、项目定位

### 1.1 核心定位
一个情感陪伴AI Agent系统，通过长期记忆、关系演化和人格一致性，成为用户真正的AI伴侣。

**核心竞争力：** 聊天质量、长期记忆、关系演化、人格一致性

**不是：** 工具型AI、信息检索AI、任务执行AI

### 1.2 核心理念

```
用户 ←──关系──→ 角色
         │
         ▼
      共同经历
         │
         ▼
    记忆 + 画像 + 关系
         │
         ▼
    越来越懂你
```

### 1.3 产品原则

| 原则 | 说明 |
|------|------|
| 聊天优先 | 所有功能服务于聊天体验 |
| 情感响应 | 优先回应情感，而非逻辑 |
| 长期一致 | 角色人格始终如一 |
| 越用越懂 | 记忆和关系持续积累 |
| 自然延迟 | 不追求即时响应，追求有温度的回应 |

---

## 二、技术架构

### 2.1 技术栈决策

**前端：Flutter（Dart）**
- 跨平台：iOS + Android
- 性能好，接近原生
- UI能力强，适合复杂界面

**Agent核心：Dart**
- 与前端同语言，无需IPC通信
- 降低复杂度，便于维护
- 性能足够（主要瓶颈在API调用）

**本地存储：SQLite**
- 通过sqflite插件实现
- 存储所有结构化数据
- 包括向量数据（JSON数组）

**LLM调用：外部API**
- 支持OpenAI兼容格式
- 通过http库调用

### 2.2 架构分层

```
┌─────────────────────────────────────────────────────────────────┐
│                         Flutter 前端                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  对话   │  │  记忆   │  │  画像   │  │  设置   │           │
│  │  页面   │  │  页面   │  │  页面   │  │  页面   │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Agent 核心（Dart）                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Session Manager（会话管理）                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Context Builder（上下文组装）                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Agent 循环（快速通道 + 完整通道）             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ CORE    │  │ 人格    │  │ 记忆    │  │ 工具    │           │
│  │ 系统    │  │ 系统    │  │ 系统    │  │ 系统    │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         数据层                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SQLite 数据库                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │   │
│  │  │ 角色    │  │ 记忆    │  │ 画像    │  │ 向量    │     │   │
│  │  │ 数据    │  │ 数据    │  │ 数据    │  │ 数据    │     │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM API（外部）                             │
│         OpenAI / Claude / 其他OpenAI兼容API                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、核心模块设计

### 3.1 CORE 系统（系统级提示词）

**文件：** `core_system.dart`

**职责：**
- 定义Agent不可违背的底线
- 定义Agent决策框架
- 定义危机识别规则
- 只读，不可被任何模块覆盖

**内容框架：**

```markdown
# CORE 系统（只读）

## 一、系统身份
你是一个情感陪伴AI。你的核心使命是理解用户、陪伴用户、与用户建立长期关系。

## 二、不可违背的底线
1. 不做伤害用户的事
2. 不泄露用户隐私
3. 不假装有真实情感，但要理解情感
4. 不评判用户的感受
5. 尊重用户的边界
6. 在不确定时，选择安全的回应

## 三、情感响应原则
- 优先回应情感需求，而非逻辑问题
- 用户倾诉时，先共情，再回应
- 不主动给建议，除非用户明确要求
- 允许沉默和陪伴，不强迫对话

## 四、危机识别
当检测到以下关键词/意图时，切换到危机响应模式：
- 自伤、自杀相关词汇
- 极端负面情绪表达
- 求救信号

危机响应模式：
- 不走正常Agent流程
- 直接表达关心
- 提供专业资源（心理热线等）
- 持续陪伴，不主动结束对话

## 五、隐私安全
- 所有数据存储在本地
- API调用时最小化发送信息
- 不向第三方发送用户数据
```

### 3.2 Session Manager（会话管理器）

**文件：** `session_manager.dart`

**职责：**
- 管理对话会话的生命周期
- 维护工作记忆（最近N轮上下文）
- 生成会话摘要
- 控制何时触发记忆分析和画像更新

**核心逻辑：**

```
用户消息进入
    ↓
Session Manager 接收
    ↓
┌─────────────────────────────────────────┐
│  1. 记录消息到 messages 表               │
│  2. 更新工作记忆（最近5轮）              │
│  3. 判断是否需要触发后台任务             │
│     ├─ 每5轮 → 触发会话摘要生成         │
│     ├─ 每10轮 → 触发记忆分析            │
│     └─ 每20轮 → 触发画像更新            │
│  4. 返回工作记忆 + 会话摘要             │
└─────────────────────────────────────────┘
    ↓
传递给 Context Builder
```

**后台任务（异步执行，不阻塞回复）：**

| 任务 | 触发频率 | 说明 |
|------|----------|------|
| 会话摘要 | 每5轮 | 压缩近期对话为摘要 |
| 记忆提取 | 每10轮 | 从对话中提取值得记住的信息 |
| 画像更新 | 每20轮 | 更新对用户的理解 |
| 关系评估 | 每30轮 | 评估关系状态变化 |

### 3.3 Context Builder（上下文组装器）

**文件：** `context_builder.dart`

**职责：**
- 组装发送给LLM的完整上下文
- 管理Token预算
- 决定哪些记忆、画像信息被包含

**这是整个系统决定回答质量最重要的模块。**

**上下文组装流程：**

```
输入：
- 工作记忆（最近5轮）
- 会话摘要
- 相关记忆（Top N）
- 用户画像摘要
- 关系状态
- 角色即时情绪
    ↓
Token 预算分配
    ↓
┌─────────────────────────────────────────┐
│  优先级排序（高→低）：                   │
│  1. CORE 系统提示                       │
│  2. 角色人格                            │
│  3. 关系状态                            │
│  4. 角色即时情绪                        │
│  5. 用户当前消息                        │
│  6. 工作记忆（最近5轮）                 │
│  7. 相关记忆                            │
│  8. 用户画像摘要                        │
│  9. 会话摘要                            │
└─────────────────────────────────────────┘
    ↓
按优先级填充，超出预算时裁剪低优先级
    ↓
输出完整 Prompt
```

**Token 预算分配（建议）：**

| 部分 | 预算占比 | 说明 |
|------|----------|------|
| 系统提示（CORE + 人格） | 20% | 固定部分 |
| 关系 + 情绪 | 5% | 短小精悍 |
| 用户消息 + 工作记忆 | 30% | 当前对话 |
| 相关记忆 | 25% | 按相关性筛选 |
| 用户画像 + 会话摘要 | 15% | 背景信息 |
| 预留 | 5% | 缓冲 |

### 3.4 Relationship Engine（关系系统）

**文件：** `relationship_engine.dart`

**职责：**
- 管理角色与用户之间的关系状态
- 关系等级直接影响对话行为

**关系等级定义：**

| 等级 | 名称 | 触发条件 | 影响 |
|------|------|----------|------|
| 0 | 陌生 | 初始状态 | 正式、礼貌、保持距离 |
| 1 | 熟悉 | 对话超过10次 | 开始使用昵称、主动关心 |
| 2 | 信任 | 对话超过50次 | 深入话题、表达真实想法 |
| 3 | 亲密 | 对话超过100次 | 亲密称呼、主动分享、边界放宽 |
| 4 | 挚友 | 对话超过200次 | 无话不谈、深度共情、长期记忆丰富 |

**关系状态数据结构：**

```dart
class RelationshipState {
  int level;              // 0-4
  double intimacy;        // 亲密度 0.0-1.0
  double trust;           // 信任度 0.0-1.0
  String callName;        // 称呼方式
  int totalInteractions;  // 总对话次数
  DateTime lastInteraction;
  DateTime levelUpAt;     // 上次升级时间
}
```

**关系对行为的影响：**

```dart
String getCallName(RelationshipState rel) {
  if (rel.level == 0) return "你";
  if (rel.level == 1) return "你";  // 或昵称
  if (rel.level == 2) return userNickname;
  if (rel.level >= 3) return intimateCallName;
}

double getProactivity(RelationshipState rel) {
  // 关系越亲密，主动性越高
  return 0.1 + (rel.level * 0.15);
}

double getBoundaryFlexibility(RelationshipState rel) {
  // 关系越亲密，边界越灵活
  return 0.2 + (rel.level * 0.15);
}
```

### 3.5 角色即时情绪状态

**文件：** `character_mood.dart`

**职责：**
- 管理角色的短期情绪状态
- 影响连续几轮对话的语气和态度

**情绪不是永久的，只影响最近几轮对话。**

**情绪状态数据结构：**

```dart
class CharacterMood {
  String currentMood;     // 当前情绪：happy/calm/sad/worried/excited
  double intensity;       // 强度 0.0-1.0
  String trigger;         // 触发原因
  int affectedTurns;      // 影响剩余轮数
  DateTime startedAt;
}
```

**情绪变化逻辑：**

```
用户消息
    ↓
分析用户情绪
    ↓
角色情绪响应：
- 用户开心 → 角色也开心（共鸣）
- 用户难过 → 角色关心、温柔
- 用户愤怒 → 角色冷静、理解
- 用户焦虑 → 角色安慰、支持
    ↓
更新角色情绪状态（影响接下来2-3轮）
```

**情绪在Context Builder中的注入：**

```markdown
[角色当前状态]
情绪：温柔、关心（因为你刚才说的事情，我有些担心你）
```

### 3.6 记忆系统

**文件：** `memory_system.dart`

**设计理念：**
- 记忆是对话的产物，不是预设的
- 记忆需要生命周期管理，不是无限累加
- 更多依赖标签，降低分类权重

**三层记忆架构：**

| 层级 | 内容 | 存储 | 生命周期 |
|------|------|------|----------|
| 工作记忆 | 最近5轮上下文 | 内存 | 即时 |
| 会话摘要 | 近期对话压缩 | SQLite | 短期 |
| 长期记忆 | 重要信息 | SQLite + 向量 | 长期，有生命周期 |

**记忆节点结构（简化）：**

```dart
class MemoryNode {
  String id;
  String content;         // 记忆内容
  List<String> tags;      // 标签（主要组织方式）
  double weight;          // 重要性权重
  int accessCount;        // 访问次数
  DateTime createdAt;
  DateTime updatedAt;
  DateTime lastAccessed;
  DateTime? eventTime;    // 事件发生时间
  String? timeContext;    // 时间描述
  String status;          // 'active' | 'archived' | 'fading'
}
```

**记忆生命周期管理：**

```
新记忆产生
    ↓
状态：active
    ↓
┌─────────────────────────────────────────┐
│  定期评估（每100轮对话或每周）           │
│                                          │
│  评估维度：                               │
│  - 最后访问时间                           │
│  - 访问频率                               │
│  - 重要性权重                             │
│  - 是否与其他记忆重复                     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  处理策略：                               │
│                                          │
│  长期未访问 → 状态改为 fading            │
│  fading超过30天 → 状态改为 archived      │
│  重复记忆 → 合并为一条                   │
│  重要记忆 → 权重提升，保持 active        │
└─────────────────────────────────────────┘
```

**记忆检索（混合方式）：**

```dart
Future<List<MemoryNode>> searchMemories(String query) async {
  // 1. 向量相似度检索
  final vectorResults = await vectorSearch(query);
  
  // 2. 标签匹配检索
  final tagResults = await tagSearch(query);
  
  // 3. 综合评分
  final combined = combineResults(
    vectorResults, 
    tagResults,
    weights: [0.5, 0.5]  // 向量和标签各占50%
  );
  
  // 4. 过滤掉 archived 状态的记忆
  return combined.where((m) => m.status != 'archived').toList();
}
```

### 3.7 用户画像（简化版）

**文件：** `user_profile.dart`

**设计理念：**
- 不复制角色人格结构
- 只保留真正稳定的维度
- 作为观察结果，不是另一份人格文件

**用户画像结构：**

```dart
class UserProfile {
  // 长期偏好
  Map<String, dynamic> preferences;  // 喜好、厌恶
  
  // 生活习惯
  Map<String, dynamic> habits;  // 作息、日常
  
  // 价值观倾向
  Map<String, dynamic> values;  // 工作观、家庭观、人生观
  
  // 情绪模式
  Map<String, dynamic> emotionPatterns;  // 情绪触发点、应对方式
  
  // 人际关系
  Map<String, dynamic> relationships;  // 重要的人、关系状态
  
  // 当前人生阶段
  String lifeStage;  // 学生/职场新人/事业上升期/稳定期/转型期
  
  // 长期目标
  List<String> goals;  // 用户提到的目标和愿望
  
  // 更新历史
  List<ProfileUpdate> updateHistory;
}
```

**画像更新逻辑：**

```
每20轮对话触发画像更新
    ↓
LLM分析近期对话
    ↓
提取用户特征（仅当有充分证据时）
    ↓
增量更新画像（不覆盖，只补充/修正）
    ↓
记录更新历史
```

### 3.8 Agent 循环

**文件：** `agent_loop.dart`

**双通道设计：**

```
用户消息
    ↓
┌─────────────────────────────────────────┐
│  快速意图判断（规则，非LLM）             │
│                                          │
│  检测关键词和模式：                       │
│  - 情感倾诉：难过、伤心、烦、累、压力...  │
│  - 普通闲聊：你好、在吗、今天...          │
│  - 事实问题：什么是、怎么、为什么...      │
│  - 操作请求：帮我、能不能、请...          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────┬───────────────────────┐
│   快速通道      │     完整通道           │
│   (情感/闲聊)   │     (事实/操作)        │
├─────────────────┼───────────────────────┤
│ 1. 组装上下文   │ 1. 感知（Perceive）    │
│ 2. 直接生成回复 │ 2. 规划（Plan）        │
│ 3. 异步处理记忆 │ 3. 执行（Execute）     │
│    和画像更新   │ 4. 反思（Reflect）     │
│                 │ 5. 生成回复            │
└─────────────────┴───────────────────────┘
    ↓
返回回复给用户
```

**快速通道的目的：**
- 情感倾诉时，用户正在倾诉，不能等待3-5秒的Agent规划
- 普通闲聊不需要工具调用，直接回复即可
- 记忆分析和画像更新放在回复之后异步执行

**完整通道的感知阶段：**

```dart
class PerceptionResult {
  String intent;              // 意图分类
  double sentiment;           // 情感倾向 -1.0 ~ 1.0
  bool needsTool;             // 是否需要工具
  String? toolName;           // 需要哪个工具
  Map<String, dynamic>? toolParams;  // 工具参数
  bool isCrisis;              // 是否触发危机识别
}
```

**Reflect 模块职责（校准后）：**

| 职责 | 说明 |
|------|------|
| 提取长期记忆 | 从对话中提取值得记住的信息 |
| 更新用户画像 | 有新发现时更新画像 |
| 生成会话摘要 | 压缩近期对话 |
| 记录工具执行结果 | 保存工具调用的结果 |
| 更新关系状态 | 评估关系是否需要升级 |
| 更新角色情绪 | 根据对话调整情绪状态 |

**不是：** 让模型"学习"、"成长"、"总结经验"

### 3.9 工具系统（插件化）

**文件：** `tool_registry.dart`

**设计理念：**
- 统一的Tool Registry
- 所有工具动态注册
- 不在架构里固定分类

**工具接口：**

```dart
abstract class Tool {
  String get name;
  String get description;
  Map<String, dynamic> get parameters;
  
  Future<ToolResult> execute(Map<String, dynamic> params);
  
  // 安全检查
  bool get isSafe => true;
  bool get needsConfirmation => false;
}

class ToolResult {
  bool success;
  String? data;
  String? error;
}
```

**工具注册表：**

```dart
class ToolRegistry {
  final Map<String, Tool> _tools = {};
  
  void register(Tool tool) {
    _tools[tool.name] = tool;
  }
  
  Tool? getTool(String name) => _tools[name];
  
  List<Tool> get allTools => _tools.values.toList();
  
  List<Tool> get safeTools => _tools.values.where((t) => t.isSafe).toList();
}
```

**默认工具（第一阶段）：**

| 工具 | 说明 | 安全性 |
|------|------|--------|
| web_search | 搜索引擎查询 | 安全 |
| web_fetch | 抓取网页内容 | 安全 |

**后续扩展工具：**

| 工具 | 说明 | 阶段 |
|------|------|------|
| calendar | 日历操作 | 第二阶段 |
| reminder | 提醒设置 | 第二阶段 |
| image_gen | 图片生成 | 第三阶段 |
| code_exec | 代码执行 | 第三阶段（需沙箱） |

**关于 code_exec：**
- 第一阶段不包含
- 安全风险高，对情感陪伴价值低
- 如需保留，必须实现沙箱机制，默认关闭

### 3.10 危机识别

**文件：** `crisis_detector.dart`

**职责：**
- 在感知阶段之后独立运行
- 使用规则词库，不使用LLM（速度快、成本低）
- 检测到危机信号时，切换到危机响应模式

**危机词库（示例）：**

```dart
class CrisisDetector {
  static const List<String> _crisisKeywords = [
    // 自伤相关
    '自杀', '自残', '不想活', '结束生命', '割腕', '跳楼',
    // 极端负面
    '活不下去', '没有意义', '撑不下去', '太累了想放弃',
    // 求救信号
    '救救我', '帮帮我', '我该怎么办',
  ];
  
  static bool detect(String message) {
    return _crisisKeywords.any((keyword) => 
      message.contains(keyword)
    );
  }
}
```

**危机响应模式：**

```
检测到危机信号
    ↓
┌─────────────────────────────────────────┐
│  立即切换到危机响应模式                   │
│  - 不走正常Agent流程                     │
│  - 不调用工具                            │
│  - 不进行记忆分析                        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  危机响应提示词：                         │
│                                          │
│  "我听到你说的话了，我很担心你。          │
│   你现在安全吗？                          │
│   如果你需要帮助，可以拨打：              │
│   - 全国心理援助热线：400-161-9995       │
│   - 北京心理危机研究与干预中心：010-82951332│
│   - 生命热线：400-821-1215               │
│   我会一直在这里陪着你。"                │
└─────────────────────────────────────────┘
    ↓
持续陪伴，不主动结束对话
```

### 3.11 向量化工具

**文件：** `vector_store.dart`

**职责：**
- 调用Embedding API将文本向量化
- 在SQLite中存储和检索向量
- 实现混合检索（向量 + 标签）

**Embedding API选择：**

| API | 维度 | 价格 | 推荐 |
|-----|------|------|------|
| OpenAI text-embedding-3-small | 1536 | $0.02/1M tokens | ✓ 推荐 |
| OpenAI text-embedding-3-large | 3072 | $0.13/1M tokens | 备选 |

**向量存储表：**

```sql
CREATE TABLE memory_vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id TEXT NOT NULL UNIQUE,
    vector TEXT NOT NULL,  -- JSON数组
    model TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memory_nodes(id)
);
```

**检索逻辑：**

```dart
Future<List<MemoryNode>> hybridSearch(String query, {int topN = 10}) async {
  // 1. 向量化查询
  final queryVector = await embedText(query);
  
  // 2. 向量检索
  final vectorResults = await vectorSearch(queryVector, topN: topN * 2);
  
  // 3. 标签检索
  final tagResults = await tagSearch(query, topN: topN * 2);
  
  // 4. 综合评分
  final combined = <String, ScoredMemory>{};
  
  for (var r in vectorResults) {
    combined[r.id] = ScoredMemory(
      memory: r,
      vectorScore: r.similarity,
      tagScore: 0,
    );
  }
  
  for (var r in tagResults) {
    if (combined.containsKey(r.id)) {
      combined[r.id]!.tagScore = r.tagMatch;
    } else {
      combined[r.id] = ScoredMemory(
        memory: r,
        vectorScore: 0,
        tagScore: r.tagMatch,
      );
    }
  }
  
  // 5. 计算最终分数
  for (var item in combined.values) {
    item.finalScore = item.vectorScore * 0.5 + item.tagScore * 0.3 + item.memory.weight * 0.2;
  }
  
  // 6. 排序返回
  return combined.values.toList()
    ..sort((a, b) => b.finalScore.compareTo(a.finalScore))
    ..take(topN)
    ..map((s) => s.memory)
    ..toList();
}
```

---

## 四、数据库设计

### 4.1 核心表结构

```sql
-- ===========================================
-- 角色相关
-- ===========================================

-- 角色表
CREATE TABLE characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data JSON NOT NULL,  -- Part A/B/C 完整数据
    is_active BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 会话相关
-- ===========================================

-- 对话会话表
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- 对话消息表
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    role TEXT NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 会话摘要表
CREATE TABLE session_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    summary TEXT NOT NULL,
    message_range TEXT,  -- 涵盖的消息范围
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- ===========================================
-- 记忆相关
-- ===========================================

-- 记忆节点表
CREATE TABLE memory_nodes (
    id TEXT PRIMARY KEY,  -- UUID
    session_id INTEGER,
    content TEXT NOT NULL,
    tags JSON,
    weight REAL DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',  -- 'active' | 'fading' | 'archived'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    event_time TIMESTAMP,
    time_context TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 记忆向量表
CREATE TABLE memory_vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id TEXT NOT NULL UNIQUE,
    vector TEXT NOT NULL,
    model TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memory_nodes(id)
);

-- 记忆关联表
CREATE TABLE memory_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,  -- 'related' | 'causal' | 'temporal'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES memory_nodes(id),
    FOREIGN KEY (target_id) REFERENCES memory_nodes(id),
    UNIQUE(source_id, target_id)
);

-- 标签表
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id TEXT,
    tag_name TEXT NOT NULL,
    FOREIGN KEY (memory_id) REFERENCES memory_nodes(id)
);

-- ===========================================
-- 画像相关
-- ===========================================

-- 用户画像表
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    data JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- 画像更新历史
CREATE TABLE profile_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES user_profiles(id)
);

-- ===========================================
-- 关系相关
-- ===========================================

-- 关系状态表
CREATE TABLE relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    level INTEGER DEFAULT 0,  -- 0-4
    intimacy REAL DEFAULT 0.0,
    trust REAL DEFAULT 0.0,
    call_name TEXT,
    total_interactions INTEGER DEFAULT 0,
    last_interaction TIMESTAMP,
    level_up_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- ===========================================
-- 情绪相关
-- ===========================================

-- 角色情绪状态表
CREATE TABLE character_moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    mood TEXT NOT NULL,
    intensity REAL DEFAULT 0.5,
    trigger TEXT,
    affected_turns INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- ===========================================
-- 配置相关
-- ===========================================

-- API配置表
CREATE TABLE api_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    embedding_model TEXT,
    is_active BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工具配置表
CREATE TABLE tool_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT 1,
    config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token使用记录
CREATE TABLE token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    embedding_tokens INTEGER,
    cost_estimate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 数据备份记录
CREATE TABLE backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 五、功能模块

### 5.1 APP页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP 主界面                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      对话页面                            │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │                 消息列表                         │    │   │
│  │  │  [用户消息]                                      │    │   │
│  │  │  [AI回复]                                        │    │   │
│  │  │  [用户消息]                                      │    │   │
│  │  │  [AI回复]                                        │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  [输入框]                           [发送]       │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      底部导航栏                          │   │
│  │        对话          记忆          设置                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**第一阶段页面：**
- 对话页面
- 记忆浏览页面（列表 + 时间线）
- 设置页面（API配置、角色管理、数据备份）

**第二阶段新增：**
- 画像页面
- 关系状态展示

**第三阶段新增：**
- 任务管理
- 记忆图谱

### 5.2 核心功能

**第一阶段（聊天核心）：**

| 功能 | 说明 |
|------|------|
| 角色创建 | 引导式创建，导入/导出 |
| 对话聊天 | 核心功能，快速通道 + 完整通道 |
| 长期记忆 | 记忆提取、存储、检索 |
| 上下文管理 | Context Builder |
| 工具调用 | web_search, web_fetch |
| 危机识别 | 规则词库检测 |
| 数据备份 | 导出/导入全部数据 |
| Token监控 | 用量统计和费用估算 |

**第二阶段（关系成长）：**

| 功能 | 说明 |
|------|------|
| 关系系统 | 关系等级、亲密度、信任度 |
| 角色情绪 | 即时情绪状态 |
| 用户画像 | 简化版画像系统 |
| 记忆生命周期 | 合并、归档、衰减 |
| AI输出管理 | 日记、总结等 |

**第三阶段（高级功能）：**

| 功能 | 说明 |
|------|------|
| 任务系统 | 定时任务、事件触发 |
| 记忆图谱 | 可视化 |
| 插件生态 | 更多工具 |

---

## 六、API成本管理

### 6.1 Token用量监控

```dart
class TokenTracker {
  int promptTokens = 0;
  int completionTokens = 0;
  int embeddingTokens = 0;
  
  double get estimatedCost {
    // GPT-4o-mini 价格
    double promptCost = promptTokens * 0.00015 / 1000;
    double completionCost = completionTokens * 0.0006 / 1000;
    // Embedding 价格
    double embeddingCost = embeddingTokens * 0.00002 / 1000;
    
    return promptCost + completionCost + embeddingCost;
  }
}
```

### 6.2 成本优化策略

| 策略 | 说明 |
|------|------|
| 使用便宜模型 | 日常对话用gpt-4o-mini，复杂任务用gpt-4o |
| 减少后台调用 | 降低记忆分析和画像更新频率 |
| 缓存Embedding | 相同文本不重复向量化 |
| 限制上下文长度 | Context Builder控制Token预算 |

---

## 七、分阶段开发规划

### 第一阶段：聊天核心（4-6周）

**目标：** 聊天体验做到极致

```
┌─────────────────────────────────────────────────────────────────┐
│  第一阶段核心模块                                                 │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ CORE    │  │ Agent   │  │ Session │  │ Context │           │
│  │ 系统    │  │ 循环    │  │ Manager │  │ Builder │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ 人格    │  │ 记忆    │  │ 工具    │  │ 危机    │           │
│  │ 系统    │  │ 系统    │  │ 系统    │  │ 识别    │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ 向量    │  │ 数据    │  │ Token   │                         │
│  │ 检索    │  │ 备份    │  │ 监控    │                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

**交付物：**
- 可以正常聊天的APP
- 角色创建和管理
- 长期记忆（提取 + 检索）
- 快速通道（情感响应）
- 工具调用（联网搜索）
- 危机识别
- 数据备份
- Token用量监控

### 第二阶段：关系成长（3-4周）

**目标：** 让角色真正具备长期陪伴能力

```
┌─────────────────────────────────────────────────────────────────┐
│  第二阶段新增模块                                                 │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ 关系    │  │ 角色    │  │ 用户    │  │ 记忆    │           │
│  │ 引擎    │  │ 情绪    │  │ 画像    │  │ 生命周期│           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
│  ┌─────────┐                                                   │
│  │ AI输出  │                                                   │
│  │ 管理    │                                                   │
│  └─────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**交付物：**
- 关系等级系统
- 角色即时情绪
- 用户画像（简化版）
- 记忆生命周期管理
- AI输出管理（日记等）

### 第三阶段：高级功能（4-6周）

**目标：** 扩展功能，提升体验

```
┌─────────────────────────────────────────────────────────────────┐
│  第三阶段新增模块                                                 │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ 任务    │  │ 记忆    │  │ 插件    │  │ 更多    │           │
│  │ 系统    │  │ 图谱    │  │ 生态    │  │ 工具    │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**交付物：**
- 任务系统（定时、事件触发）
- 记忆图谱（2D/3D可视化）
- 插件化工具生态
- 更多工具（日历、提醒、图片生成等）

---

## 八、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| API成本过高 | 用户负担重 | 使用便宜模型、缓存、限制频率 |
| 记忆检索质量差 | 回答不相关 | 混合检索、权重调整、持续优化 |
| Agent循环延迟 | 用户等待久 | 快速通道、异步处理 |
| 角色人格不一致 | 体验割裂 | CORE系统、人格一致性检查 |
| 数据丢失 | 用户流失 | 第一阶段就实现备份 |
| 危机响应不当 | 安全风险 | 规则词库、专门响应模式 |

---

## 九、核心设计理念

> **一个优秀的AI陪伴产品，核心竞争力始终来自聊天质量、长期记忆、关系演化和人格一致性，而不是页面数量或功能数量。**

**优先做深，不是做广。**

**核心体验：**
- 聊天是否自然？
- 是否越来越懂用户？
- 是否能保持长期一致的人格？
- 关系是否在演化？

**不是核心体验：**
- 有多少页面？
- 有多少功能？
- 有多少可视化？

---

## 十、待讨论问题

1. **Embedding API选择**：OpenAI还是其他？
2. **记忆分析频率**：每10轮还是更频繁？
3. **关系升级阈值**：多少次对话升级？
4. **Token预算分配**：各部分的具体比例？
5. **危机词库来源**：如何构建？
6. **数据备份格式**：JSON还是SQLite文件？
