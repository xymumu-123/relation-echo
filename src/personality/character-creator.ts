import { llmClient } from '../api/llm-client';
import { CharacterPersona } from './character';

const PARSE_PROMPT = `你是一个角色创建助手。用户会给你一段文字描述一个角色，请从中提取信息并以JSON格式返回完整的三层人格结构。

关键要求：每个字段必须写成自然语言的行为描述，而不是短标签。这些描述会直接作为AI的行为指令使用。

返回格式：
{
  "partA": {
    "identity": { "name": "名字（必填）", "age": "年龄", "occupation": "职业", "city": "城市", "education": "教育背景" },
    "values": { "work": "工作观，用一句自然的话描述", "money": "金钱观", "relationship": "关系观", "growth": "成长观", "core_conflict": "核心矛盾" },
    "habits": { "schedule": "作息习惯", "diet": "饮食习惯", "space_preference": "空间偏好", "consumption": "消费习惯", "daily_ritual": "日常仪式" },
    "important_memories": ["对这个角色有重要影响的记忆，用一两句话描述"],
    "relationships": ["身边的重要人物和关系"],
    "growth_trajectory": { "recent_changes": "近年变化", "direction": "努力方向", "struggles": "反复挣扎的课题", "self_acceptance": "自我接纳" }
  },
  "partB": {
    "hard_rules": ["角色绝对不会做的事"],
    "identity": { "name": "名字（必填）", "age": "年龄", "occupation": "职业", "mbti": "MBTI类型", "zodiac": "星座" },
    "speaking_style": {
      "catchphrases": ["这个角色说话时经常用的词或口头禅"],
      "punctuation": "描述这个角色的标点使用习惯，比如喜欢用什么标点、不喜欢用什么",
      "emoji": "描述这个角色用表情的习惯",
      "message_format": "描述这个角色发消息的格式习惯，比如喜欢发长消息还是短消息",
      "formality": "描述这个角色说话的正式程度和语气",
      "typing_style": "描述这个角色打字的特征"
    },
    "emotion_decision": {
      "emotion_expression": "描述这个角色表达情感的方式，用行为化的语言，比如'她不会直接说开心，但会通过语气变化让你感受到'",
      "decision_mode": "描述这个角色做决定的方式",
      "emotion_triggers": ["什么情况会让这个角色情绪波动"],
      "self_dialogue": "这个角色心情不好时会对自己说什么"
    },
    "interpersonal": {
      "social_energy": "描述这个角色的社交状态",
      "proactivity": "描述这个角色主动联系人的习惯",
      "boundaries": "描述这个角色的边界感",
      "group_role": "描述这个角色在群体中的角色",
      "conflict_response": "描述这个角色面对冲突时的反应"
    }
  },
  "partC": {
    "mental_models": ["这个角色信奉的道理或处世哲学"],
    "decision_heuristics": ["这个角色的决策习惯，用'如果X，就Y'的格式"],
    "expression_dna": { "sentence": "句式特点", "vocabulary": "用词特点", "rhythm": "说话节奏", "humor": "幽默风格", "certainty": "表达确定性的习惯", "citation": "引用习惯" },
    "values_and_anti_patterns": { "pursue": ["追求的"], "reject": ["讨厌的"], "internal_tension": ["内心的矛盾"] },
    "honesty_boundaries": ["这个角色绝对不会做的事，比如不会假装自己是真人"],
    "relationship_to_user": "与用户的关系（必填）",
    "call_user_as": "称呼用户的方式"
  }
}

规则：
1. identity.name 和 relationship_to_user 是必填字段
2. 每个字段都必须写成完整的行为描述句子，不要写短标签。比如：
   - 好的写法："她不太会拒绝别人，总是先考虑别人的感受"
   - 坏的写法："不善拒绝"
3. 根据用户描述推断所有能推断的字段，尤其是 MBTI、zodiac、说话风格、情感表达方式
4. 没有提到的字段留空字符串或空数组
5. 只返回JSON，不要返回任何其他文字、解释或markdown标记`;

const QA_PROMPT = `你是一个角色创建助手。以下是你和用户关于一个角色的问答记录，请根据用户的回答综合生成一个完整的角色设定。

用户只回答了宏观层面的问题（名字、性格、说话风格、关系等），你需要根据这些信息推断并填充所有细节字段（MBTI、zodiac、口头禅、情感表达、决策模式、表达DNA等）。

返回格式同PARSE_PROMPT中的JSON结构。

关键要求：每个字段都必须写成完整的行为描述句子，不要写短标签。比如：
- 好的写法："她不太会拒绝别人，总是先考虑别人的感受"
- 坏的写法："不善拒绝"

规则：
1. identity.name 和 relationship_to_user 是必填字段
2. 根据用户的宏观描述，合理推断所有细节字段
3. 推断要符合角色的整体气质，不要矛盾
4. 只返回JSON，不要返回任何其他文字`;

function extractJson(text: string): any | null {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try { return JSON.parse(cleaned); } catch {}
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
        try { return JSON.parse(cleaned.substring(start, end + 1)); } catch {}
    }
    return null;
}

function validatePersona(data: any): CharacterPersona | null {
    if (!data || typeof data !== 'object') return null;
    if (!data.partA?.identity?.name) return null;
    if (!data.partB) return null;
    if (!data.partC?.relationship_to_user) return null;
    return fillDefaults(data);
}

function fillDefaults(data: any): CharacterPersona {
    const empty = (v: any, d: any = '') => v ?? d;
    const arr = (v: any) => Array.isArray(v) ? v : [];
    return {
        partA: {
            identity: { name: data.partA.identity.name, age: empty(data.partA.identity?.age), occupation: empty(data.partA.identity?.occupation), city: empty(data.partA.identity?.city), education: empty(data.partA.identity?.education) },
            values: { work: empty(data.partA.values?.work), money: empty(data.partA.values?.money), relationship: empty(data.partA.values?.relationship), growth: empty(data.partA.values?.growth), core_conflict: empty(data.partA.values?.core_conflict) },
            habits: { schedule: empty(data.partA.habits?.schedule), diet: empty(data.partA.habits?.diet), space_preference: empty(data.partA.habits?.space_preference), consumption: empty(data.partA.habits?.consumption), daily_ritual: empty(data.partA.habits?.daily_ritual) },
            important_memories: arr(data.partA.important_memories),
            relationships: arr(data.partA.relationships),
            growth_trajectory: { recent_changes: empty(data.partA.growth_trajectory?.recent_changes), direction: empty(data.partA.growth_trajectory?.direction), struggles: empty(data.partA.growth_trajectory?.struggles), self_acceptance: empty(data.partA.growth_trajectory?.self_acceptance) },
        },
        partB: {
            hard_rules: arr(data.partB.hard_rules).length ? arr(data.partB.hard_rules) : ['不会说现实中不可能的话'],
            identity: { name: data.partA.identity.name, age: empty(data.partB.identity?.age), occupation: empty(data.partB.identity?.occupation), mbti: empty(data.partB.identity?.mbti), zodiac: empty(data.partB.identity?.zodiac) },
            speaking_style: { catchphrases: arr(data.partB.speaking_style?.catchphrases), punctuation: empty(data.partB.speaking_style?.punctuation), emoji: empty(data.partB.speaking_style?.emoji), message_format: empty(data.partB.speaking_style?.message_format), formality: empty(data.partB.speaking_style?.formality), typing_style: empty(data.partB.speaking_style?.typing_style) },
            emotion_decision: { emotion_expression: empty(data.partB.emotion_decision?.emotion_expression), decision_mode: empty(data.partB.emotion_decision?.decision_mode), emotion_triggers: arr(data.partB.emotion_decision?.emotion_triggers), self_dialogue: empty(data.partB.emotion_decision?.self_dialogue) },
            interpersonal: { social_energy: empty(data.partB.interpersonal?.social_energy), proactivity: empty(data.partB.interpersonal?.proactivity), boundaries: empty(data.partB.interpersonal?.boundaries), group_role: empty(data.partB.interpersonal?.group_role), conflict_response: empty(data.partB.interpersonal?.conflict_response) },
        },
        partC: {
            mental_models: arr(data.partC.mental_models),
            decision_heuristics: arr(data.partC.decision_heuristics),
            expression_dna: { sentence: empty(data.partC.expression_dna?.sentence), vocabulary: empty(data.partC.expression_dna?.vocabulary), rhythm: empty(data.partC.expression_dna?.rhythm), humor: empty(data.partC.expression_dna?.humor), certainty: empty(data.partC.expression_dna?.certainty), citation: empty(data.partC.expression_dna?.citation) },
            values_and_anti_patterns: { pursue: arr(data.partC.values_and_anti_patterns?.pursue), reject: arr(data.partC.values_and_anti_patterns?.reject), internal_tension: arr(data.partC.values_and_anti_patterns?.internal_tension) },
            honesty_boundaries: arr(data.partC.honesty_boundaries),
            relationship_to_user: data.partC.relationship_to_user || '',
            call_user_as: data.partC.call_user_as || '你',
        },
    };
}

/** 从自由文本中解析角色 persona */
export async function parseCharacterFromText(userText: string): Promise<CharacterPersona | null> {
    if (!llmClient.isConfigured()) await llmClient.loadConfig();
    const completion = await llmClient.chat([
        { role: 'system', content: PARSE_PROMPT },
        { role: 'user', content: userText },
    ], { temperature: 0.3, max_tokens: 2048 });
    const parsed = extractJson(completion.choices[0].message.content);
    return validatePersona(parsed);
}

/** 从问答对中生成角色 persona */
export async function generateCharacterFromQA(qaPairs: { question: string; answer: string }[]): Promise<CharacterPersona | null> {
    if (!llmClient.isConfigured()) await llmClient.loadConfig();
    const qaText = qaPairs.map((q, i) => `问${i + 1}：${q.question}\n答${i + 1}：${q.answer}`).join('\n\n');
    const completion = await llmClient.chat([
        { role: 'system', content: QA_PROMPT },
        { role: 'user', content: qaText },
    ], { temperature: 0.4, max_tokens: 2048 });
    const parsed = extractJson(completion.choices[0].message.content);
    return validatePersona(parsed);
}

/** LLM 生成引导式提问（返回下一个问题） */
export async function generateOnboardingQuestion(askedSoFar: string[], answersSoFar: string[]): Promise<string> {
    if (!llmClient.isConfigured()) await llmClient.loadConfig();
    const history = askedSoFar.map((q, i) => `问：${q}\n答：${answersSoFar[i] || '（未回答）'}`).join('\n\n');
    const prompt = `你正在引导用户创建一个AI陪伴角色。已经问过的问题和回答：
${history}

请根据已有信息，问下一个最关键的问题。要求：
1. 每次只问一个问题
2. 问题要简洁自然，像朋友聊天一样
3. 问宏观层面的：名字、性格、说话风格、和用户的关系、兴趣爱好、人生经历等
4. 不要问具体的技术字段（如MBTI、表达DNA等），这些由你根据回答推断
5. 如果已有足够信息（4-6个问答后），回复"够了，我来生成角色吧"
6. 不要重复已经问过的内容`;

    const completion = await llmClient.chat([
        { role: 'system', content: prompt },
        { role: 'user', content: '请继续' },
    ], { temperature: 0.7, max_tokens: 200 });
    return completion.choices[0].message.content.trim();
}
